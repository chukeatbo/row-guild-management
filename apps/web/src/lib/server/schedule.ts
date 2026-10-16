import { eventLeave, eventSchedule, guildEvent } from '@row/db';
import { EVENT_TYPES, type EventType } from '@row/shared';
import { and, eq, sql } from 'drizzle-orm';
import { GUILD_ZONE } from '../datetime.ts';
import { db } from './db.ts';
import { createEventWithLayout } from './events.ts';
import { isUniqueViolation } from './guard.ts';

/** รอบที่เริ่มไปแล้วเกินกี่ชั่วโมงถึงเลื่อนไปรอบถัดไป (ให้หน้าลา/จัดปาร์ตี้ยังใช้ได้ระหว่างวอร์) */
export const ROLLOVER_GRACE_HOURS = 3;

/**
 * ค่าเริ่มต้นของแต่ละประเภท (วัน 0=อาทิตย์): GL อังคาร+พฤหัส, Siege อาทิตย์, Polarity ให้กิลด์ตั้งเอง
 * เวลา 20:00 เป็นแค่ค่าเริ่มต้น — owner ต้องตั้งเวลาจริงที่หน้า Guild
 */
const DEFAULTS: Record<EventType, { weekdays: number[]; enabled: boolean; leaveDeadlineHours: number | null }> = {
	guild_league: { weekdays: [2, 4], enabled: true, leaveDeadlineHours: 2 },
	siege_war: { weekdays: [0], enabled: true, leaveDeadlineHours: 2 },
	polarity_elite: { weekdays: [], enabled: false, leaveDeadlineHours: null }
};

type Schedule = typeof eventSchedule.$inferSelect;
type Event = typeof guildEvent.$inferSelect;

/** ดึงตารางของกิลด์ (สร้างแถวค่าเริ่มต้นให้ถ้ายังไม่มี) เรียงตามประเภท */
export async function getSchedules(organizationId: string): Promise<Schedule[]> {
	await db
		.insert(eventSchedule)
		.values(EVENT_TYPES.map((type) => ({ organizationId, type, ...DEFAULTS[type] })))
		.onConflictDoNothing();
	const rows = await db.select().from(eventSchedule).where(eq(eventSchedule.organizationId, organizationId));
	return EVENT_TYPES.map((t) => rows.find((r) => r.type === t)!);
}

/** รอบถัดไปหลังเวลา `after` — วัน/เวลาตามปฏิทิน Asia/Bangkok; null ถ้าตารางปิดหรือไม่ได้เลือกวัน */
export function nextOccurrence(
	s: Pick<Schedule, 'weekdays' | 'startTime' | 'enabled'>,
	after: Date
): Date | null {
	if (!s.enabled || s.weekdays.length === 0) return null;
	const off = GUILD_ZONE.offsetMinutes * 60_000;
	const local = new Date(after.getTime() + off); // ฟิลด์ UTC ของค่านี้ = เวลาท้องถิ่น Bangkok
	const [hh, mm] = s.startTime.split(':').map(Number) as [number, number];
	for (let d = 0; d <= 7; d++) {
		const day = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + d));
		if (!s.weekdays.includes(day.getUTCDay())) continue;
		const startsAt = new Date(day.getTime() + (hh * 60 + mm) * 60_000 - off);
		if (startsAt > after) return startsAt;
	}
	return null;
}

const deadlineFor = (s: Schedule, startsAt: Date | null) =>
	startsAt && s.leaveDeadlineHours != null ? new Date(startsAt.getTime() - s.leaveDeadlineHours * 3_600_000) : null;

/**
 * เลื่อน event ถาวรไปรอบถัดไป: ตั้ง startsAt/leaveDeadline ใหม่, สถานะกลับเป็น open, ล้างรายการลาของรอบเก่า
 * ปาร์ตี้/หัวหน้า/ล็อกคงเดิม (ผู้ใช้ปรับก่อนแต่ละรอบเอง)
 * onlyIfOver: เลื่อนเฉพาะเมื่อรอบเก่าจบเกิน grace จริง (เช็คใน SQL เดียวกับการ update → เรียกพร้อมกันเลื่อนครั้งเดียว;
 * ไม่ใช้ `starts_at = ค่าเดิม` เพราะ DB เก็บไมโครวินาทีแต่ JS Date มีแค่มิลลิวินาที)
 */
async function advance(ev: Event, s: Schedule, next: Date, onlyIfOver: boolean) {
	await db.transaction(async (tx) => {
		const over = sql`(${guildEvent.startsAt} is null or ${guildEvent.startsAt} + make_interval(hours => ${ROLLOVER_GRACE_HOURS}) < now())`;
		const moved = await tx
			.update(guildEvent)
			.set({ startsAt: next, leaveDeadline: deadlineFor(s, next), status: 'open' })
			.where(and(eq(guildEvent.id, ev.id), onlyIfOver ? over : undefined))
			.returning({ id: guildEvent.id });
		if (moved.length) await tx.delete(eventLeave).where(eq(eventLeave.eventId, ev.id));
	});
}

/**
 * ให้กิลด์มี event ถาวรครบทุกประเภท (ประเภทละ 1) และเลื่อนรอบที่จบแล้วไปรอบถัดไป
 * เรียกตอนเปิดหน้า events / leave / builder (Phase 6: bot เรียกฟังก์ชันเดียวกัน) — ปลอดภัยเมื่อเรียกพร้อมกัน
 */
export async function ensureStandingEvents(organizationId: string, now = new Date()) {
	const schedules = await getSchedules(organizationId);
	const existing = await db.select().from(guildEvent).where(eq(guildEvent.organizationId, organizationId));

	for (const s of schedules) {
		const ev = existing.find((e) => e.type === s.type);
		if (!ev) {
			const startsAt = nextOccurrence(s, now);
			try {
				await createEventWithLayout({
					organizationId,
					type: s.type,
					title: '',
					startsAt,
					leaveDeadline: deadlineFor(s, startsAt),
					status: 'open',
					createdBy: null
				});
			} catch (e) {
				if (!isUniqueViolation(e)) throw e; // มีคนสร้างพร้อมกัน — ข้าม
			}
			continue;
		}
		const over = !ev.startsAt || ev.startsAt.getTime() + ROLLOVER_GRACE_HOURS * 3_600_000 < now.getTime();
		if (over) {
			const next = nextOccurrence(s, now);
			if (next) await advance(ev, s, next, true);
		}
	}
}

/**
 * หลังแก้ตาราง: ย้าย event ไปรอบถัดไปตามตารางใหม่ (ถ้าวันที่เปลี่ยนจึงล้างรายการลา) และอัปเดตเวลาปิดรับลา
 * ตารางที่ปิดอยู่ = ไม่แตะวันที่ (ผู้ใช้กำหนดเอง)
 */
export async function applyScheduleChange(s: Schedule, now = new Date()) {
	const [ev] = await db
		.select()
		.from(guildEvent)
		.where(and(eq(guildEvent.organizationId, s.organizationId), eq(guildEvent.type, s.type)));
	if (!ev) return ensureStandingEvents(s.organizationId, now);
	const next = nextOccurrence(s, now);
	if (!next) return;
	if (ev.startsAt?.getTime() === next.getTime())
		await db.update(guildEvent).set({ leaveDeadline: deadlineFor(s, next) }).where(eq(guildEvent.id, ev.id));
	else await advance(ev, s, next, false);
}
