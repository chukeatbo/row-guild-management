import { eventSchedule, guildProfile, organization } from '@row/db';
import { and, eq } from 'drizzle-orm';
import { writeAudit } from '#lib/server/audit.ts';
import { db } from '#lib/server/db.ts';
import { formError, requireGuild } from '#lib/server/guard.ts';
import { formToObject, guildProfileSchema, scheduleSchema } from '#lib/schemas.ts';
import { getSchedules, applyScheduleChange } from '#lib/server/schedule.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = await requireGuild(event);
	const [org] = await db.select().from(organization).where(eq(organization.id, ctx.guild.id));
	const [profile] = await db
		.select()
		.from(guildProfile)
		.where(eq(guildProfile.organizationId, ctx.guild.id));
	const schedules = await getSchedules(ctx.guild.id);
	return {
		schedules: schedules.map((s) => ({
			type: s.type,
			weekdays: s.weekdays,
			startTime: s.startTime,
			leaveDeadlineHours: s.leaveDeadlineHours,
			enabled: s.enabled
		})),
		guild: {
			name: org!.name,
			slug: org!.slug,
			description: profile?.description ?? '',
			server: profile?.server ?? '',
			discordGuildId: profile?.discordGuildId ?? '',
			notifyChannelId: profile?.notifyChannelId ?? '',
			imageChannelId: profile?.imageChannelId ?? '',
			auctionChannelId: profile?.auctionChannelId ?? ''
		}
	};
};

export const actions: Actions = {
	saveSchedule: async (event) => {
		const ctx = await requireGuild(event, ['guild', 'update']);
		const fd = await event.request.formData();
		const parsed = scheduleSchema.safeParse({
			...formToObject(fd, ['enabled']),
			weekdays: fd.getAll('weekdays')
		});
		if (!parsed.success) return formError('error.invalid');
		const { type, ...values } = parsed.data;

		await getSchedules(ctx.guild.id); // ให้มีแถวค่าเริ่มต้นก่อน
		const [row] = await db
			.update(eventSchedule)
			.set({ ...values, leaveDeadlineHours: values.leaveDeadlineHours ?? null })
			.where(and(eq(eventSchedule.organizationId, ctx.guild.id), eq(eventSchedule.type, type)))
			.returning();
		await applyScheduleChange(row!); // เลื่อน event ถาวรไปรอบถัดไปตามตารางใหม่
		await writeAudit({
			organizationId: ctx.guild.id,
			actorUserId: ctx.user.id,
			action: 'schedule.update',
			targetType: 'event_schedule',
			targetId: row!.id,
			detail: { type, ...values }
		});
		return { ok: true };
	},

	save: async (event) => {
		// guild:update ครอบคลุมรายละเอียด; Discord channel ต้อง guild:configure_discord (owner เท่านั้นเหมือนกัน)
		const ctx = await requireGuild(event, ['guild', 'update']);
		const parsed = guildProfileSchema.safeParse(formToObject(await event.request.formData()));
		if (!parsed.success) return formError('error.invalid');
		const { name, ...profile } = parsed.data;

		await db.transaction(async (tx) => {
			await tx.update(organization).set({ name }).where(eq(organization.id, ctx.guild.id));
			await tx
				.insert(guildProfile)
				.values({ organizationId: ctx.guild.id, ...profile })
				.onConflictDoUpdate({ target: guildProfile.organizationId, set: profile });
		});
		await writeAudit({
			organizationId: ctx.guild.id,
			actorUserId: ctx.user.id,
			action: 'guild.update',
			targetType: 'organization',
			targetId: ctx.guild.id
		});
		return { ok: true };
	}
};
