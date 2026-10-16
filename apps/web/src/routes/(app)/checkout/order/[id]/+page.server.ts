import { getGuildAccess } from '@row/db';
import { error, redirect } from '@sveltejs/kit';
import { writeAudit } from '#lib/server/audit.ts';
import { BillingError } from '#lib/server/billing-error.ts';
import { claimOrder, loadOrderForUser } from '#lib/server/checkout.ts';
import { db } from '#lib/server/db.ts';
import { formError, GUILD_COOKIE, requireUser } from '#lib/server/guard.ts';
import { formToObject, newGuildSchema } from '#lib/schemas.ts';
import type { Actions, PageServerLoad } from './$types';

/**
 * สถานะออเดอร์ของผู้ซื้อ — หน้าที่ Omise พากลับมา (return_uri) และหน้ารอสแกน QR (client poll ทุก 3 วินาที)
 * จ่ายแล้ว + ซื้อเพื่อกิลด์ใหม่ → ฟอร์มสร้างกิลด์ (claim) ในหน้านี้เลย
 */
export const load: PageServerLoad = async (event) => {
	const ctx = await requireUser(event);
	const found = await loadOrderForUser(event.params.id, ctx.user.id);
	if (!found) error(404, 'order not found');
	const { order: o, payment: p } = found;
	const access = o.organizationId ? await getGuildAccess(db, o.organizationId) : null;
	return {
		order: {
			id: o.id,
			orderNo: o.orderNo,
			status: o.status,
			amountSatang: o.amountSatang,
			packageCode: o.packageSnapshot.code,
			packageName: o.packageSnapshot.name,
			email: o.billingInfo?.email ?? null,
			isRenew: !!o.organizationId,
			needsGuild: o.status === 'paid' && !o.organizationId && !o.grantedAt,
			guildEndsAt: access?.endsAt?.toISOString() ?? null
		},
		payment: p
			? { method: p.method, status: p.status, qr: p.qrImageUri, authorizeUri: p.authorizeUri, failure: p.failureMessage, expiresAt: p.expiresAt?.toISOString() ?? null }
			: null
	};
};

export const actions: Actions = {
	claim: async (event) => {
		const ctx = await requireUser(event);
		const parsed = newGuildSchema.safeParse(formToObject(await event.request.formData()));
		if (!parsed.success) return formError('error.invalid');
		let orgId: string;
		try {
			orgId = await claimOrder(ctx.user.id, event.params.id, { name: parsed.data.name, server: parsed.data.server ?? null });
		} catch (e) {
			if (e instanceof BillingError) return formError(e.code === 'order_already_claimed' ? 'error.orderClaimed' : 'error.invalid', e.status);
			throw e;
		}
		await writeAudit({ organizationId: orgId, actorUserId: ctx.user.id, action: 'guild.create_paid', targetType: 'organization', targetId: orgId, detail: { orderId: event.params.id, ...parsed.data } });
		event.cookies.set(GUILD_COOKIE, orgId, { path: '/', maxAge: 31536000, sameSite: 'lax', httpOnly: false });
		redirect(303, '/dashboard');
	}
};
