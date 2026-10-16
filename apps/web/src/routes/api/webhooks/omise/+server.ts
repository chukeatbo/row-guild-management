import { omiseWebhookEvent } from '@row/db';
import { json } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { applyCharge, syncRefunds, type ApplyResult } from '#lib/server/billing.ts';
import { BillingError, Ignored } from '#lib/server/billing-error.ts';
import { db } from '#lib/server/db.ts';
import { fetchCharge } from '#lib/server/omise.ts';
import type { RequestHandler } from './$types';

interface OmiseEvent {
	object?: string;
	id?: string;
	key?: string; // เช่น charge.complete, refund.create
	data?: { object?: string; id?: string; charge?: string };
}

/** ถ้าตั้ง OMISE_WEBHOOK_TOKEN ไว้ ต้องใส่ ?token=... ต่อท้าย URL ที่ตั้งใน Omise dashboard (Omise ไม่มี signature) */
function tokenOk(url: URL) {
	const want = process.env.OMISE_WEBHOOK_TOKEN;
	if (!want) return true;
	const got = Buffer.from(url.searchParams.get('token') ?? '');
	const exp = Buffer.from(want);
	return got.length === exp.length && timingSafeEqual(got, exp);
}

/** จัดการ event → อัปเดตจากข้อมูลจริงที่ดึงจาก Omise API (ไม่เชื่อ payload) */
async function handleEvent(ev: OmiseEvent): Promise<ApplyResult | { status: 'ignored'; warning?: string }> {
	const key = ev.key ?? '';
	const chargeId = key.startsWith('charge.') ? ev.data?.id : key.startsWith('refund.') ? ev.data?.charge : undefined;
	if (!chargeId) return { status: 'ignored' }; // event ชนิดอื่น (customer.*, transfer.* ...) ไม่เกี่ยวกับเรา
	let charge;
	try {
		charge = await fetchCharge(chargeId);
	} catch (e) {
		if (e instanceof BillingError && e.code === 'charge_not_found') throw new Ignored(`charge ${chargeId} not found at Omise`);
		throw e;
	}
	const result = await applyCharge(charge);
	await syncRefunds(charge); // คืนเงินที่เกิดกับ charge นี้ (ถ้ามี) — idempotent
	return result;
}

/**
 * Omise webhook — ตอบ 200 เสมอเมื่อรับทราบ (รวมซ้ำ/ไม่เกี่ยวข้อง), 500 เมื่อพังชั่วคราวเพื่อให้ Omise ส่งซ้ำ
 * event เก็บลง omise_webhook_event ก่อนประมวลผล (unique evnt_id กันซ้ำ); event ที่เคยประมวลผลพังจะถูกลองใหม่เมื่อ Omise ส่งซ้ำ
 */
export const POST: RequestHandler = async ({ request, url }) => {
	if (!tokenOk(url)) return json({ error: 'forbidden' }, { status: 403 });
	if (!process.env.OMISE_SECRET_KEY) return json({ error: 'omise_not_configured' }, { status: 503 });

	let ev: OmiseEvent;
	try {
		ev = (await request.json()) as OmiseEvent;
	} catch {
		return json({ error: 'invalid_json' }, { status: 400 });
	}
	if (ev?.object !== 'event' || typeof ev.id !== 'string' || !/^evnt_[A-Za-z0-9_]+$/.test(ev.id) || typeof ev.key !== 'string')
		return json({ error: 'invalid_event' }, { status: 400 });

	const objectId = ev.data?.id ?? null;
	await db
		.insert(omiseWebhookEvent)
		.values({ omiseEventId: ev.id, type: ev.key, objectId, payload: ev })
		.onConflictDoNothing({ target: omiseWebhookEvent.omiseEventId });
	const [row] = await db.select().from(omiseWebhookEvent).where(eq(omiseWebhookEvent.omiseEventId, ev.id));
	if (row?.processedAt) return json({ status: 'duplicate' });

	try {
		const result = await handleEvent(ev);
		await db
			.update(omiseWebhookEvent)
			.set({ processedAt: new Date(), error: result.warning ?? null })
			.where(eq(omiseWebhookEvent.omiseEventId, ev.id));
		return json({ status: result.status });
	} catch (e) {
		const message = (e as Error).message;
		if (e instanceof Ignored) {
			await db.update(omiseWebhookEvent).set({ processedAt: new Date(), error: message }).where(eq(omiseWebhookEvent.omiseEventId, ev.id));
			return json({ status: 'ignored' });
		}
		console.error('omise webhook failed', ev.id, message);
		await db.update(omiseWebhookEvent).set({ error: message }).where(eq(omiseWebhookEvent.omiseEventId, ev.id));
		return json({ error: 'processing_failed' }, { status: 500 });
	}
};
