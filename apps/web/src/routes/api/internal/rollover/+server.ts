import { organization } from '@row/db';
import { json, error } from '@sveltejs/kit';
import { db } from '#lib/server/db.ts';
import { isInternalCall } from '#lib/server/render.ts';
import { ensureStandingEvents } from '#lib/server/schedule.ts';
import type { RequestHandler } from './$types';

/** bot เรียกทุกนาทีเพื่อเลื่อน event ถาวรไปรอบถัดไป (ใช้ฟังก์ชันเดียวกับตอนเปิดหน้าเว็บ) */
export const POST: RequestHandler = async ({ request }) => {
	if (!isInternalCall(request)) error(403, 'forbidden');
	const orgs = await db.select({ id: organization.id }).from(organization);
	let failed = 0;
	for (const o of orgs) {
		try {
			await ensureStandingEvents(o.id);
		} catch (e) {
			failed++;
			console.error('rollover', o.id, e);
		}
	}
	return json({ orgs: orgs.length, failed });
};
