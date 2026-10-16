import { order, payment } from '@row/db';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { isSupportedMethod } from '#lib/payment-methods.ts';
import { applyCharge, createOrder, grantSubscription } from './billing.ts';
import { BillingError, Ignored } from './billing-error.ts';
import { db } from './db.ts';
import { insertOwnedGuild, type NewGuildInput } from './guilds.ts';
import { createCharge, fetchCharge, getCapability } from './omise.ts';

/**
 * Checkout ของ landing (หน้าเดียวกับระบบ ใช้ session ของผู้ใช้):
 *   1. createOrder (pending, idempotencyKey ต่อการเปิดหน้า)  2. สร้าง Omise charge ด้วย secret key (metadata.order_id)
 *   3. บันทึก payment ทันทีด้วย applyCharge  4. webhook / หน้าสถานะ (polling) ดึง charge ล่าสุดมาอัปเดตจนจ่ายสำเร็จ
 * ซื้อเพื่อสร้างกิลด์ใหม่ = order.organization_id null → จ่ายแล้วผู้ซื้อสร้างกิลด์ (claimOrder) แล้วจึงได้สิทธิ์
 */

/** ช่องทางที่บัญชี Omise เปิด + ระบบรองรับ */
export async function availableMethods(): Promise<string[]> {
	const cap = await getCapability();
	if (!cap) return ['card', 'promptpay']; // อ่าน capability ไม่ได้ → ช่องทางพื้นฐาน
	return cap.payment_methods.filter((m) => isSupportedMethod(m.name, m.currencies)).map((m) => m.name);
}

export interface StartPaymentInput {
	userId: string;
	packageCode: string;
	organizationId: string | null;
	email: string;
	method: string;
	cardToken?: string;
	idempotencyKey: string;
	/** origin ของเว็บ (สร้าง return_uri) */
	origin: string;
}

export type StartPaymentResult =
	| { kind: 'paid'; orderId: string }
	| { kind: 'redirect'; orderId: string; url: string }
	| { kind: 'pending'; orderId: string };

export async function startPayment(input: StartPaymentInput): Promise<StartPaymentResult> {
	const methods = await availableMethods();
	if (!methods.includes(input.method)) throw new BillingError('invalid_method', 400);
	if (input.method === 'card' && !/^tokn_[A-Za-z0-9_]+$/.test(input.cardToken ?? '')) throw new BillingError('invalid_card_token', 400);

	const { order: o } = await createOrder({
		packageCode: input.packageCode,
		userId: input.userId,
		organizationId: input.organizationId,
		idempotencyKey: input.idempotencyKey,
		billingInfo: { email: input.email }
	});
	if (o.status === 'paid') return { kind: 'paid', orderId: o.id };
	if (o.status === 'refunded' || o.status === 'cancelled') throw new BillingError('order_closed', 409);
	// อีเมลรับใบเสร็จ: ผู้ใช้แก้แล้วกดจ่ายใหม่กับออเดอร์เดิม → ใช้อีเมลล่าสุด
	if (o.billingInfo?.email !== input.email)
		await db.update(order).set({ billingInfo: { ...o.billingInfo, email: input.email }, updatedAt: new Date() }).where(eq(order.id, o.id));

	const ch = await createCharge({
		amount: o.amountSatang,
		currency: o.currency,
		description: `${o.orderNo} ${o.packageSnapshot.name}`,
		metadata: { order_id: o.id, order_no: o.orderNo, organization_id: o.organizationId },
		returnUri: `${input.origin}/checkout/order/${o.id}`,
		...(input.method === 'card' ? { card: input.cardToken } : { sourceType: input.method })
	});
	const res = await applyCharge(ch); // บันทึก payment (QR/ลิงก์) ทันที ไม่ต้องรอ webhook
	if (res.status === 'paid') return { kind: 'paid', orderId: o.id };
	if (ch.status === 'failed') throw new BillingError('payment_declined', 402);
	if (ch.authorize_uri && !ch.source?.scannable_code) return { kind: 'redirect', orderId: o.id, url: ch.authorize_uri };
	return { kind: 'pending', orderId: o.id };
}

/**
 * ออเดอร์ของผู้ใช้สำหรับหน้าสถานะ — ถ้ายังค้างจ่าย ดึง charge ล่าสุดจาก Omise มาอัปเดตก่อน
 * (กันกรณี webhook มาช้า/ยังไม่ได้ตั้ง เช่นตอน dev ที่ไม่มี ngrok)
 */
export async function loadOrderForUser(orderId: string, userId: string) {
	let [o] = await db.select().from(order).where(and(eq(order.id, orderId), eq(order.userId, userId)));
	if (!o) return null;
	const [last] = await db.select().from(payment).where(eq(payment.orderId, o.id)).orderBy(desc(payment.createdAt)).limit(1);
	if (o.status === 'pending' && last?.status === 'pending') {
		try {
			await applyCharge(await fetchCharge(last.omiseChargeId));
		} catch (e) {
			if (!(e instanceof Ignored)) console.error('[checkout] refresh charge failed:', (e as Error).message);
		}
		[o] = await db.select().from(order).where(eq(order.id, orderId));
	}
	const [pay] = await db.select().from(payment).where(eq(payment.orderId, orderId)).orderBy(desc(payment.createdAt)).limit(1);
	return { order: o!, payment: pay ?? null };
}

/**
 * ผู้ซื้อสร้างกิลด์จากออเดอร์ที่จ่ายแล้วแต่ยังไม่มีกิลด์ → ผูกออเดอร์ + ให้สิทธิ์ (ทำได้ครั้งเดียว; ล็อกแถวออเดอร์กันกดซ้ำ)
 */
export async function claimOrder(userId: string, orderId: string, input: NewGuildInput) {
	return db.transaction(async (tx) => {
		await tx.execute(sql`select 1 from ${order} where ${order.id} = ${orderId} for update`);
		const [o] = await tx.select().from(order).where(eq(order.id, orderId));
		if (!o || o.userId !== userId) throw new BillingError('order_not_found', 404);
		if (o.status !== 'paid') throw new BillingError('order_not_paid', 409);
		if (o.organizationId || o.grantedAt) throw new BillingError('order_already_claimed', 409);
		const orgId = await insertOwnedGuild(tx, userId, input);
		// ลิงก์ในอีเมลใช้ได้ครั้งเดียว → ล้าง token เมื่อสร้างกิลด์แล้ว
		await tx.update(order).set({ organizationId: orgId, claimTokenHash: null, claimTokenExpiresAt: null, updatedAt: new Date() }).where(eq(order.id, o.id));
		await grantSubscription(tx, { ...o, organizationId: orgId });
		return orgId;
	});
}

/** ออเดอร์ที่จ่ายแล้วแต่ยังไม่ได้สร้างกิลด์ของผู้ใช้ (แสดงแบนเนอร์ในหน้าภาพรวม) */
export async function unclaimedOrders(userId: string) {
	return db
		.select({ id: order.id, orderNo: order.orderNo, name: sql<string>`${order.packageSnapshot}->>'name'` })
		.from(order)
		.where(and(eq(order.userId, userId), eq(order.status, 'paid'), isNull(order.organizationId), isNull(order.grantedAt)))
		.orderBy(desc(order.paidAt));
}
