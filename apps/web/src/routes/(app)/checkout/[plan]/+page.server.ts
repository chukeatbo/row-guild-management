import { getGuildAccess, order, pkg } from '@row/db';
import { error, redirect } from '@sveltejs/kit';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { MessageKey } from '#lib/i18n/index.ts';
import { sortMethods } from '#lib/payment-methods.ts';
import { writeAudit } from '#lib/server/audit.ts';
import { BillingError } from '#lib/server/billing-error.ts';
import { availableMethods, startPayment } from '#lib/server/checkout.ts';
import { db } from '#lib/server/db.ts';
import { formError, requireUser } from '#lib/server/guard.ts';
import { omisePublicKey } from '#lib/server/omise.ts';
import type { Actions, PageServerLoad } from './$types';

async function paidPackage(code: string) {
	const [p] = await db
		.select()
		.from(pkg)
		.where(and(eq(pkg.code, code), eq(pkg.isActive, true)));
	if (!p) error(404, 'package not found');
	if (p.isTrial) redirect(303, `/start/${p.code}`);
	return p;
}

export const load: PageServerLoad = async (event) => {
	const ctx = await requireUser(event);
	const p = await paidPackage(event.params.plan);

	// กิลด์ที่ต่ออายุได้ = ที่ผู้ใช้เป็น owner และไม่ใช่กิลด์ไม่จำกัด
	const owned = [];
	for (const g of ctx.guilds.filter((g) => g.role === 'owner')) {
		const a = await getGuildAccess(db, g.id);
		if (a.state !== 'exempt') owned.push({ id: g.id, name: g.name, state: a.state, endsAt: a.endsAt?.toISOString() ?? null });
	}
	const wanted = event.url.searchParams.get('guild');

	// อีเมลรับใบเสร็จที่ใช้ล่าสุด (ไม่มี = อีเมลจาก Discord)
	const [last] = await db
		.select({ email: sql<string | null>`${order.billingInfo}->>'email'` })
		.from(order)
		.where(and(eq(order.userId, ctx.user.id), sql`${order.billingInfo}->>'email' is not null`))
		.orderBy(desc(order.createdAt))
		.limit(1);

	return {
		plan: { code: p.code, name: p.name, translations: p.translations, priceSatang: p.priceSatang, currency: p.currency, durationDays: p.durationDays },
		owned,
		target: owned.some((g) => g.id === wanted) ? wanted! : 'new',
		email: last?.email ?? ctx.user.email ?? '',
		methods: sortMethods(await availableMethods()),
		publicKey: omisePublicKey()
	};
};

const paySchema = z.object({
	target: z.string().min(1),
	email: z.string().trim().email().max(200),
	method: z.string().regex(/^[a-z0-9_]+$/),
	cardToken: z.string().optional(),
	idem: z.string().uuid()
});

const ERRORS: Record<string, MessageKey> = {
	payment_declined: 'error.paymentDeclined',
	payment_failed: 'error.paymentFailed',
	invalid_method: 'error.invalidMethod',
	invalid_card_token: 'error.cardInvalid',
	not_guild_owner: 'error.notGuildOwner',
	organization_not_found: 'error.notGuildOwner',
	omise_not_configured: 'error.paymentUnavailable',
	package_not_found: 'error.invalid',
	idempotency_conflict: 'error.paymentFailed',
	order_closed: 'error.paymentFailed'
};

export const actions: Actions = {
	pay: async (event) => {
		const ctx = await requireUser(event);
		const p = await paidPackage(event.params.plan);
		const parsed = paySchema.safeParse(Object.fromEntries(await event.request.formData()));
		if (!parsed.success) {
			const field = parsed.error.issues[0]?.path[0];
			return formError(field === 'email' ? 'error.invalid' : field === 'method' ? 'error.invalidMethod' : 'error.invalid', 400, { field });
		}
		const d = parsed.data;
		let res;
		try {
			res = await startPayment({
				userId: ctx.user.id,
				packageCode: p.code,
				organizationId: d.target === 'new' ? null : d.target,
				email: d.email,
				method: d.method,
				cardToken: d.cardToken,
				idempotencyKey: d.idem,
				origin: event.url.origin
			});
		} catch (e) {
			if (e instanceof BillingError) return formError(ERRORS[e.code] ?? 'error.paymentFailed', e.status);
			throw e;
		}
		await writeAudit({ organizationId: d.target === 'new' ? null : d.target, actorUserId: ctx.user.id, action: 'billing.checkout', targetType: 'order', targetId: res.orderId, detail: { package: p.code, method: d.method } });
		// ลิงก์ภายนอก (ธนาคาร/3DS) ให้ client พาไปเอง — goto ของ SvelteKit ใช้กับ URL ภายนอกไม่ได้
		if (res.kind === 'redirect') return { redirectTo: res.url };
		redirect(303, `/checkout/order/${res.orderId}`);
	}
};
