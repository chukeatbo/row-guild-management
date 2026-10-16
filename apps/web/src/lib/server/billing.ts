import { timingSafeEqual } from 'node:crypto';
import { guildSubscription, member, order, organization, payment, pkg, refund } from '@row/db';
import { and, asc, desc, eq, gt, inArray, isNotNull, sql } from 'drizzle-orm';
import { BillingError, Ignored } from './billing-error.ts';
import { db } from './db.ts';
import { isUniqueViolation } from './guard.ts';
import type { OmiseCharge } from './omise.ts';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Order = typeof order.$inferSelect;

/** ออเดอร์ค้างจ่ายได้นานเท่านี้ (ราคาไม่ค้างยาวเกินไป) */
export const ORDER_TTL_MS = 30 * 60_000;

/** ตรวจ Authorization: Bearer LANDING_API_KEY (landing page เรียกจากฝั่งเซิร์ฟเวอร์ของตัวเอง) */
export function isLandingCall(request: Request) {
	const key = process.env.LANDING_API_KEY ?? '';
	if (key.length < 16) return false; // ไม่ตั้ง/สั้นเกินไป = ปิด endpoint
	const got = Buffer.from(request.headers.get('authorization') ?? '');
	const want = Buffer.from(`Bearer ${key}`);
	return got.length === want.length && timingSafeEqual(got, want);
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ตัด 0/O/1/I ที่อ่านสับสน
export function newOrderNo(now = new Date()) {
	const d = now.toISOString().slice(2, 10).replaceAll('-', ''); // yymmdd
	const rnd = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => ALPHABET[b % ALPHABET.length]).join('');
	return `ROW-${d}-${rnd}`;
}

/** ให้สิทธิ์กิลด์จากออเดอร์ที่จ่ายแล้ว — unique(order_id) ทำให้เรียกซ้ำปลอดภัย; ต่ออายุต่อท้ายสิทธิ์ที่ยังเหลือ */
async function grantSubscription(tx: Tx, o: Order, now = new Date()) {
	if (!o.organizationId) return null; // ยังไม่ผูกกิลด์ → ให้สิทธิ์ตอนผูก (ยังไม่ได้ทำ — ดู docs/billing.md)
	const [last] = await tx
		.select({ endsAt: guildSubscription.endsAt })
		.from(guildSubscription)
		.where(
			and(
				eq(guildSubscription.organizationId, o.organizationId),
				eq(guildSubscription.status, 'active'),
				isNotNull(guildSubscription.endsAt),
				gt(guildSubscription.endsAt, now)
			)
		)
		.orderBy(desc(guildSubscription.endsAt))
		.limit(1);
	const startsAt = last?.endsAt ?? now;
	const days = o.packageSnapshot.durationDays;
	const endsAt = days ? new Date(startsAt.getTime() + days * 86_400_000) : null;
	const [row] = await tx
		.insert(guildSubscription)
		.values({
			organizationId: o.organizationId,
			packageId: o.packageId,
			orderId: o.id,
			limits: o.packageSnapshot.limits,
			startsAt,
			endsAt
		})
		.onConflictDoNothing({ target: guildSubscription.orderId })
		.returning({ id: guildSubscription.id });
	return row ?? null;
}

export interface CreateOrderInput {
	packageCode: string;
	userId: string;
	organizationId?: string | null;
	idempotencyKey: string;
	billingInfo?: Order['billingInfo'];
}

/** สร้างออเดอร์ (pending) — เรียกซ้ำด้วย idempotencyKey เดิม = คืนออเดอร์เดิม */
export async function createOrder(input: CreateOrderInput) {
	const [p] = await db.select().from(pkg).where(eq(pkg.code, input.packageCode));
	if (!p || !p.isActive) throw new BillingError('package_not_found', 404);

	if (input.organizationId) {
		const [org] = await db.select({ id: organization.id }).from(organization).where(eq(organization.id, input.organizationId));
		if (!org) throw new BillingError('organization_not_found', 404);
		// ซื้อให้กิลด์ได้เฉพาะ owner ของกิลด์นั้น
		const [m] = await db
			.select({ role: member.role })
			.from(member)
			.where(and(eq(member.organizationId, input.organizationId), eq(member.userId, input.userId)));
		if (m?.role !== 'owner') throw new BillingError('not_guild_owner', 403);
	}

	const [existing] = await db
		.select()
		.from(order)
		.where(and(eq(order.userId, input.userId), eq(order.idempotencyKey, input.idempotencyKey)));
	if (existing) {
		if (existing.packageId !== p.id || (existing.organizationId ?? null) !== (input.organizationId ?? null))
			throw new BillingError('idempotency_conflict', 409);
		return { order: existing, package: p, reused: true };
	}

	const free = p.priceSatang === 0;
	const now = new Date();
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const created = await db.transaction(async (tx) => {
				const [o] = await tx
					.insert(order)
					.values({
						orderNo: newOrderNo(now),
						userId: input.userId,
						organizationId: input.organizationId ?? null,
						packageId: p.id,
						packageSnapshot: {
							code: p.code,
							name: p.name,
							priceSatang: p.priceSatang,
							currency: p.currency,
							durationDays: p.durationDays,
							limits: p.limits
						},
						amountSatang: p.priceSatang,
						currency: p.currency,
						status: free ? 'paid' : 'pending',
						idempotencyKey: input.idempotencyKey,
						billingInfo: input.billingInfo ?? null,
						expiresAt: free ? null : new Date(now.getTime() + ORDER_TTL_MS),
						paidAt: free ? now : null
					})
					.returning();
				if (free) await grantSubscription(tx, o!, now); // แพ็กเกจฟรี: ไม่ผ่าน Omise ให้สิทธิ์ทันที
				return o!;
			});
			return { order: created, package: p, reused: false };
		} catch (e) {
			if (!isUniqueViolation(e)) throw e;
			// ชน idempotency (สองคำขอพร้อมกัน) → ใช้ตัวที่ชนะ; ชน order_no → สุ่มใหม่แล้วลองอีกครั้ง
			const [again] = await db
				.select()
				.from(order)
				.where(and(eq(order.userId, input.userId), eq(order.idempotencyKey, input.idempotencyKey)));
			if (again) return { order: again, package: p, reused: true };
		}
	}
	throw new Error('could not allocate order number');
}

const PAYMENT_STATUSES = ['pending', 'successful', 'failed', 'expired', 'reversed'] as const;
type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

function mapStatus(ch: OmiseCharge): PaymentStatus {
	if (ch.status === 'successful') return ch.paid === false ? 'pending' : 'successful'; // ต้อง paid ด้วยจึงนับว่าจ่ายแล้ว
	return (PAYMENT_STATUSES as readonly string[]).includes(ch.status) ? (ch.status as PaymentStatus) : 'pending';
}

/** เก็บ charge ดิบโดยตัดข้อมูลบัตรที่ไม่จำเป็น (ชื่อ/fingerprint) */
function sanitize(ch: OmiseCharge) {
	const copy: Record<string, unknown> = { ...ch };
	if (ch.card) copy.card = { brand: ch.card.brand, last_digits: ch.card.last_digits };
	return copy;
}

export interface ApplyResult {
	status: PaymentStatus | 'paid' | 'ignored';
	/** ผิดปกติที่ต้องให้คนตรวจ (เก็บลง omise_webhook_event.error) */
	warning?: string;
}

/**
 * นำสถานะ charge (ที่ดึงจาก Omise API แล้ว) มาอัปเดต payment/order/สิทธิ์ — idempotent, เรียกซ้ำกี่ครั้งก็ได้
 * ผูกกับออเดอร์ด้วย metadata.order_id ที่ landing ใส่ตอนสร้าง charge
 */
export async function applyCharge(ch: OmiseCharge): Promise<ApplyResult> {
	const orderId = typeof ch.metadata?.order_id === 'string' ? ch.metadata.order_id : null;
	if (!orderId) throw new Ignored('charge has no metadata.order_id');
	const [found] = await db.select({ id: order.id }).from(order).where(eq(order.id, orderId));
	if (!found) throw new Ignored(`order ${orderId} not found`);

	const status = mapStatus(ch);
	return db.transaction(async (tx): Promise<ApplyResult> => {
		// ล็อกแถวออเดอร์ กัน webhook หลายตัวชนกัน
		await tx.execute(sql`select 1 from ${order} where ${order.id} = ${orderId} for update`);
		const [o] = await tx.select().from(order).where(eq(order.id, orderId));
		if (!o) throw new Ignored(`order ${orderId} not found`);

		const amountOk = ch.amount === o.amountSatang && ch.currency.toUpperCase() === o.currency.toUpperCase();
		const values = {
			orderId: o.id,
			omiseChargeId: ch.id,
			method: ch.source?.type ?? (ch.card ? 'card' : 'unknown'),
			status,
			amountSatang: ch.amount,
			currency: ch.currency.toUpperCase(),
			authorizeUri: ch.authorize_uri ?? null,
			qrImageUri: ch.source?.scannable_code?.image?.download_uri ?? null,
			card: ch.card ? { brand: ch.card.brand, last4: ch.card.last_digits } : null,
			failureCode: ch.failure_code ?? null,
			failureMessage: ch.failure_message ?? null,
			expiresAt: ch.expires_at ? new Date(ch.expires_at) : null,
			paidAt: ch.paid_at ? new Date(ch.paid_at) : null,
			rawCharge: sanitize(ch),
			updatedAt: new Date()
		};
		await tx.insert(payment).values(values).onConflictDoUpdate({ target: payment.omiseChargeId, set: values });

		if (!amountOk) {
			// บันทึก payment ไว้ตามจริง แต่ไม่ให้สิทธิ์เด็ดขาด (กันจ่ายยอดน้อยกว่าราคา)
			return {
				status: 'ignored',
				warning: `amount/currency mismatch: charge ${ch.amount} ${ch.currency} vs order ${o.amountSatang} ${o.currency}`
			};
		}

		if (status === 'successful') {
			if (o.status === 'refunded') return { status: 'paid', warning: 'successful charge on a refunded order' };
			if (o.status === 'paid') {
				// จ่ายซ้ำสำหรับออเดอร์ที่จ่ายไปแล้ว (เงินเข้า 2 ครั้ง) → ต้องให้คนตรวจ/คืนเงิน
				const [c] = await tx
					.select({ n: sql<number>`count(*)::int` })
					.from(payment)
					.where(and(eq(payment.orderId, o.id), eq(payment.status, 'successful')));
				return {
					status: 'paid',
					warning: (c?.n ?? 0) > 1 ? 'duplicate successful payment for an already paid order — refund needed' : undefined
				};
			}
			// pending / failed / expired / cancelled: เงินเข้าจริงแล้วจึงให้สิทธิ์ แม้ออเดอร์หมดเวลาไปก่อน
			await tx
				.update(order)
				.set({ status: 'paid', paidAt: values.paidAt ?? new Date(), updatedAt: new Date() })
				.where(eq(order.id, o.id));
			const sub = await grantSubscription(tx, { ...o, status: 'paid' });
			return {
				status: 'paid',
				warning: !o.organizationId
					? 'order paid but has no guild yet — subscription pending'
					: !sub
						? 'subscription already existed for this order'
						: undefined
			};
		}

		if (status !== 'pending' && o.status === 'pending') {
			// ยังมีความพยายามจ่ายอื่นที่ค้าง/สำเร็จอยู่ไหม — ถ้าไม่มี ออเดอร์จึงล้มเหลว/หมดเวลา
			// (นับเฉพาะ payment ที่ยอดตรงกับออเดอร์ — charge ยอดผิดไม่ถือเป็นการจ่ายที่ใช้ได้)
			const others = await tx
				.select({ id: payment.id })
				.from(payment)
				.where(
					and(
						eq(payment.orderId, o.id),
						eq(payment.amountSatang, o.amountSatang),
						eq(payment.currency, o.currency.toUpperCase()),
						inArray(payment.status, ['pending', 'successful'])
					)
				)
				.limit(1);
			if (!others.length)
				await tx
					.update(order)
					.set({ status: status === 'expired' ? 'expired' : 'failed', updatedAt: new Date() })
					.where(eq(order.id, o.id));
		}
		return { status };
	});
}

/** ซิงก์การคืนเงินของ charge (จาก refunds ใน charge ที่ดึงจาก Omise) — คืนเต็มจำนวน → ออเดอร์ refunded + ยกเลิกสิทธิ์ */
export async function syncRefunds(ch: OmiseCharge): Promise<void> {
	const [pay] = await db.select().from(payment).where(eq(payment.omiseChargeId, ch.id));
	if (!pay) return;
	await db.transaction(async (tx) => {
		for (const r of ch.refunds?.data ?? [])
			await tx
				.insert(refund)
				.values({ paymentId: pay.id, omiseRefundId: r.id, amountSatang: r.amount })
				.onConflictDoNothing({ target: refund.omiseRefundId });
		if ((ch.refunded_amount ?? 0) >= pay.amountSatang && pay.amountSatang > 0) {
			await tx
				.update(order)
				.set({ status: 'refunded', updatedAt: new Date() })
				.where(and(eq(order.id, pay.orderId), eq(order.status, 'paid')));
			await tx
				.update(guildSubscription)
				.set({ status: 'cancelled' })
				.where(and(eq(guildSubscription.orderId, pay.orderId), eq(guildSubscription.status, 'active')));
		}
	});
}

export async function listPublicPackages() {
	return db
		.select({
			code: pkg.code,
			name: pkg.name,
			description: pkg.description,
			translations: pkg.translations,
			priceSatang: pkg.priceSatang,
			currency: pkg.currency,
			durationDays: pkg.durationDays,
			features: pkg.features
		})
		.from(pkg)
		.where(and(eq(pkg.isActive, true), eq(pkg.isPublic, true)))
		.orderBy(asc(pkg.sortOrder), asc(pkg.priceSatang));
}
