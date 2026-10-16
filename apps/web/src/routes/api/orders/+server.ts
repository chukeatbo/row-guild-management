import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { BillingError } from '#lib/server/billing-error.ts';
import { createOrder, isLandingCall } from '#lib/server/billing.ts';
import { discordIdSchema } from '#lib/schemas.ts';
import { writeAudit } from '#lib/server/audit.ts';
import { findUserByDiscordId } from '#lib/server/queries.ts';
import type { RequestHandler } from './$types';

const bodySchema = z.object({
	packageCode: z.string().trim().min(1).max(64),
	/** Discord ID ของผู้ซื้อ — ต้องเคย login เว็บนี้ด้วย Discord แล้ว (มี user ในระบบ) */
	discordId: discordIdSchema,
	/** กิลด์ที่จะได้สิทธิ์ (ผู้ซื้อต้องเป็น owner); ไม่ส่ง = ซื้อก่อนมีกิลด์ */
	organizationId: z.string().trim().min(1).max(64).optional(),
	/** UUID ต่อการกด "ซื้อ" หนึ่งครั้ง — ส่งซ้ำ = ได้ออเดอร์เดิม */
	idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
	billingInfo: z
		.object({
			name: z.string().trim().max(200).optional(),
			taxId: z.string().trim().max(32).optional(),
			address: z.string().trim().max(500).optional(),
			email: z.string().trim().max(200).optional()
		})
		.optional()
});

const fail = (code: string, status: number, extra: Record<string, unknown> = {}) => json({ error: code, ...extra }, { status });

/**
 * landing page (ฝั่งเซิร์ฟเวอร์) เรียกเพื่อสร้างออเดอร์ แล้วเอา `charge` ที่ได้ไปสร้าง charge กับ Omise เอง
 * Authorization: Bearer LANDING_API_KEY
 * ต้องใส่ `charge.metadata` ลงใน Omise charge ตามที่ตอบกลับ (โดยเฉพาะ order_id) — webhook ใช้ผูกการจ่ายกับออเดอร์
 */
export const POST: RequestHandler = async ({ request }) => {
	if (!isLandingCall(request)) return fail('unauthorized', 401);

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return fail('invalid_json', 400);
	}
	const parsed = bodySchema.safeParse(raw);
	if (!parsed.success) return fail('invalid_request', 400, { fields: parsed.error.issues.map((i) => i.path.join('.')) });
	const input = parsed.data;

	const buyer = await findUserByDiscordId(input.discordId);
	if (!buyer) return fail('user_not_found', 404, { hint: 'the buyer must log in to the web app with Discord once before buying' });

	try {
		const { order, package: p, reused } = await createOrder({
			packageCode: input.packageCode,
			userId: buyer.id,
			organizationId: input.organizationId,
			idempotencyKey: input.idempotencyKey,
			billingInfo: input.billingInfo
		});
		if (!reused)
			await writeAudit({
				organizationId: order.organizationId,
				actorUserId: buyer.id,
				action: 'billing.order_create',
				targetType: 'order',
				targetId: order.id,
				detail: { orderNo: order.orderNo, package: p.code, amountSatang: order.amountSatang }
			});

		const requiresPayment = order.status === 'pending';
		return json(
			{
				order: {
					id: order.id,
					orderNo: order.orderNo,
					status: order.status,
					amountSatang: order.amountSatang,
					currency: order.currency,
					expiresAt: order.expiresAt?.toISOString() ?? null,
					organizationId: order.organizationId,
					package: { code: p.code, name: p.name, durationDays: p.durationDays }
				},
				requiresPayment,
				reused,
				// ค่าที่ให้ landing ส่งต่อให้ Omise ตอนสร้าง charge (amount ต้องตรงเป๊ะ ไม่งั้นระบบจะไม่ให้สิทธิ์)
				charge: requiresPayment
					? {
							amount: order.amountSatang,
							currency: order.currency.toLowerCase(),
							description: `${order.orderNo} ${p.name}`,
							metadata: { order_id: order.id, order_no: order.orderNo, organization_id: order.organizationId }
						}
					: null
			},
			{ status: reused ? 200 : 201 }
		);
	} catch (e) {
		if (e instanceof BillingError) return fail(e.code, e.status);
		throw e;
	}
};
