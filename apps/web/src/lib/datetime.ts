import { htmlLang, type Locale } from './i18n/index';

/**
 * DB เก็บ UTC เสมอ; การแสดงผลและช่องกรอกเวลาใช้ "โซนเวลาของเครื่องผู้ใช้" (IANA เช่น Asia/Bangkok)
 * ไคลเอนต์อ่านจาก Intl แล้วเก็บ cookie `tz` ให้ server ใช้ตอน SSR/ตีความฟอร์ม
 * รองรับ DST และ offset ครึ่งชั่วโมง เพราะคำนวณ offset ตามวันที่นั้นจริง
 */
export const FALLBACK_TZ = 'UTC';

/** เวลา Asia/Bangkok ใช้เป็น "โซนของกิลด์" สำหรับตารางสร้าง event อัตโนมัติ (ไม่มี DST) */
export const GUILD_ZONE = { tz: 'Asia/Bangkok', offsetMinutes: 420 } as const;

const pad = (n: number) => String(n).padStart(2, '0');

export function isValidTimeZone(tz: unknown): tz is string {
	if (typeof tz !== 'string' || !tz) return false;
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: tz });
		return true;
	} catch {
		return false;
	}
}

/** โซนเวลาของเครื่องนี้ (เรียกฝั่ง client เท่านั้น) */
export const deviceTimeZone = () =>
	Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TZ;

/** offset (นาที) ของโซน tz ณ เวลา d — บวกคือเร็วกว่า UTC */
export function offsetMinutesAt(d: Date, tz: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: tz,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	}).formatToParts(d);
	const p = Object.fromEntries(parts.map((x) => [x.type, Number(x.value)])) as Record<string, number>;
	const asUtc = Date.UTC(p.year!, p.month! - 1, p.day!, p.hour!, p.minute!, p.second!);
	return Math.round((asUtc - Math.floor(d.getTime() / 1000) * 1000) / 60000);
}

export function offsetLabel(offsetMinutes: number): string {
	if (offsetMinutes === 0) return 'UTC';
	const sign = offsetMinutes > 0 ? '+' : '-';
	const abs = Math.abs(offsetMinutes);
	const h = Math.floor(abs / 60);
	const m = abs % 60;
	return `UTC${sign}${h}${m ? ':' + pad(m) : ''}`;
}

/** 'UTC+7' ณ เวลา d */
export const tzOffsetLabel = (tz: string, d: Date = new Date()) => offsetLabel(offsetMinutesAt(d, tz));

/** ข้อความบอกโซน เช่น 'Asia/Bangkok (UTC+7)' (ใช้ในฟอร์ม) */
export function zoneNote(tz: string, d: Date = new Date()): string {
	const off = tzOffsetLabel(tz, d);
	return tz === 'UTC' ? 'UTC' : `${tz.replaceAll('_', ' ')} (${off})`;
}

/** '21 ต.ค. 2569 21:00 (UTC+7)' — เขียนโซนเวลากำกับเสมอ (offset ตามวันที่ของ event) */
export function formatDateTime(d: Date | string, locale: Locale, tz: string): string {
	const date = new Date(d);
	const text = new Intl.DateTimeFormat(htmlLang(locale), {
		timeZone: tz,
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(date);
	return `${text} (${tzOffsetLabel(tz, date)})`;
}

/** Date → ค่าสำหรับ <input type=datetime-local> ในโซน tz */
export function toInput(d: Date | string | null | undefined, tz: string): string {
	if (!d) return '';
	const date = new Date(d);
	const local = new Date(date.getTime() + offsetMinutesAt(date, tz) * 60_000);
	return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}

/** '2026-10-17T20:00' (จาก datetime-local ในโซน tz) → Date (UTC); คำนวณสองรอบเพื่อให้ถูกต้องข้ามรอยต่อ DST */
export function fromInput(value: string, tz: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
	if (!m) return null;
	const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
	const wall = Date.UTC(y, mo - 1, d, h, mi);
	if (Number.isNaN(wall)) return null;
	const off1 = offsetMinutesAt(new Date(wall), tz);
	const guess = wall - off1 * 60_000;
	const off2 = offsetMinutesAt(new Date(guess), tz);
	return new Date(wall - off2 * 60_000);
}

/** ชื่อวันในสัปดาห์ตามภาษา (0=อาทิตย์) */
export function weekdayName(day: number, locale: Locale, style: 'short' | 'long' = 'short'): string {
	// 2023-01-01 เป็นวันอาทิตย์
	return new Intl.DateTimeFormat(htmlLang(locale), { weekday: style, timeZone: 'UTC' }).format(
		new Date(Date.UTC(2023, 0, 1 + day))
	);
}

/** ชื่อที่แสดงของ event: ถ้า title ว่างใช้ชื่อประเภทตามภาษา */
export const eventLabel = (e: { title: string; type: string }, typeName: (type: string) => string) =>
	e.title.trim() || typeName(e.type);
