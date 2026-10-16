import { can } from '@row/auth/permissions';
import { character, member } from '@row/db';
import { and, count, eq } from 'drizzle-orm';
import { writeAudit } from '#lib/server/audit.ts';
import { db } from '#lib/server/db.ts';
import { formError, isUniqueViolation, requireGuild } from '#lib/server/guard.ts';
import {
	findUserByDiscordId,
	listCharacters,
	listClasses,
	listPlayers
} from '#lib/server/queries.ts';
import { ASSIGNABLE_ROLES, characterSchema, discordIdSchema, formToObject } from '#lib/schemas.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = await requireGuild(event);
	const [characters, players, classes] = await Promise.all([
		listCharacters(ctx.guild.id),
		listPlayers(ctx.guild.id),
		listClasses({ onlyActive: true })
	]);
	const allowed = (r: Parameters<typeof can>[1], a: string) => ctx.isSuper || can(ctx.role, r, a);
	return {
		characters,
		players,
		classes: classes.map((c) => ({ id: c.id, name: c.name, color: c.color })),
		me: ctx.user.id,
		canEditAny: allowed('character', 'update_any'),
		canManagePlayers: allowed('member', 'update'),
		canAddPlayers: allowed('member', 'create'),
		isOwner: ctx.role === 'owner'
	};
};

/** แก้/ลบตัวละครได้เฉพาะของตัวเอง ยกเว้นผู้มี character:update_any */
async function loadOwnedCharacter(
	ctx: Awaited<ReturnType<typeof requireGuild>>,
	id: string | undefined
) {
	if (!id) return null;
	const [row] = await db
		.select()
		.from(character)
		.where(and(eq(character.id, id), eq(character.organizationId, ctx.guild.id)))
		.limit(1);
	if (!row) return null;
	const canAny = ctx.isSuper || can(ctx.role, 'character', 'update_any');
	return canAny || row.userId === ctx.user.id ? row : null;
}

export const actions: Actions = {
	saveCharacter: async (event) => {
		const ctx = await requireGuild(event, ['character', 'create_own']);
		const fd = await event.request.formData();
		const id = (fd.get('id') as string) || undefined;
		const parsed = characterSchema.safeParse(formToObject(fd));
		if (!parsed.success) return formError('error.invalid');
		const { discordId, ...values } = parsed.data;

		const canAny = ctx.isSuper || can(ctx.role, 'character', 'update_any');
		// ผูก Discord ได้เฉพาะผู้มีสิทธิ์ update_any; คนอื่นผูกกับตัวเองเสมอ
		let userId: string | null = ctx.user.id;
		if (canAny) {
			if (discordId) {
				const target = await findUserByDiscordId(discordId);
				if (!target) return formError('error.userNotFound');
				userId = target.id;
			} else {
				userId = null;
			}
		}

		try {
			if (id) {
				const existing = await loadOwnedCharacter(ctx, id);
				if (!existing) return formError('error.forbidden', 403);
				await db
					.update(character)
					.set({ ...values, ...(canAny ? { userId } : {}) })
					.where(eq(character.id, id));
				await writeAudit({
					organizationId: ctx.guild.id,
					actorUserId: ctx.user.id,
					action: 'character.update',
					targetType: 'character',
					targetId: id
				});
			} else {
				// เพดานตัวละครตามแพ็กเกจ (limits.maxMembers; กิลด์ไม่จำกัด/ไม่มีค่า = ไม่ตรวจ)
				const max = ctx.access?.limits.maxMembers;
				if (typeof max === 'number') {
					const [c] = await db.select({ n: count() }).from(character).where(eq(character.organizationId, ctx.guild.id));
					if ((c?.n ?? 0) >= max) return formError('error.memberLimit', 409);
				}
				const [row] = await db
					.insert(character)
					.values({ ...values, organizationId: ctx.guild.id, userId })
					.returning({ id: character.id });
				await writeAudit({
					organizationId: ctx.guild.id,
					actorUserId: ctx.user.id,
					action: 'character.create',
					targetType: 'character',
					targetId: row!.id,
					detail: { ign: values.ign }
				});
			}
		} catch (e) {
			if (isUniqueViolation(e)) return formError('error.duplicateIgn');
			throw e;
		}
		return { ok: true };
	},

	deleteCharacter: async (event) => {
		const ctx = await requireGuild(event, ['character', 'update_own']);
		const id = ((await event.request.formData()).get('id') as string) || undefined;
		const row = await loadOwnedCharacter(ctx, id);
		if (!row) return formError('error.forbidden', 403);
		// ซ่อนแทนลบ เพื่อไม่ให้ประวัติปาร์ตี้/ประมูลที่อ้างถึงหาย
		await db.update(character).set({ active: false }).where(eq(character.id, row.id));
		await writeAudit({
			organizationId: ctx.guild.id,
			actorUserId: ctx.user.id,
			action: 'character.delete',
			targetType: 'character',
			targetId: row.id,
			detail: { ign: row.ign }
		});
		return { ok: true };
	},

	addPlayer: async (event) => {
		const ctx = await requireGuild(event, ['member', 'create']);
		const parsed = discordIdSchema.safeParse((await event.request.formData()).get('discordId'));
		if (!parsed.success) return formError('error.invalid');
		const target = await findUserByDiscordId(parsed.data);
		if (!target) return formError('error.userNotFound');
		// member ของ Better Auth ไม่มี unique(org,user) จึงเช็คซ้ำเอง
		const [existing] = await db
			.select({ id: member.id })
			.from(member)
			.where(and(eq(member.organizationId, ctx.guild.id), eq(member.userId, target.id)))
			.limit(1);
		if (existing) return formError('error.alreadyMember');
		await db.insert(member).values({
			id: crypto.randomUUID(),
			organizationId: ctx.guild.id,
			userId: target.id,
			role: 'member',
			createdAt: new Date()
		});
		await writeAudit({
			organizationId: ctx.guild.id,
			actorUserId: ctx.user.id,
			action: 'member.add',
			targetType: 'user',
			targetId: target.id
		});
		return { ok: true };
	},

	setRole: async (event) => {
		const ctx = await requireGuild(event, ['member', 'update']);
		const fd = await event.request.formData();
		const memberId = fd.get('memberId') as string;
		const role = fd.get('role') as string;
		if (!(ASSIGNABLE_ROLES as readonly string[]).includes(role)) return formError('error.invalid');
		const [target] = await db
			.select()
			.from(member)
			.where(and(eq(member.id, memberId), eq(member.organizationId, ctx.guild.id)))
			.limit(1);
		if (!target || target.role === 'owner') return formError('error.forbidden', 403);
		await db.update(member).set({ role }).where(eq(member.id, target.id));
		await writeAudit({
			organizationId: ctx.guild.id,
			actorUserId: ctx.user.id,
			action: 'member.role_change',
			targetType: 'user',
			targetId: target.userId,
			detail: { from: target.role, to: role }
		});
		return { ok: true };
	},

	removePlayer: async (event) => {
		const ctx = await requireGuild(event, ['member', 'delete']);
		const memberId = (await event.request.formData()).get('memberId') as string;
		const [target] = await db
			.select()
			.from(member)
			.where(and(eq(member.id, memberId), eq(member.organizationId, ctx.guild.id)))
			.limit(1);
		if (!target || target.role === 'owner') return formError('error.forbidden', 403);
		await db.transaction(async (tx) => {
			await tx.delete(member).where(eq(member.id, target.id));
			// ปลดตัวละครออกจากบัญชีนี้ แต่เก็บตัวละครไว้ในกิลด์ (ปาร์ตี้ยังอ้างอิงได้)
			await tx
				.update(character)
				.set({ userId: null })
				.where(and(eq(character.organizationId, ctx.guild.id), eq(character.userId, target.userId)));
		});
		await writeAudit({
			organizationId: ctx.guild.id,
			actorUserId: ctx.user.id,
			action: 'member.remove',
			targetType: 'user',
			targetId: target.userId
		});
		return { ok: true };
	}
};
