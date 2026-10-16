import { can } from '@row/auth/permissions';
import { eventLeave, guildEvent } from '@row/db';
import { EVENT_TYPES } from '@row/shared';
import { eq, inArray } from 'drizzle-orm';
import { db } from '#lib/server/db.ts';
import { countAssigned } from '#lib/server/events.ts';
import { requireGuild } from '#lib/server/guard.ts';
import { ensureStandingEvents } from '#lib/server/schedule.ts';
import type { PageServerLoad } from './$types';

/** 1 กิลด์มี event ถาวรประเภทละ 1 อัน (GL / Siege / Polarity) — ผู้ใช้ปรับปาร์ตี้ก่อนแต่ละรอบ */
export const load: PageServerLoad = async (event) => {
	const ctx = await requireGuild(event);
	await ensureStandingEvents(ctx.guild.id).catch((e) => console.error('ensureStandingEvents', e));

	const events = await db.select().from(guildEvent).where(eq(guildEvent.organizationId, ctx.guild.id));
	const ids = events.map((e) => e.id);
	const assigned = await countAssigned(ids);
	const leaves = ids.length
		? await db.select({ eventId: eventLeave.eventId }).from(eventLeave).where(inArray(eventLeave.eventId, ids))
		: [];

	return {
		events: EVENT_TYPES.flatMap((type) => {
			const e = events.find((x) => x.type === type);
			return e
				? [
						{
							id: e.id,
							type: e.type,
							title: e.title,
							status: e.status,
							startsAt: e.startsAt?.toISOString() ?? null,
							assigned: assigned.get(e.id) ?? 0,
							onLeave: leaves.filter((l) => l.eventId === e.id).length
						}
					]
				: [];
		}),
		canManage: ctx.isSuper || can(ctx.role, 'event', 'update')
	};
};
