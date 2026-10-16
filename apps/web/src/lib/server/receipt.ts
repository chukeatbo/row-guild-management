import { createHash, randomBytes } from 'node:crypto';
import { order, payment } from '@row/db';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { methodLabel } from '#lib/payment-methods.ts';
import { db } from './db.ts';
import { appUrl, escapeHtml, sendMail } from './mail.ts';

/** ลิงก์สร้างกิลด์ในอีเมลใช้ได้นานเท่านี้ (ใช้ครั้งเดียว — ล้างเมื่อสร้างกิลด์แล้ว) */
export const CLAIM_TOKEN_TTL_MS = 24 * 3600_000;

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * ส่งอีเมลยืนยันการชำระเงิน (ครั้งเดียวต่อออเดอร์) — เรียกหลังออเดอร์เป็น paid จากทุกทาง (webhook / หน้าสถานะ)
 * จองสิทธิ์ส่งด้วย UPDATE ... WHERE receipt_sent_at IS NULL จึงไม่ส่งซ้ำแม้ webhook กับหน้าสถานะมาพร้อมกัน
 * ส่งไม่สำเร็จ → คืนสิทธิ์ให้ครั้งถัดไปลองใหม่
 * ซื้อเพื่อกิลด์ใหม่: ปุ่มในอีเมล = /claim?token=... (token สุ่ม เก็บแค่ hash, อายุ 24 ชม.)  ต่ออายุ: ปุ่มไปหน้าภาพรวม
 */
export async function sendReceiptOnce(orderId: string) {
	const token = randomBytes(32).toString('base64url');
	const now = new Date();
	const [o] = await db
		.update(order)
		.set({ receiptSentAt: now })
		.where(and(eq(order.id, orderId), eq(order.status, 'paid'), isNull(order.receiptSentAt)))
		.returning();
	if (!o) return; // ส่งไปแล้ว / ยังไม่จ่าย
	const email = o.billingInfo?.email;
	if (!email || o.amountSatang === 0) return; // ทดลองใช้ไม่มีอีเมล

	const needsGuild = !o.organizationId && !o.grantedAt;
	if (needsGuild)
		await db
			.update(order)
			.set({ claimTokenHash: hashToken(token), claimTokenExpiresAt: new Date(now.getTime() + CLAIM_TOKEN_TTL_MS) })
			.where(eq(order.id, o.id));

	const [pay] = await db
		.select({ method: payment.method, card: payment.card })
		.from(payment)
		.where(and(eq(payment.orderId, o.id), eq(payment.status, 'successful')))
		.orderBy(desc(payment.paidAt))
		.limit(1);

	const link = needsGuild ? `${appUrl()}/claim?token=${token}` : `${appUrl()}/dashboard`;
	try {
		const sent = await sendMail({
			to: email,
			...receiptMail({
				orderNo: o.orderNo,
				packageName: o.packageSnapshot.name,
				amount: `฿${(o.amountSatang / 100).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
				paidAt: (o.paidAt ?? now).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' }) + ' (UTC+7)',
				method: pay ? methodLabel(pay.method) + (pay.card?.last4 ? ` •••• ${pay.card.last4}` : '') : '-',
				link,
				needsGuild
			})
		});
		if (!sent) await db.update(order).set({ receiptSentAt: null }).where(eq(order.id, o.id)); // SMTP ยังไม่ตั้ง → ลองใหม่ครั้งหน้า
	} catch (e) {
		console.error('[receipt] send failed, will retry:', (e as Error).message);
		await db.update(order).set({ receiptSentAt: null }).where(eq(order.id, o.id));
	}
}

interface ReceiptData {
	orderNo: string;
	packageName: string;
	amount: string;
	paidAt: string;
	method: string;
	link: string;
	needsGuild: boolean;
}

/** เนื้อหาอีเมล (ไทย + อังกฤษ) — HTML แบบ inline style ให้แสดงถูกใน Gmail */
export function receiptMail(d: ReceiptData) {
	const e = escapeHtml;
	const button = d.needsGuild ? 'สร้างกิลด์ของคุณ · Create your guild' : 'เข้าสู่ระบบจัดการกิลด์ · Open guild management';
	const row = (label: string, value: string) =>
		`<tr><td style="padding:6px 0;color:#646a85">${label}</td><td style="padding:6px 0;text-align:right;font-weight:600">${e(value)}</td></tr>`;
	const html = `<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:'Noto Sans Thai',Inter,Arial,sans-serif;color:#181b2c">
<div style="max-width:520px;margin:0 auto;padding:32px 16px">
  <div style="background:#fff;border:1px solid #e1e4f0;border-radius:16px;padding:28px">
    <p style="margin:0;font-size:13px;color:#4f5bd5;font-weight:700">ROW Guild Management</p>
    <h1 style="margin:8px 0 4px;font-size:22px">ชำระเงินสำเร็จ ✓</h1>
    <p style="margin:0 0 20px;color:#646a85;font-size:14px">Payment successful — ขอบคุณที่ใช้บริการ / Thank you!</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;border-top:1px solid #e1e4f0;border-bottom:1px solid #e1e4f0">
      ${row('เลขที่คำสั่งซื้อ · Order', d.orderNo)}
      ${row('แพ็กเกจ · Plan', d.packageName)}
      ${row('ยอดชำระ · Amount', d.amount)}
      ${row('ช่องทาง · Method', d.method)}
      ${row('วันที่ · Paid at', d.paidAt)}
    </table>
    <p style="margin:20px 0 0;font-size:14px">${
			d.needsGuild
				? 'กดปุ่มด้านล่างแล้ว login ด้วย Discord บัญชีเดียวกับที่ชำระเงิน เพื่อตั้งชื่อกิลด์และเริ่มใช้งาน<br><span style="color:#646a85">Click below and log in with the same Discord account to name your guild.</span>'
				: 'กิลด์ของคุณต่ออายุเรียบร้อยแล้ว<br><span style="color:#646a85">Your guild has been renewed.</span>'
		}</p>
    <p style="margin:20px 0"><a href="${e(d.link)}" style="display:inline-block;background:#4f5bd5;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">${button}</a></p>
    ${d.needsGuild ? '<p style="margin:0;font-size:12px;color:#646a85">ลิงก์นี้ใช้ได้ครั้งเดียวภายใน 24 ชั่วโมง ถ้าหมดอายุ login แล้วสร้างกิลด์จากหน้าภาพรวมได้เลย<br>This link works once within 24 hours. After that, log in and create your guild from the dashboard.</p>' : ''}
  </div>
  <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#646a85">อีเมลนี้ส่งอัตโนมัติ · This is an automated email.</p>
</div></body></html>`;
	const text = [
		'ชำระเงินสำเร็จ / Payment successful',
		`Order: ${d.orderNo}`,
		`Plan: ${d.packageName}`,
		`Amount: ${d.amount}`,
		`Method: ${d.method}`,
		`Paid at: ${d.paidAt}`,
		'',
		`${d.needsGuild ? 'สร้างกิลด์ / Create your guild' : 'เข้าสู่ระบบ / Open guild management'}: ${d.link}`,
		d.needsGuild ? 'ลิงก์ใช้ได้ครั้งเดียวภายใน 24 ชั่วโมง / Link works once within 24 hours.' : ''
	].join('\n');
	return { subject: `ชำระเงินสำเร็จ · Payment successful — ${d.orderNo}`, html, text };
}
