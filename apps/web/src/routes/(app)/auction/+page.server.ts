import { can } from '@row/auth/permissions';
import { auction, auctionAward, auctionEntry, auctionItem, character } from '@row/db';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { writeAudit } from '#lib/server/audit.ts';
import { db } from '#lib/server/db.ts';
import { enqueueDiscord, guildChannels } from '#lib/server/discord.ts';
import { formError, isUniqueViolation, requireGuild } from '#lib/server/guard.ts';
import { listCharacters } from '#lib/server/queries.ts';
import type { Actions, PageServerLoad } from './$types';

type Ctx = Awaited<ReturnType<typeof requireGuild>>;
const canManage = (ctx: Ctx) => ctx.isSuper || can(ctx.role, 'auction', 'close');
const HISTORY_LIMIT = 10;

export const load: PageServerLoad = async (event) => {
	const ctx = await requireGuild(event);
	const manage = canManage(ctx);

	const open = await db
		.select({ id: auction.id, itemName: auctionItem.name })
		.from(auction)
		.innerJoin(auctionItem, eq(auction.itemId, auctionItem.id))
		.where(and(eq(auction.organizationId, ctx.guild.id), eq(auction.status, 'queued')))
		.orderBy(asc(auction.createdAt));

	const awards = await db
		.select({
			id: auctionAward.id,
			itemName: auctionItem.name,
			characterId: auctionAward.characterId,
			ign: auctionAward.ign,
			createdAt: auctionAward.createdAt
		})
		.from(auctionAward)
		.innerJoin(auction, eq(auctionAward.auctionId, auction.id))
		.innerJoin(auctionItem, eq(auction.itemId, auctionItem.id))
		.where(eq(auction.organizationId, ctx.guild.id))
		.orderBy(desc(auctionAward.createdAt))
		.limit(HISTORY_LIMIT);

	const entries = open.length
		? await db
				.select({ id: auctionEntry.id, auctionId: auctionEntry.auctionId, characterId: auctionEntry.characterId })
				.from(auctionEntry)
				.where(inArray(auctionEntry.auctionId, open.map((o) => o.id)))
				.orderBy(asc(auctionEntry.createdAt), asc(auctionEntry.id))
		: [];

	const characters = await listCharacters(ctx.guild.id);
	const byId = new Map(characters.map((c) => [c.id, c]));
	const view = (id: string) => {
		const c = byId.get(id);
		return c
			? { characterId: c.id, ign: c.ign, className: c.className, classColor: c.classColor, userId: c.userId }
			: null;
	};

	const items = manage
		? await db.select({ id: auctionItem.id, name: auctionItem.name }).from(auctionItem).where(eq(auctionItem.active, true)).orderBy(asc(auctionItem.name))
		: [];

	return {
		queues: open.map((o) => {
			const list = entries
				.filter((e) => e.auctionId === o.id)
				.flatMap((e) => {
					const v = view(e.characterId);
					return v ? [{ id: e.id, ...v, mine: v.userId === ctx.user.id }] : [];
				});
			// Officer ขึ้นไปเลือกใครก็ได้ที่ยังไม่อยู่ในคิวนี้ (และเจ้าของตัวละครนั้นยังไม่มีตัวอื่นในคิว)
			const takenChars = new Set(list.map((e) => e.characterId));
			const takenUsers = new Set(list.flatMap((e) => (e.userId ? [e.userId] : [])));
			const available = manage
				? characters
						.filter((c) => !takenChars.has(c.id) && !(c.userId && takenUsers.has(c.userId)))
						.sort((a, b) => Number(b.userId === ctx.user.id) - Number(a.userId === ctx.user.id) || a.ign.localeCompare(b.ign))
						.map((c) => ({ id: c.id, ign: c.ign, className: c.className, mine: c.userId === ctx.user.id }))
				: [];
			return {
				id: o.id,
				itemName: o.itemName,
				entries: list.map(({ userId: _u, ...rest }) => rest),
				joined: list.some((e) => e.mine),
				available
			};
		}),
		history: awards.map((a) => {
			const c = a.characterId ? byId.get(a.characterId) : undefined;
			return {
				id: a.id,
				itemName: a.itemName,
				ign: a.ign,
				className: c?.className ?? null,
				classColor: c?.classColor ?? null,
				at: a.createdAt.toISOString()
			};
		}),
		mine: characters
			.filter((c) => c.userId === ctx.user.id)
			.map((c) => ({ id: c.id, ign: c.ign, className: c.className, classColor: c.classColor })),
		items,
		canManage: manage
	};
};

async function loadQueue(ctx: Ctx, id: string) {
	const [row] = await db
		.select()
		.from(auction)
		.where(and(eq(auction.id, id), eq(auction.organizationId, ctx.guild.id)));
	return row ?? null;
}

export const actions: Actions = {
	/** เพิ่มไอเทมเข้าคิว: เลือกจากรายการ หรือพิมพ์ชื่อใหม่ (สร้างใน master data ให้) */
	addQueue: async (event) => {
		const ctx = await requireGuild(event, ['auction', 'close']);
		const name = String((await event.request.formData()).get('name') ?? '').trim().slice(0, 80);
		if (!name) return formError('error.invalid');

		let [item] = await db.select().from(auctionItem).where(eq(auctionItem.name, name));
		if (!item) {
			try {
				[item] = await db.insert(auctionItem).values({ name }).returning();
			} catch (e) {
				if (!isUniqueViolation(e)) throw e;
				[item] = await db.select().from(auctionItem).where(eq(auctionItem.name, name));
			}
		} else if (!item.active) {
			await db.update(auctionItem).set({ active: true }).where(eq(auctionItem.id, item.id));
		}
		const [created] = await db.insert(auction).values({ organizationId: ctx.guild.id, itemId: item.id }).returning();
		await writeAudit({ organizationId: ctx.guild.id, actorUserId: ctx.user.id, action: 'auction.create', targetType: 'auction', targetId: created.id, detail: { item: item.name } });
		return { ok: true };
	},

	join: async (event) => {
		const ctx = await requireGuild(event, ['auction', 'enter']);
		const fd = await event.request.formData();
		const q = await loadQueue(ctx, String(fd.get('auctionId')));
		if (!q || q.status !== 'queued') return formError('error.auctionClosed');

		const [char] = await db
			.select()
			.from(character)
			.where(and(eq(character.id, String(fd.get('characterId') ?? '')), eq(character.organizationId, ctx.guild.id), eq(character.active, true)));
		// ลงแทนคนอื่นได้เฉพาะผู้มี auction:close
		if (!char || (char.userId !== ctx.user.id && !canManage(ctx))) return formError('error.forbidden', 403);

		try {
			await db.transaction(async (tx) => {
				// 1 คนลงได้ 1 ตัวละครต่อคิว (กันกินคิว); ตัวละครที่ไม่มีเจ้าของเช็คด้วย unique (คิว,ตัวละคร)
				if (char.userId) {
					const mine = await tx
						.select({ id: auctionEntry.id })
						.from(auctionEntry)
						.innerJoin(character, eq(auctionEntry.characterId, character.id))
						.where(and(eq(auctionEntry.auctionId, q.id), eq(character.userId, char.userId)));
					if (mine.length) throw new Error('already');
				}
				await tx.insert(auctionEntry).values({ auctionId: q.id, characterId: char.id });
			});
		} catch (e) {
			if ((e as Error).message === 'already' || isUniqueViolation(e)) return formError('error.alreadyInQueue');
			throw e;
		}
		await writeAudit({ organizationId: ctx.guild.id, actorUserId: ctx.user.id, action: 'auction.join', targetType: 'auction', targetId: q.id, detail: { characterId: char.id, ign: char.ign, forOther: char.userId !== ctx.user.id } });
		return { ok: true };
	},

	/** ออกจากคิว: เจ้าของตัวละครออกเอง หรือผู้มีสิทธิ์ close ลบให้ */
	leave: async (event) => {
		const ctx = await requireGuild(event, ['auction', 'enter']);
		const entryId = String((await event.request.formData()).get('entryId'));
		const [row] = await db
			.select({ entry: auctionEntry, q: auction, char: character })
			.from(auctionEntry)
			.innerJoin(auction, eq(auctionEntry.auctionId, auction.id))
			.innerJoin(character, eq(auctionEntry.characterId, character.id))
			.where(and(eq(auctionEntry.id, entryId), eq(auction.organizationId, ctx.guild.id)));
		if (!row || row.q.status !== 'queued') return formError('error.auctionClosed');
		if (row.char.userId !== ctx.user.id && !canManage(ctx)) return formError('error.forbidden', 403);

		await db.delete(auctionEntry).where(eq(auctionEntry.id, row.entry.id));
		await writeAudit({ organizationId: ctx.guild.id, actorUserId: ctx.user.id, action: 'auction.leave', targetType: 'auction', targetId: row.q.id, detail: { characterId: row.char.id, ign: row.char.ign } });
		return { ok: true };
	},

	/** มอบไอเทมให้คนที่อยู่ในคิว → ปิดคิว */
	award: async (event) => {
		const ctx = await requireGuild(event, ['auction', 'close']);
		const entryId = String((await event.request.formData()).get('entryId'));
		const [row] = await db
			.select({ entry: auctionEntry, q: auction, char: character })
			.from(auctionEntry)
			.innerJoin(auction, eq(auctionEntry.auctionId, auction.id))
			.innerJoin(character, eq(auctionEntry.characterId, character.id))
			.where(and(eq(auctionEntry.id, entryId), eq(auction.organizationId, ctx.guild.id)));
		if (!row || row.q.status !== 'queued') return formError('error.auctionClosed');

		// คิวถาวร: คนที่ได้ไอเทมหลุดจากคิว (ลงใหม่ได้ = ต่อท้าย) คิวยังเปิดอยู่; ข้ามคนแรกได้ตามที่ Officer เลือก
		const removed = await db.transaction(async (tx) => {
			const gone = await tx.delete(auctionEntry).where(eq(auctionEntry.id, row.entry.id)).returning({ id: auctionEntry.id });
			if (!gone.length) return false;
			await tx.insert(auctionAward).values({ auctionId: row.q.id, characterId: row.char.id, ign: row.char.ign, awardedBy: ctx.user.id });
			return true;
		});
		if (!removed) return formError('error.invalid');
		// แจ้งห้องประมูล (ล้มเหลวไม่กระทบการมอบ)
		const [itemRow] = await db.select({ name: auctionItem.name }).from(auction).innerJoin(auctionItem, eq(auction.itemId, auctionItem.id)).where(eq(auction.id, row.q.id));
		void enqueueDiscord({ type: 'auction_award', orgId: ctx.guild.id, item: itemRow?.name ?? '', ign: row.char.ign });
		await writeAudit({ organizationId: ctx.guild.id, actorUserId: ctx.user.id, action: 'auction.award', targetType: 'auction', targetId: row.q.id, detail: { characterId: row.char.id, ign: row.char.ign } });
		return { ok: true };
	},

	/** ส่งรูปคิวประมูลทั้งหมดลงห้องประมูล (ถ้าไม่ได้ตั้งห้องประมูลใช้ห้องรูป) */
	sendDiscord: async (event) => {
		const ctx = await requireGuild(event, ['auction', 'close']);
		const ch = await guildChannels(ctx.guild.id);
		const channelId = ch.auction ?? ch.notify;
		if (!channelId) return formError('error.noChannel');
		const ok = await enqueueDiscord({ type: 'send_image', kind: 'auction', orgId: ctx.guild.id, targetId: ctx.guild.id, channelId });
		if (!ok) return formError('error.discordUnavailable', 503);
		await writeAudit({ organizationId: ctx.guild.id, actorUserId: ctx.user.id, action: 'auction.send_discord', targetType: 'auction' });
		return { ok: true };
	},

	cancelQueue: async (event) => {
		const ctx = await requireGuild(event, ['auction', 'close']);
		const q = await loadQueue(ctx, String((await event.request.formData()).get('auctionId')));
		if (!q || q.status !== 'queued') return formError('error.auctionClosed');
		await db.update(auction).set({ status: 'cancelled', closedBy: ctx.user.id, closedAt: new Date() }).where(eq(auction.id, q.id));
		await writeAudit({ organizationId: ctx.guild.id, actorUserId: ctx.user.id, action: 'auction.cancel', targetType: 'auction', targetId: q.id });
		return { ok: true };
	}
};
