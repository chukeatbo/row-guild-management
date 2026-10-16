import { can } from '@row/auth/permissions';
import { character, eventLeave, guildEvent, party, partySlot, user } from '@row/db';
import { LEAVE_EVENT_TYPES } from '@row/shared';
import { and, asc, eq, gte, inArray, ne } from 'drizzle-orm';
import { writeAudit } from '#lib/server/audit.ts';
import { db } from '#lib/server/db.ts';
import { enqueueDiscord } from '#lib/server/discord.ts';
import { formError, isUniqueViolation, requireGuild } from '#lib/server/guard.ts';
import { listCharacters } from '#lib/server/queries.ts';
import { ensureStandingEvents } from '#lib/server/schedule.ts';
import type { Actions, PageServerLoad } from './$types';

type Ctx = Awaited<ReturnType<typeof requireGuild>>;
const allowed = (ctx: Ctx, a: string) => ctx.isSuper || can(ctx.role, 'leave', a);
const SHOW_AFTER_START_MS = 6 * 3600_000; // event เพิ่งเริ่มยังแสดงอยู่ 6 ชม.

export const load: PageServerLoad = async (event) => {
	const ctx = await requireGuild(event);
	await ensureStandingEvents(ctx.guild.id).catch((e) => console.error('ensureStandingEvents', e));
	const now = new Date();

	const events = await db
		.select()
		.from(guildEvent)
		.where(
			and(
				eq(guildEvent.organizationId, ctx.guild.id),
				inArray(guildEvent.type, [...LEAVE_EVENT_TYPES]),
				ne(guildEvent.status, 'done'),
				gte(guildEvent.startsAt, new Date(now.getTime() - SHOW_AFTER_START_MS))
			)
		)
		.orderBy(asc(guildEvent.startsAt))
		.limit(12);

	const leaves = events.length
		? await db
				.select({
					id: eventLeave.id,
					eventId: eventLeave.eventId,
					characterId: eventLeave.characterId,
					reason: eventLeave.reason,
					filedByName: user.name
				})
				.from(eventLeave)
				.leftJoin(user, eq(eventLeave.createdBy, user.id))
				.where(
					inArray(
						eventLeave.eventId,
						events.map((e) => e.id)
					)
				)
		: [];

	const characters = await listCharacters(ctx.guild.id);
	const byId = new Map(characters.map((c) => [c.id, c]));
	const canAny = allowed(ctx, 'create_any');
	const canDeleteAny = allowed(ctx, 'delete_any');

	return {
		events: events.map((e) => {
			const deadlinePassed = !!e.leaveDeadline && e.leaveDeadline < now;
			return {
				id: e.id,
				type: e.type,
				title: e.title,
				startsAt: e.startsAt!.toISOString(), // กรอง gte ไว้แล้ว จึงไม่เป็น null
				leaveDeadline: e.leaveDeadline?.toISOString() ?? null,
				deadlinePassed,
				leaves: leaves
					.filter((l) => l.eventId === e.id && byId.has(l.characterId))
					.map((l) => {
						const c = byId.get(l.characterId)!;
						const mine = c.userId === ctx.user.id;
						return {
							id: l.id,
							characterId: l.characterId,
							ign: c.ign,
							className: c.className,
							classColor: c.classColor,
							reason: l.reason,
							filedByName: l.filedByName,
							mine,
							canCancel: canDeleteAny || (mine && !deadlinePassed)
						};
					})
			};
		}),
		mine: characters
			.filter((c) => c.userId === ctx.user.id)
			.map((c) => ({ id: c.id, ign: c.ign, className: c.className, classColor: c.classColor })),
		// รายชื่อทั้งกิลด์ใช้เฉพาะผู้มีสิทธิ์ลาแทนคนอื่น
		everyone: canAny
			? characters.map((c) => ({ id: c.id, ign: c.ign, className: c.className }))
			: [],
		canAny,
		canDeleteAny
	};
};

async function loadLeaveEvent(ctx: Ctx, eventId: string) {
	const [ev] = await db
		.select()
		.from(guildEvent)
		.where(and(eq(guildEvent.id, eventId), eq(guildEvent.organizationId, ctx.guild.id)));
	return ev ?? null;
}

export const actions: Actions = {
	take: async (event) => {
		const ctx = await requireGuild(event, ['leave', 'create_own']);
		const fd = await event.request.formData();
		const ev = await loadLeaveEvent(ctx, String(fd.get('eventId')));
		const characterId = String(fd.get('characterId') ?? '');
		const reason = String(fd.get('reason') ?? '').trim().slice(0, 200) || null;
		if (!ev || !(LEAVE_EVENT_TYPES as readonly string[]).includes(ev.type) || ev.status === 'done')
			return formError('error.leaveNotAllowed', 400);

		const [char] = await db
			.select()
			.from(character)
			.where(and(eq(character.id, characterId), eq(character.organizationId, ctx.guild.id), eq(character.active, true)));
		if (!char) return formError('error.invalid');

		// ลาแทนคนอื่น (ตัวละครที่ไม่ใช่ของตัวเอง) ต้องมี leave:create_any
		const canAny = allowed(ctx, 'create_any');
		if (char.userId !== ctx.user.id && !canAny) return formError('error.forbidden', 403);
		// เลย deadline: เฉพาะ Officer ขึ้นไป
		if (ev.leaveDeadline && ev.leaveDeadline < new Date() && !canAny)
			return formError('error.deadlinePassed', 403);

		try {
			await db.transaction(async (tx) => {
				await tx.insert(eventLeave).values({ eventId: ev.id, characterId, reason, createdBy: ctx.user.id });
				// นำออกจากปาร์ตี้ของ event นี้ + เคลียร์ตำแหน่งหัวหน้า
				await tx.delete(partySlot).where(and(eq(partySlot.eventId, ev.id), eq(partySlot.characterId, characterId)));
				await tx.update(party).set({ leaderCharacterId: null }).where(and(eq(party.eventId, ev.id), eq(party.leaderCharacterId, characterId)));
			});
		} catch (e) {
			if (isUniqueViolation(e)) return formError('error.alreadyOnLeave');
			throw e;
		}
		await writeAudit({
			organizationId: ctx.guild.id,
			actorUserId: ctx.user.id,
			action: 'leave.create',
			targetType: 'guild_event',
			targetId: ev.id,
			detail: { characterId, ign: char.ign, reason, forOther: char.userId !== ctx.user.id }
		});
		void enqueueDiscord({ type: 'leave', orgId: ctx.guild.id, eventId: ev.id, ign: char.ign, reason, cancelled: false, byOther: char.userId !== ctx.user.id });
		return { ok: true };
	},

	cancel: async (event) => {
		const ctx = await requireGuild(event, ['leave', 'create_own']);
		const leaveId = String((await event.request.formData()).get('leaveId'));
		const [row] = await db
			.select({ leave: eventLeave, ev: guildEvent, char: character })
			.from(eventLeave)
			.innerJoin(guildEvent, eq(eventLeave.eventId, guildEvent.id))
			.innerJoin(character, eq(eventLeave.characterId, character.id))
			.where(and(eq(eventLeave.id, leaveId), eq(guildEvent.organizationId, ctx.guild.id)));
		if (!row) return formError('error.invalid');

		const canDeleteAny = allowed(ctx, 'delete_any');
		if (!canDeleteAny) {
			if (row.char.userId !== ctx.user.id) return formError('error.forbidden', 403);
			if (row.ev.leaveDeadline && row.ev.leaveDeadline < new Date())
				return formError('error.deadlinePassed', 403);
		}
		await db.delete(eventLeave).where(eq(eventLeave.id, row.leave.id));
		await writeAudit({
			organizationId: ctx.guild.id,
			actorUserId: ctx.user.id,
			action: 'leave.cancel',
			targetType: 'guild_event',
			targetId: row.ev.id,
			detail: { characterId: row.char.id, ign: row.char.ign }
		});
		void enqueueDiscord({ type: 'leave', orgId: ctx.guild.id, eventId: row.ev.id, ign: row.char.ign, reason: null, cancelled: true, byOther: row.char.userId !== ctx.user.id });
		return { ok: true };
	}
};
