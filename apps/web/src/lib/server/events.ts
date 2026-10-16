import { character, guildEvent, party, partyGroup, partySlot } from '@row/db';
import { EVENT_PRESETS, type EventConfig, type EventType } from '@row/shared';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from './db.ts';

type GroupPlan = { name: string; field: string | null; lane: string | null; parties: number };

const letter = (i: number) => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '');

/**
 * Layout เริ่มต้นของแต่ละประเภท (แก้ไขได้ภายหลังใน builder)
 * - GL: สนามบน 3 group (เลน บน/กลาง/ล่าง) x 4 ปาร์ตี้ = 12; สนามล่าง 18 ปาร์ตี้ (~90 คน) = 8 + 8 + 2
 * - Polarity: ไม่มี group — ปาร์ตี้ย่อย 10 ปาร์ตี้ (50 คน) อยู่ในกลุ่มซ่อน 1 อัน (UI ซ่อนชั้น group)
 * - Siege: 1 group ว่าง ให้ user เพิ่มเอง
 */
export function presetPlan(type: EventType): GroupPlan[] {
	switch (type) {
		case 'guild_league':
			return [
				{ name: 'A', field: 'main', lane: 'top', parties: 4 },
				{ name: 'B', field: 'main', lane: 'mid', parties: 4 },
				{ name: 'C', field: 'main', lane: 'bottom', parties: 4 },
				{ name: 'D', field: 'sub', lane: 'top', parties: 8 },
				{ name: 'E', field: 'sub', lane: 'mid', parties: 8 },
				{ name: 'F', field: 'sub', lane: 'bottom', parties: 2 }
			];
		case 'polarity_elite':
			return [
				{ name: 'A', field: null, lane: null, parties: 10 }
			];
		case 'siege_war':
			return [{ name: 'A', field: null, lane: null, parties: 8 }];
	}
}

export const presetConfig = (type: EventType): EventConfig => structuredClone(EVENT_PRESETS[type]);

/** สร้าง group + party ตาม plan ใน transaction เดียวกับ event */
export async function createEventWithLayout(
	values: Omit<typeof guildEvent.$inferInsert, 'id' | 'config'>
) {
	return db.transaction(async (tx) => {
		const [event] = await tx
			.insert(guildEvent)
			.values({ ...values, config: presetConfig(values.type) })
			.returning();
		const plan = presetPlan(values.type);
		for (const [gi, g] of plan.entries()) {
			const [group] = await tx
				.insert(partyGroup)
				.values({ eventId: event!.id, name: g.name, field: g.field, lane: g.lane, position: gi })
				.returning({ id: partyGroup.id });
			if (g.parties > 0) {
				await tx.insert(party).values(
					Array.from({ length: g.parties }, (_, pi) => ({
						eventId: event!.id,
						groupId: group!.id,
						name: `P${pi + 1}`,
						position: pi
					}))
				);
			}
		}
		return event!;
	});
}

export { letter as groupLetter };

/** ตัวละครของ user ในกิลด์ — ใช้เช็คว่าเป็นหัวหน้าปาร์ตี้ไหม */
export async function myCharacterIds(organizationId: string, userId: string) {
	const rows = await db
		.select({ id: character.id })
		.from(character)
		.where(and(eq(character.organizationId, organizationId), eq(character.userId, userId)));
	return new Set(rows.map((r) => r.id));
}

export async function loadEvent(organizationId: string, eventId: string) {
	const [event] = await db
		.select()
		.from(guildEvent)
		.where(and(eq(guildEvent.id, eventId), eq(guildEvent.organizationId, organizationId)))
		.limit(1);
	return event ?? null;
}

export async function countAssigned(eventIds: string[]) {
	if (!eventIds.length) return new Map<string, number>();
	const rows = await db
		.select({ eventId: partySlot.eventId })
		.from(partySlot)
		.where(inArray(partySlot.eventId, eventIds));
	const m = new Map<string, number>();
	for (const r of rows) m.set(r.eventId, (m.get(r.eventId) ?? 0) + 1);
	return m;
}
