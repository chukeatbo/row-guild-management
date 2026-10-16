import { guildProfile, member, order, organization, pkg } from '@row/db';
import { and, eq, sql } from 'drizzle-orm';
import { BillingError } from './billing-error.ts';
import { grantSubscription, newOrderNo, packageSnapshot, type Tx } from './billing.ts';
import { db } from './db.ts';
import { isUniqueViolation } from './guard.ts';

/**
 * กิลด์ที่ผู้ใช้สร้างเอง (ทดลองใช้ / หลังชำระเงิน) — ต่างจากที่ Super Admin สร้างตรงที่ billing_exempt = false
 * จึงต้องมี guild_subscription ที่ยังไม่หมดอายุถึงจะใช้งานได้ (ดู @row/db entitlement)
 */
export interface NewGuildInput {
	name: string;
	server: string | null;
}

const SLUG_CHARS = 'abcdefghijkmnpqrstuvwxyz23456789';

/** slug ของ organization (unique) — ส่วนที่เป็น ASCII ของชื่อ + ท้ายสุ่ม กันชนกับกิลด์ชื่อเดียวกัน */
function guildSlug(name: string) {
	const base = name
		.normalize('NFKD')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 24)
		.replace(/-+$/, '');
	const rnd = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => SLUG_CHARS[b % SLUG_CHARS.length]).join('');
	return `${base || 'guild'}-${rnd}`;
}

/** สร้างกิลด์ + ให้ผู้สร้างเป็น owner (ภายใน transaction ของผู้เรียก) */
export async function insertOwnedGuild(tx: Tx, userId: string, input: NewGuildInput) {
	const id = crypto.randomUUID();
	const now = new Date();
	await tx.insert(organization).values({ id, name: input.name, slug: guildSlug(input.name), createdAt: now });
	await tx.insert(member).values({ id: crypto.randomUUID(), organizationId: id, userId, role: 'owner', createdAt: now });
	await tx.insert(guildProfile).values({ organizationId: id, server: input.server, billingExempt: false });
	return id;
}

/** ล็อกต่อผู้ใช้ภายใน transaction — กันกดสร้าง/ทดลองซ้ำพร้อมกันสองแท็บ */
const lockUser = (tx: Tx, userId: string) => tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'billing:' + userId}))`);

/** เคยใช้สิทธิ์ทดลองแล้วหรือยัง (นับทุกออเดอร์ของแพ็กเกจทดลอง ไม่ว่าจะยังมีกิลด์อยู่หรือไม่) — 1 ครั้งต่อบัญชี Discord */
export async function hasUsedTrial(userId: string, q: Pick<Tx, 'select'> = db) {
	const [row] = await q
		.select({ id: order.id })
		.from(order)
		.innerJoin(pkg, eq(pkg.id, order.packageId))
		.where(and(eq(order.userId, userId), eq(pkg.isTrial, true)))
		.limit(1);
	return !!row;
}

/** แพ็กเกจทดลองที่เปิดอยู่ (null = ปิดการทดลองใช้) */
export async function trialPackage() {
	const [p] = await db
		.select()
		.from(pkg)
		.where(and(eq(pkg.isTrial, true), eq(pkg.isActive, true)))
		.orderBy(pkg.sortOrder)
		.limit(1);
	return p ?? null;
}

/**
 * เริ่มทดลองใช้: สร้างกิลด์ + ออเดอร์ทดลอง (ราคา 0, paid) + สิทธิ์ตามอายุแพ็กเกจ ใน transaction เดียว
 * ใช้ได้ครั้งเดียวต่อผู้ใช้ (ตรวจหลังล็อกผู้ใช้ จึงไม่หลุดเมื่อกดพร้อมกัน)
 */
export async function startTrial(userId: string, input: NewGuildInput) {
	const p = await trialPackage();
	if (!p) throw new BillingError('trial_unavailable', 404);
	try {
		return await db.transaction(async (tx) => {
			await lockUser(tx, userId);
			if (await hasUsedTrial(userId, tx)) throw new BillingError('trial_used', 409);
			const orgId = await insertOwnedGuild(tx, userId, input);
			const now = new Date();
			const [o] = await tx
				.insert(order)
				.values({
					orderNo: newOrderNo(now),
					userId,
					organizationId: orgId,
					packageId: p.id,
					packageSnapshot: packageSnapshot(p),
					amountSatang: 0,
					currency: p.currency,
					status: 'paid',
					paidAt: now
				})
				.returning();
			await grantSubscription(tx, o!, now);
			return { orgId, order: o! };
		});
	} catch (e) {
		if (isUniqueViolation(e)) throw new BillingError('duplicate', 409); // slug/order_no ชน (แทบเป็นไปไม่ได้) → ให้ลองใหม่
		throw e;
	}
}
