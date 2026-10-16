import { order } from '@row/db';
import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db.ts';
import { requireUser } from '#lib/server/guard.ts';
import { hashToken } from '#lib/server/receipt.ts';
import type { PageServerLoad } from './$types';

/**
 * ปุ่มในอีเมลยืนยันการชำระเงิน: /claim?token=...
 * ต้อง login ด้วย Discord คนเดียวกับผู้ซื้อ (ยังไม่ login → หน้า login แล้วกลับมาพร้อม token) แล้วพาไปหน้าสร้างกิลด์ของออเดอร์นั้น
 * token ใช้ได้ครั้งเดียว (ล้างเมื่อสร้างกิลด์) อายุ 24 ชม.; หมดอายุแล้วยังสร้างจากแบนเนอร์หน้าภาพรวมได้
 */
export const load: PageServerLoad = async (event) => {
	const ctx = await requireUser(event);
	const token = event.url.searchParams.get('token') ?? '';
	const [o] = token.length >= 20 ? await db.select().from(order).where(eq(order.claimTokenHash, hashToken(token))) : [];
	if (!o) return { state: 'invalid' as const };
	if (o.userId !== ctx.user.id) return { state: 'wrongUser' as const };
	if (o.organizationId || o.grantedAt) redirect(303, '/dashboard');
	if (!o.claimTokenExpiresAt || o.claimTokenExpiresAt < new Date()) return { state: 'expired' as const };
	redirect(303, `/checkout/order/${o.id}`);
};
