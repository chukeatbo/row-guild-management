import { pkg } from '@row/db';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db.ts';
import { requireUser } from '#lib/server/guard.ts';
import type { PageServerLoad } from './$types';

/**
 * สถานะแพ็กเกจของกิลด์ปัจจุบัน — requireGuild พามาที่นี่เมื่อหมดอายุ
 * owner (หรือ Super Admin) เห็นปุ่มต่ออายุ → checkout แพ็กเกจที่ต้องจ่ายพร้อมระบุกิลด์
 */
export const load: PageServerLoad = async (event) => {
	const ctx = await requireUser(event);
	const plans = await db
		.select({ code: pkg.code })
		.from(pkg)
		.where(and(eq(pkg.isActive, true), eq(pkg.isPublic, true), eq(pkg.isTrial, false)))
		.orderBy(asc(pkg.sortOrder), asc(pkg.priceSatang))
		.limit(1);
	return {
		guildName: ctx.guild?.name ?? null,
		guildId: ctx.guild?.id ?? null,
		access: ctx.access ? { state: ctx.access.state, endsAt: ctx.access.endsAt?.toISOString() ?? null, isTrial: ctx.access.isTrial } : null,
		canRenew: !!ctx.guild && (ctx.isSuper || ctx.role === 'owner'),
		renewPlan: plans[0]?.code ?? null
	};
};
