import { guildProfile, guildSubscription, order, organization } from '@row/db';
import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from './db.ts';
import { enqueueDiscord } from './discord.ts';
import { appUrl, escapeHtml, sendMail } from './mail.ts';

const DAY = 86_400_000;

/**
 * เตือนแพ็กเกจใกล้หมดอายุ — bot เรียกทุกนาทีผ่าน /api/internal/billing-reminders
 * - ดูเฉพาะแถวสิทธิ์ที่หมดช้าสุดของแต่ละกิลด์ (ต่ออายุล่วงหน้าแล้ว = ยังไม่ใกล้หมด จึงไม่เตือน)
 * - เหลือ ≤ 3 วัน → เตือน 3 วัน, เหลือ ≤ 1 วัน → เตือน 1 วัน (ข้ามเตือน 3 วันถ้าเลยมาแล้ว)
 * - จองสิทธิ์ส่งด้วย UPDATE ... WHERE remind_x_sent_at IS NULL (ไม่ส่งซ้ำแม้เรียกพร้อมกัน); ส่งไม่ได้ → คืนสิทธิ์
 * - ส่ง: Discord ห้องแจ้งเตือน (ทุกกิลด์) + อีเมลล่าสุดที่ใช้ซื้อให้กิลด์นั้น (ทดลองใช้ไม่มีอีเมล = Discord อย่างเดียว)
 */
export async function runBillingReminders(now = new Date()) {
	// แถวที่หมดช้าสุดต่อกิลด์ (เฉพาะกิลด์ที่ไม่ได้รับยกเว้น)
	const latest = await db
		.selectDistinctOn([guildSubscription.organizationId], {
			id: guildSubscription.id,
			orgId: guildSubscription.organizationId,
			endsAt: guildSubscription.endsAt,
			remind3d: guildSubscription.remind3dSentAt,
			remind1d: guildSubscription.remind1dSentAt,
			guildName: organization.name
		})
		.from(guildSubscription)
		.innerJoin(organization, eq(organization.id, guildSubscription.organizationId))
		.innerJoin(guildProfile, eq(guildProfile.organizationId, guildSubscription.organizationId))
		.where(and(eq(guildSubscription.status, 'active'), isNotNull(guildSubscription.endsAt), eq(guildProfile.billingExempt, false)))
		.orderBy(guildSubscription.organizationId, desc(guildSubscription.endsAt));

	let sent = 0;
	for (const s of latest) {
		const left = s.endsAt!.getTime() - now.getTime();
		if (left <= 0 || left > 3 * DAY) continue;
		const kind: '1d' | '3d' = left <= DAY ? '1d' : '3d';
		if (kind === '3d' ? s.remind3d : s.remind1d) continue;

		const col = kind === '1d' ? guildSubscription.remind1dSentAt : guildSubscription.remind3dSentAt;
		const set = kind === '1d' ? { remind1dSentAt: now, remind3dSentAt: s.remind3d ?? now } : { remind3dSentAt: now };
		const [claimed] = await db
			.update(guildSubscription)
			.set(set)
			.where(and(eq(guildSubscription.id, s.id), isNull(col)))
			.returning({ id: guildSubscription.id });
		if (!claimed) continue;

		const daysLeft = kind === '1d' ? 1 : 3;
		const renewUrl = `${appUrl()}/billing`;
		try {
			await enqueueDiscord({ type: 'billing_reminder', orgId: s.orgId, daysLeft, endsAt: s.endsAt!.toISOString(), renewUrl });
			const email = await billingEmail(s.orgId);
			if (email) await sendMail({ to: email, ...reminderMail({ guildName: s.guildName, daysLeft, endsAt: s.endsAt!, renewUrl }) });
			sent++;
		} catch (e) {
			console.error('[billing-reminder] failed, will retry:', s.orgId, (e as Error).message);
			await db
				.update(guildSubscription)
				.set(kind === '1d' ? { remind1dSentAt: null } : { remind3dSentAt: null })
				.where(eq(guildSubscription.id, s.id));
		}
	}
	return { checked: latest.length, sent };
}

/** อีเมลรับใบเสร็จล่าสุดที่ใช้ซื้อให้กิลด์นี้ */
async function billingEmail(orgId: string) {
	const [row] = await db
		.select({ email: sql<string | null>`${order.billingInfo}->>'email'` })
		.from(order)
		.where(and(eq(order.organizationId, orgId), eq(order.status, 'paid'), sql`${order.billingInfo}->>'email' is not null`))
		.orderBy(desc(order.paidAt))
		.limit(1);
	return row?.email ?? null;
}

export function reminderMail(d: { guildName: string; daysLeft: number; endsAt: Date; renewUrl: string }) {
	const e = escapeHtml;
	const when = d.endsAt.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' }) + ' (UTC+7)';
	const html = `<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:'Noto Sans Thai',Inter,Arial,sans-serif;color:#181b2c">
<div style="max-width:520px;margin:0 auto;padding:32px 16px">
  <div style="background:#fff;border:1px solid #e1e4f0;border-radius:16px;padding:28px">
    <p style="margin:0;font-size:13px;color:#4f5bd5;font-weight:700">ROW Guild Management</p>
    <h1 style="margin:8px 0 4px;font-size:22px">แพ็กเกจของ ${e(d.guildName)} จะหมดอายุใน ${d.daysLeft} วัน</h1>
    <p style="margin:0 0 16px;color:#646a85;font-size:14px">Your guild’s plan expires in ${d.daysLeft} day${d.daysLeft > 1 ? 's' : ''} — ${e(when)}</p>
    <p style="margin:0;font-size:14px">หมดอายุแล้วข้อมูลยังอยู่ครบ แต่จะใช้ฟีเจอร์ของกิลด์และบอท Discord ไม่ได้จนกว่าจะต่ออายุ<br><span style="color:#646a85">After it expires your data is kept, but guild features and the Discord bot are paused until you renew.</span></p>
    <p style="margin:20px 0 0"><a href="${e(d.renewUrl)}" style="display:inline-block;background:#4f5bd5;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">ต่ออายุ · Renew</a></p>
  </div>
</div></body></html>`;
	const text = `แพ็กเกจของ ${d.guildName} จะหมดอายุใน ${d.daysLeft} วัน (${when})\nYour guild’s plan expires in ${d.daysLeft} day(s).\nต่ออายุ / Renew: ${d.renewUrl}`;
	return { subject: `แพ็กเกจของ ${d.guildName} จะหมดอายุใน ${d.daysLeft} วัน · Plan expires in ${d.daysLeft} day${d.daysLeft > 1 ? 's' : ''}`, html, text };
}
