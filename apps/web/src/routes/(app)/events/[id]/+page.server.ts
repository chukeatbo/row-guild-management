import { can } from '@row/auth/permissions';
import { eventImageTargets } from '@row/shared';
import { character, eventLeave, guildEvent, party, partyGroup, partySlot } from '@row/db';
import { error } from '@sveltejs/kit';
import { and, asc, eq, inArray, max, sql } from 'drizzle-orm';
import { writeAudit } from '#lib/server/audit.ts';
import { enqueueDiscord, guildChannels } from '#lib/server/discord.ts';
import { db } from '#lib/server/db.ts';
import { loadEvent, myCharacterIds, groupLetter } from '#lib/server/events.ts';
import { formError, requireGuild } from '#lib/server/guard.ts';
import { listCharacters } from '#lib/server/queries.ts';
import { ensureStandingEvents } from '#lib/server/schedule.ts';
import { eventSchemaFor, formToObject, layoutSchema } from '#lib/schemas.ts';
import type { Actions, PageServerLoad } from './$types';

type Ctx = Awaited<ReturnType<typeof requireGuild>>;

const isFullAccess = (ctx: Ctx) => ctx.isSuper || can(ctx.role, 'party', 'lock');
const allowed = (ctx: Ctx, r: Parameters<typeof can>[1], a: string) =>
	ctx.isSuper || can(ctx.role, r, a);
const CLOSED = ['closed', 'done'];

export const load: PageServerLoad = async (event) => {
	const ctx = await requireGuild(event);
	await ensureStandingEvents(ctx.guild.id).catch((e) => console.error('ensureStandingEvents', e));
	const ev = await loadEvent(ctx.guild.id, event.params.id);
	if (!ev) error(404);

	const [groups, parties, slots, leaves, characters] = await Promise.all([
		db.select().from(partyGroup).where(eq(partyGroup.eventId, ev.id)).orderBy(asc(partyGroup.position)),
		db.select().from(party).where(eq(party.eventId, ev.id)).orderBy(asc(party.position)),
		db.select().from(partySlot).where(eq(partySlot.eventId, ev.id)).orderBy(asc(partySlot.slotIndex)),
		db.select({ characterId: eventLeave.characterId }).from(eventLeave).where(eq(eventLeave.eventId, ev.id)),
		listCharacters(ctx.guild.id)
	]);

	const full = isFullAccess(ctx);
	const canAssign = allowed(ctx, 'party', 'assign');
	const mine = full ? new Set<string>() : await myCharacterIds(ctx.guild.id, ctx.user.id);
	const closedForMe = !full && CLOSED.includes(ev.status);

	const membersOf = new Map<string, string[]>();
	for (const s of slots) membersOf.set(s.partyId, [...(membersOf.get(s.partyId) ?? []), s.characterId]);

	return {
		event: {
			id: ev.id,
			type: ev.type,
			title: ev.title,
			status: ev.status,
			startsAt: ev.startsAt?.toISOString() ?? null,
			leaveDeadline: ev.leaveDeadline?.toISOString() ?? null,
			config: ev.config
		},
		groups: groups.map((g) => ({
			id: g.id,
			name: g.name,
			field: g.field,
			lane: g.lane,
			parties: parties
				.filter((p) => p.groupId === g.id)
				.map((p) => ({
					id: p.id,
					name: p.name,
					leaderCharacterId: p.leaderCharacterId,
					locked: p.locked,
					members: membersOf.get(p.id) ?? [],
					// สิทธิ์แก้ปาร์ตี้นี้ (server ตรวจซ้ำตอนบันทึก)
					editable:
						canAssign &&
						!closedForMe &&
						(full || (!p.locked && !!p.leaderCharacterId && mine.has(p.leaderCharacterId)))
				}))
		})),
		characters: characters.map((c) => ({
			id: c.id,
			ign: c.ign,
			className: c.className,
			classColor: c.classColor,
			role: c.role
		})),
		onLeave: leaves.map((l) => l.characterId),
		perms: {
			full,
			canAssign,
			canManage: allowed(ctx, 'event', 'update'),
			canLock: full,
			canSend: allowed(ctx, 'party', 'send_discord')
		}
	};
};

export const actions: Actions = {
	saveLayout: async (event) => {
		const ctx = await requireGuild(event, ['party', 'assign']);
		const ev = await loadEvent(ctx.guild.id, event.params.id);
		if (!ev) error(404);
		const full = isFullAccess(ctx);
		if (!full && CLOSED.includes(ev.status)) return formError('error.eventClosed', 403);

		let raw: unknown;
		try {
			raw = JSON.parse(String((await event.request.formData()).get('layout')));
		} catch {
			return formError('error.invalid');
		}
		const parsed = layoutSchema.safeParse(raw);
		if (!parsed.success) return formError('error.invalid');
		const layout = parsed.data;

		const [parties, groups, slots, leaves] = await Promise.all([
			db.select().from(party).where(eq(party.eventId, ev.id)),
			db.select().from(partyGroup).where(eq(partyGroup.eventId, ev.id)),
			db.select().from(partySlot).where(eq(partySlot.eventId, ev.id)).orderBy(asc(partySlot.slotIndex)),
			db.select({ id: eventLeave.characterId }).from(eventLeave).where(eq(eventLeave.eventId, ev.id))
		]);
		const partyById = new Map(parties.map((p) => [p.id, p]));
		const fieldOf = new Map(parties.map((p) => [p.id, groups.find((g) => g.id === p.groupId)?.field ?? null]));
		if (layout.length !== parties.length || layout.some((l) => !partyById.has(l.partyId)))
			return formError('error.invalid');

		const oldMembers = new Map<string, string[]>();
		for (const s of slots) oldMembers.set(s.partyId, [...(oldMembers.get(s.partyId) ?? []), s.characterId]);

		const allIds = layout.flatMap((l) => l.characterIds);
		if (new Set(allIds).size !== allIds.length) return formError('error.invalid');

		const mine = full ? new Set<string>() : await myCharacterIds(ctx.guild.id, ctx.user.id);
		const onLeave = new Set(leaves.map((l) => l.id));
		const changed: string[] = [];

		for (const l of layout) {
			const p = partyById.get(l.partyId)!;
			const old = oldMembers.get(p.id) ?? [];
			if (old.join() === l.characterIds.join()) continue;
			changed.push(p.id);
			if (p.locked && !full) return formError('error.partyLocked', 403);
			if (!full && !(p.leaderCharacterId && mine.has(p.leaderCharacterId)))
				return formError('error.forbidden', 403);
			if (l.characterIds.length > ev.config.partySize) return formError('error.partyFull');
			if (l.characterIds.some((id) => !old.includes(id) && onLeave.has(id)))
				return formError('error.onLeave');
		}
		if (changed.length === 0) return { ok: true };

		if (allIds.length) {
			const found = await db
				.select({ id: character.id })
				.from(character)
				.where(
					and(
						inArray(character.id, allIds),
						eq(character.organizationId, ctx.guild.id),
						eq(character.active, true)
					)
				);
			if (found.length !== allIds.length) return formError('error.invalid');
		}

		// เพดานจำนวนคน (ทั้ง event / ต่อสนาม) — ไม่บล็อกถ้าจำนวนไม่เพิ่มขึ้น
		const countBy = (map: (id: string) => string | null, members: Map<string, string[]>) => {
			const m = new Map<string | null, number>();
			for (const [pid, ids] of members) m.set(map(pid), (m.get(map(pid)) ?? 0) + ids.length);
			return m;
		};
		const nextMembers = new Map(layout.map((l) => [l.partyId, l.characterIds]));
		const nextF = countBy((pid) => fieldOf.get(pid) ?? null, nextMembers);
		const prevF = countBy((pid) => fieldOf.get(pid) ?? null, oldMembers);
		for (const f of ev.config.fields ?? []) {
			if (f.maxMembers && (nextF.get(f.key) ?? 0) > f.maxMembers && (nextF.get(f.key) ?? 0) > (prevF.get(f.key) ?? 0))
				return formError('error.overLimit');
		}
		const nextTotal = allIds.length;
		const prevTotal = slots.length;
		if (ev.config.maxMembers && nextTotal > ev.config.maxMembers && nextTotal > prevTotal)
			return formError('error.overLimit');

		await db.transaction(async (tx) => {
			await tx.delete(partySlot).where(eq(partySlot.eventId, ev.id));
			const rows = layout.flatMap((l) =>
				l.characterIds.map((characterId, i) => ({
					eventId: ev.id,
					partyId: l.partyId,
					slotIndex: i,
					characterId
				}))
			);
			if (rows.length) await tx.insert(partySlot).values(rows);
			// หัวหน้าที่ถูกย้ายออกจากปาร์ตี้ → เคลียร์
			for (const l of layout) {
				const p = partyById.get(l.partyId)!;
				if (p.leaderCharacterId && !l.characterIds.includes(p.leaderCharacterId))
					await tx.update(party).set({ leaderCharacterId: null }).where(eq(party.id, p.id));
			}
			await tx.update(guildEvent).set({ updatedAt: new Date() }).where(eq(guildEvent.id, ev.id));
		});
		await writeAudit({
			organizationId: ctx.guild.id,
			actorUserId: ctx.user.id,
			action: 'party.assign',
			targetType: 'guild_event',
			targetId: ev.id,
			detail: { changedParties: changed }
		});
		return { ok: true };
	},

	updateEvent: async (event) => {
		const ctx = await requireGuild(event, ['event', 'update']);
		const ev = await loadEvent(ctx.guild.id, event.params.id);
		if (!ev) error(404);
		const parsed = eventSchemaFor(event.locals.tz).safeParse({ ...formToObject(await event.request.formData()), type: ev.type });
		if (!parsed.success) return formError('error.invalid');
		const { type: _type, ...values } = parsed.data;
		await db
			.update(guildEvent)
			.set({ ...values, startsAt: values.startsAt ?? null, leaveDeadline: values.leaveDeadline ?? null })
			.where(eq(guildEvent.id, ev.id));
		await writeAudit({ organizationId: ctx.guild.id, actorUserId: ctx.user.id, action: 'event.update', targetType: 'guild_event', targetId: ev.id });
		return { ok: true };
	},


	addGroup: async (event) => {
		const ctx = await requireGuild(event, ['event', 'update']);
		const ev = await loadEvent(ctx.guild.id, event.params.id);
		if (!ev) error(404);
		if (ev.type === 'polarity_elite') return formError('error.invalid'); // Polarity ไม่มี group
		const fd = await event.request.formData();
		const field = (fd.get('field') as string) || null;
		const [{ pos, count }] = await db
			.select({ pos: max(partyGroup.position), count: sql<number>`count(*)::int` })
			.from(partyGroup)
			.where(eq(partyGroup.eventId, ev.id));
		await db.transaction(async (tx) => {
			const [g] = await tx
				.insert(partyGroup)
				.values({ eventId: ev.id, name: groupLetter(count), field, position: (pos ?? -1) + 1 })
				.returning({ id: partyGroup.id });
			await tx.insert(party).values({ eventId: ev.id, groupId: g!.id, name: 'P1', position: 0 });
		});
		await writeAudit({ organizationId: ctx.guild.id, actorUserId: ctx.user.id, action: 'group.create', targetType: 'guild_event', targetId: ev.id });
		return { ok: true };
	},

	renameGroup: async (event) => {
		const ctx = await requireGuild(event, ['event', 'update']);
		const fd = await event.request.formData();
		const name = String(fd.get('name') ?? '').trim().slice(0, 20);
		if (!name) return formError('error.invalid');
		await db
			.update(partyGroup)
			.set({ name })
			.where(and(eq(partyGroup.id, String(fd.get('groupId'))), eq(partyGroup.eventId, event.params.id)));
		await writeAudit({ organizationId: ctx.guild.id, actorUserId: ctx.user.id, action: 'group.rename', targetType: 'guild_event', targetId: event.params.id });
		return { ok: true };
	},

	deleteGroup: async (event) => {
		const ctx = await requireGuild(event, ['event', 'update']);
		const ev = await loadEvent(ctx.guild.id, event.params.id);
		if (!ev) error(404);
		if (ev.type === 'polarity_elite') return formError('error.invalid'); // ลบกลุ่มซ่อนของ Polarity ไม่ได้
		const groupId = String((await event.request.formData()).get('groupId'));
		await db.delete(partyGroup).where(and(eq(partyGroup.id, groupId), eq(partyGroup.eventId, ev.id)));
		await writeAudit({ organizationId: ctx.guild.id, actorUserId: ctx.user.id, action: 'group.delete', targetType: 'guild_event', targetId: ev.id, detail: { groupId } });
		return { ok: true };
	},

	addParty: async (event) => {
		const ctx = await requireGuild(event, ['event', 'update']);
		const ev = await loadEvent(ctx.guild.id, event.params.id);
		if (!ev) error(404);
		const groupId = String((await event.request.formData()).get('groupId'));
		const [g] = await db.select().from(partyGroup).where(and(eq(partyGroup.id, groupId), eq(partyGroup.eventId, ev.id)));
		if (!g) return formError('error.invalid');
		const [{ pos, count }] = await db
			.select({ pos: max(party.position), count: sql<number>`count(*)::int` })
			.from(party)
			.where(eq(party.groupId, g.id));
		if (count >= ev.config.maxPartiesPerGroup)
			return formError('error.maxParties', 400, { params: { n: ev.config.maxPartiesPerGroup } });
		const position = (pos ?? -1) + 1;
		await db.insert(party).values({ eventId: ev.id, groupId: g.id, name: `P${position + 1}`, position });
		await writeAudit({ organizationId: ctx.guild.id, actorUserId: ctx.user.id, action: 'party.create', targetType: 'guild_event', targetId: ev.id });
		return { ok: true };
	},

	/** ส่งรูปปาร์ตี้ลงห้อง Discord (bot แคปหน้า /render/event/[id] แล้วโพสต์) */
	sendDiscord: async (event) => {
		const ctx = await requireGuild(event, ['party', 'send_discord']);
		const ev = await loadEvent(ctx.guild.id, event.params.id);
		if (!ev) error(404);
		// GL = 2 รูป (สนามบน/ล่าง) ไปคนละห้อง; ห้องที่ไม่ได้ตั้งข้าม
		const targets = eventImageTargets(ev.type, (await guildChannels(ctx.guild.id)).image);
		if (!targets.length) return formError('error.noChannel');
		const results = await Promise.all(
			targets.map((t) => enqueueDiscord({ type: 'send_image', kind: 'event', orgId: ctx.guild.id, targetId: ev.id, ...t }))
		);
		if (results.some((ok) => !ok)) return formError('error.discordUnavailable', 503);
		await writeAudit({ organizationId: ctx.guild.id, actorUserId: ctx.user.id, action: 'party.send_discord', targetType: 'guild_event', targetId: ev.id });
		return { ok: true };
	},

	deleteParty: async (event) => {
		const ctx = await requireGuild(event, ['event', 'update']);
		const ev = await loadEvent(ctx.guild.id, event.params.id);
		if (!ev) error(404);
		const partyId = String((await event.request.formData()).get('partyId'));
		await db.delete(party).where(and(eq(party.id, partyId), eq(party.eventId, ev.id)));
		await writeAudit({ organizationId: ctx.guild.id, actorUserId: ctx.user.id, action: 'party.delete', targetType: 'guild_event', targetId: ev.id, detail: { partyId } });
		return { ok: true };
	},

	setLeader: async (event) => {
		const ctx = await requireGuild(event, ['event', 'update']);
		const ev = await loadEvent(ctx.guild.id, event.params.id);
		if (!ev) error(404);
		const fd = await event.request.formData();
		const partyId = String(fd.get('partyId'));
		const characterId = String(fd.get('characterId') ?? '') || null;
		if (characterId) {
			// หัวหน้าต้องเป็นสมาชิกของปาร์ตี้นั้น
			const [slot] = await db
				.select({ id: partySlot.id })
				.from(partySlot)
				.where(and(eq(partySlot.partyId, partyId), eq(partySlot.characterId, characterId)));
			if (!slot) return formError('error.invalid');
		}
		await db.update(party).set({ leaderCharacterId: characterId }).where(and(eq(party.id, partyId), eq(party.eventId, ev.id)));
		await writeAudit({ organizationId: ctx.guild.id, actorUserId: ctx.user.id, action: 'party.set_leader', targetType: 'party', targetId: partyId, detail: { characterId } });
		return { ok: true };
	},

	toggleLock: async (event) => {
		const ctx = await requireGuild(event, ['party', 'lock']);
		const ev = await loadEvent(ctx.guild.id, event.params.id);
		if (!ev) error(404);
		const partyId = String((await event.request.formData()).get('partyId'));
		const [p] = await db.select().from(party).where(and(eq(party.id, partyId), eq(party.eventId, ev.id)));
		if (!p) return formError('error.invalid');
		await db.update(party).set({ locked: !p.locked }).where(eq(party.id, p.id));
		await writeAudit({ organizationId: ctx.guild.id, actorUserId: ctx.user.id, action: p.locked ? 'party.unlock' : 'party.lock', targetType: 'party', targetId: p.id });
		return { ok: true };
	}
};
