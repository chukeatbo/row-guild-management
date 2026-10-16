import { pkg } from '@row/db';
import { error, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { writeAudit } from '#lib/server/audit.ts';
import { BillingError } from '#lib/server/billing-error.ts';
import { db } from '#lib/server/db.ts';
import { formError, GUILD_COOKIE, requireUser } from '#lib/server/guard.ts';
import { hasUsedTrial, startTrial } from '#lib/server/guilds.ts';
import { newGuildSchema, formToObject } from '#lib/schemas.ts';
import type { Actions, PageServerLoad } from './$types';

/**
 * ทางเข้าจากปุ่มแพ็กเกจบน landing — /start/<code>
 * ยังไม่ login → requireUser พาไป login แล้วกลับมาที่นี่; แพ็กเกจที่ต้องจ่าย → หน้า checkout
 */
async function activePackage(code: string) {
	const [p] = await db
		.select()
		.from(pkg)
		.where(and(eq(pkg.code, code), eq(pkg.isActive, true)));
	if (!p) error(404, 'package not found');
	return p;
}

export const load: PageServerLoad = async (event) => {
	const ctx = await requireUser(event);
	const p = await activePackage(event.params.plan);
	if (!p.isTrial) redirect(303, `/checkout/${p.code}`);
	return { trialDays: p.durationDays ?? 0, used: await hasUsedTrial(ctx.user.id) };
};

export const actions: Actions = {
	default: async (event) => {
		const ctx = await requireUser(event);
		const p = await activePackage(event.params.plan);
		if (!p.isTrial) return formError('error.invalid');
		const parsed = newGuildSchema.safeParse(formToObject(await event.request.formData()));
		if (!parsed.success) return formError('error.invalid');

		let orgId: string;
		try {
			({ orgId } = await startTrial(ctx.user.id, { name: parsed.data.name, server: parsed.data.server ?? null }));
		} catch (e) {
			if (e instanceof BillingError) {
				if (e.code === 'trial_used') return formError('error.trialUsed', 409);
				if (e.code === 'trial_unavailable') return formError('error.trialUnavailable', 404);
				if (e.code === 'duplicate') return formError('error.duplicate', 409);
			}
			throw e;
		}
		await writeAudit({ organizationId: orgId, actorUserId: ctx.user.id, action: 'guild.create_trial', targetType: 'organization', targetId: orgId, detail: { ...parsed.data, package: p.code } });
		// เปิดกิลด์ใหม่เป็นกิลด์ปัจจุบัน
		event.cookies.set(GUILD_COOKIE, orgId, { path: '/', maxAge: 31536000, sameSite: 'lax', httpOnly: false });
		redirect(303, '/dashboard');
	}
};
