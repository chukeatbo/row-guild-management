import { account, character, gameClass, member, user } from '@row/db';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from './db.ts';

/** account.accountId ที่ providerId='discord' = Discord ID (CLAUDE.md ข้อ 2) */
const discordJoin = (userIdCol: typeof user.id | typeof character.userId) =>
	and(eq(account.userId, userIdCol), eq(account.providerId, 'discord'));

export function listCharacters(organizationId: string) {
	return db
		.select({
			id: character.id,
			ign: character.ign,
			level: character.level,
			combatPower: character.combatPower,
			note: character.note,
			userId: character.userId,
			classId: character.classId,
			className: gameClass.name,
			classColor: gameClass.color,
			classRole: gameClass.role, // role ตามอาชีพ (ค่าเริ่มต้น)
			roleOverride: character.role, // role ที่ผู้เล่นเลือกเอง (null = ตามอาชีพ)
			// role ที่ใช้จริง: เลือกเองก่อน ไม่งั้นตามอาชีพ — ใช้กับกราฟ/สรุปปาร์ตี้ทุกที่
			role: sql<'tank' | 'dps' | 'healer' | 'support' | null>`coalesce(${character.role}, ${gameClass.role})`,
			ownerName: user.name,
			ownerImage: user.image,
			discordId: account.accountId
		})
		.from(character)
		.leftJoin(gameClass, eq(character.classId, gameClass.id))
		.leftJoin(user, eq(character.userId, user.id))
		.leftJoin(account, discordJoin(character.userId))
		.where(and(eq(character.organizationId, organizationId), eq(character.active, true)))
		.orderBy(asc(gameClass.sortOrder), asc(character.ign));
}

export function listPlayers(organizationId: string) {
	return db
		.select({
			memberId: member.id,
			userId: member.userId,
			role: member.role,
			name: user.name,
			image: user.image,
			discordId: account.accountId
		})
		.from(member)
		.innerJoin(user, eq(member.userId, user.id))
		.leftJoin(account, discordJoin(user.id))
		.where(eq(member.organizationId, organizationId))
		.orderBy(asc(user.name));
}

export function listClasses(opts: { onlyActive?: boolean } = {}) {
	return db
		.select()
		.from(gameClass)
		.where(opts.onlyActive ? eq(gameClass.active, true) : undefined)
		.orderBy(asc(gameClass.sortOrder), asc(gameClass.name));
}

export async function findUserByDiscordId(discordId: string) {
	const [row] = await db
		.select({ id: user.id, name: user.name })
		.from(account)
		.innerJoin(user, eq(account.userId, user.id))
		.where(and(eq(account.providerId, 'discord'), eq(account.accountId, discordId)))
		.limit(1);
	return row ?? null;
}

export async function getDiscordId(userId: string) {
	const [row] = await db
		.select({ id: account.accountId })
		.from(account)
		.where(and(eq(account.userId, userId), eq(account.providerId, 'discord')))
		.limit(1);
	return row?.id ?? null;
}
