import { guildSubscription, order, payment } from '@row/db';
import { json } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { isLandingCall } from '#lib/server/billing.ts';
import { db } from '#lib/server/db.ts';
import type { RequestHandler } from './$types';

/** landing page ถามสถานะออเดอร์ (polling หลังผู้ใช้จ่าย) — Authorization: Bearer LANDING_API_KEY */
export const GET: RequestHandler = async ({ request, params }) => {
	if (!isLandingCall(request)) return json({ error: 'unauthorized' }, { status: 401 });

	const [o] = await db.select().from(order).where(eq(order.id, params.id));
	if (!o) return json({ error: 'order_not_found' }, { status: 404 });

	const [payments, [sub]] = await Promise.all([
		db
			.select({ omiseChargeId: payment.omiseChargeId, method: payment.method, status: payment.status, failureCode: payment.failureCode })
			.from(payment)
			.where(eq(payment.orderId, o.id))
			.orderBy(asc(payment.createdAt)),
		db.select({ startsAt: guildSubscription.startsAt, endsAt: guildSubscription.endsAt, status: guildSubscription.status }).from(guildSubscription).where(eq(guildSubscription.orderId, o.id))
	]);

	return json({
		order: {
			id: o.id,
			orderNo: o.orderNo,
			status: o.status,
			amountSatang: o.amountSatang,
			currency: o.currency,
			organizationId: o.organizationId,
			expiresAt: o.expiresAt?.toISOString() ?? null,
			paidAt: o.paidAt?.toISOString() ?? null
		},
		payments,
		subscription: sub ? { status: sub.status, startsAt: sub.startsAt.toISOString(), endsAt: sub.endsAt?.toISOString() ?? null } : null
	});
};
