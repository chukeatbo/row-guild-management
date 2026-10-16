import { auction, auctionEntry, auctionItem, eventLeave, guildEvent, party, partyGroup, partySlot } from '@row/db';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from './db.ts';
import { listCharacters } from './queries.ts';

/** ข้อมูลปาร์ตี้ของ event แบบอ่านอย่างเดียว (ใช้กับหน้า render ที่แคปเป็นรูป) */
export async function loadEventSnapshot(ev: typeof guildEvent.$inferSelect, field: 'main' | 'sub' | null = null) {
	const [groups, parties, slots, leaves, characters] = await Promise.all([
		db.select().from(partyGroup).where(eq(partyGroup.eventId, ev.id)).orderBy(asc(partyGroup.position)),
		db.select().from(party).where(eq(party.eventId, ev.id)).orderBy(asc(party.position)),
		db.select().from(partySlot).where(eq(partySlot.eventId, ev.id)).orderBy(asc(partySlot.slotIndex)),
		db.select({ characterId: eventLeave.characterId }).from(eventLeave).where(eq(eventLeave.eventId, ev.id)),
		listCharacters(ev.organizationId)
	]);
	const byId = new Map(characters.map((c) => [c.id, c]));
	const membersOf = new Map<string, string[]>();
	for (const s of slots) membersOf.set(s.partyId, [...(membersOf.get(s.partyId) ?? []), s.characterId]);

	return {
		event: {
			type: ev.type,
			title: ev.title,
			startsAt: ev.startsAt?.toISOString() ?? null,
			config: ev.config
		},
		field,
		groups: groups
			.filter((g) => !field || g.field === field)
			.map((g) => ({
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
					members: (membersOf.get(p.id) ?? []).flatMap((cid) => {
						const c = byId.get(cid);
						return c ? [{ id: c.id, ign: c.ign, className: c.className, classColor: c.classColor, role: c.role }] : [];
					})
				}))
		})),
		onLeave: leaves.flatMap((l) => {
			const c = byId.get(l.characterId);
			return c ? [{ id: c.id, ign: c.ign, className: c.className, classColor: c.classColor, role: c.role }] : [];
		})
	};
}

/** คิวประมูลที่เปิดอยู่ของกิลด์ + ประวัติการมอบล่าสุด (อ่านอย่างเดียว) */
export async function loadAuctionSnapshot(organizationId: string) {
	const open = await db
		.select({ id: auction.id, itemName: auctionItem.name })
		.from(auction)
		.innerJoin(auctionItem, eq(auction.itemId, auctionItem.id))
		.where(and(eq(auction.organizationId, organizationId), eq(auction.status, 'queued')))
		.orderBy(asc(auction.createdAt));
	const entries = open.length
		? await db
				.select({ auctionId: auctionEntry.auctionId, characterId: auctionEntry.characterId })
				.from(auctionEntry)
				.where(inArray(auctionEntry.auctionId, open.map((o) => o.id)))
				.orderBy(asc(auctionEntry.createdAt), asc(auctionEntry.id))
		: [];
	const characters = await listCharacters(organizationId);
	const byId = new Map(characters.map((c) => [c.id, c]));
	return {
		queues: open.map((o) => ({
			id: o.id,
			itemName: o.itemName,
			entries: entries
				.filter((e) => e.auctionId === o.id)
				.flatMap((e) => {
					const c = byId.get(e.characterId);
					return c ? [{ id: c.id, ign: c.ign, className: c.className, classColor: c.classColor }] : [];
				})
		}))
	};
}
