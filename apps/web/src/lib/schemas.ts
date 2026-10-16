import { CLASS_ROLES, EVENT_STATUSES, EVENT_TYPES, extractDiscordId, isDiscordId } from '@row/shared';
import { z } from 'zod';
import { fromInput } from './datetime';

/** ช่องตัวเลขจากฟอร์ม: '' → undefined */
const optInt = (min: number, max: number) =>
	z.preprocess(
		(v) => (v === '' || v === null || v === undefined ? undefined : v),
		z.coerce.number().int().min(min).max(max).optional()
	);

/** ช่องข้อความ optional: '' → undefined */
const optText = (max: number) =>
	z.preprocess(
		(v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
		z.string().trim().max(max).optional()
	);

/** ช่อง server/channel ID ของกิลด์: รับ ID หรือลิงก์ที่คัดลอกมา (ว่างได้) → เก็บเป็น ID ล้วน */
const discordRef = (part: 'server' | 'channel') =>
	z.preprocess(
		(v) => (typeof v === 'string' ? (v.trim() === '' ? undefined : extractDiscordId(v, part)) : v),
		z.string().refine(isDiscordId).optional()
	);

export const discordIdSchema = z.string().trim().regex(/^\d{15,22}$/);

export const characterSchema = z.object({
	ign: z.string().trim().min(1).max(40),
	classId: optText(64),
	level: optInt(1, 300),
	combatPower: optInt(0, 100_000_000),
	note: optText(300),
	/** role ที่เลือกเอง; '' = ตามอาชีพ (เก็บเป็น null) */
	role: z.preprocess((v) => (v === '' || v === undefined ? null : v), z.enum(CLASS_ROLES).nullable()),
	discordId: z.preprocess(
		(v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
		discordIdSchema.optional()
	)
});

export const nameSchema = z.string().trim().min(1).max(60);
export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const classSchema = z.object({
	name: nameSchema,
	role: z.enum(CLASS_ROLES),
	color: hexColor,
	active: z.boolean()
});

export const simpleMasterSchema = z.object({ name: nameSchema, active: z.boolean() });

export const guildProfileSchema = z.object({
	name: nameSchema,
	description: optText(1000),
	server: optText(60),
	discordGuildId: discordRef('server'),
	notifyChannelId: discordRef('channel'),
	imageGlMainChannelId: discordRef('channel'),
	imageGlSubChannelId: discordRef('channel'),
	imageSiegeChannelId: discordRef('channel'),
	imagePolarityChannelId: discordRef('channel'),
	auctionChannelId: discordRef('channel')
});

/** ผู้ใช้สร้างกิลด์เอง (ทดลองใช้ / หลังชำระเงิน) — slug สร้างให้อัตโนมัติ */
export const newGuildSchema = z.object({
	name: nameSchema,
	server: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().max(60).optional())
});

export const createGuildSchema = z.object({
	name: nameSchema,
	slug: z
		.string()
		.trim()
		.toLowerCase()
		.regex(/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/),
	ownerDiscordId: z.preprocess(
		(v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
		discordIdSchema.optional()
	)
});

export const ASSIGNABLE_ROLES = ['officer', 'leader', 'member'] as const;

/** อ่าน FormData เป็น object (checkbox → boolean ผ่าน key ที่ระบุ) */
export function formToObject(fd: FormData, booleans: string[] = []) {
	const obj: Record<string, unknown> = Object.fromEntries(fd);
	for (const key of booleans) obj[key] = fd.get(key) === 'on';
	return obj;
}

/** วันเวลาจากฟอร์ม ตีความตามโซนเวลาของเครื่องผู้ใช้ (cookie tz) */
const zonedDate = (tz: string) =>
	z.string().transform((v, ctx) => {
		const d = fromInput(v, tz);
		if (!d) ctx.addIssue({ code: 'custom', message: 'invalid datetime' });
		return d as Date;
	});

/** title ว่างได้ = ใช้ชื่อประเภทตามภาษาของผู้ดู */
export const eventSchemaFor = (tz: string) =>
	z.object({
		type: z.enum(EVENT_TYPES),
		title: z.string().trim().max(80),
		startsAt: z.preprocess((v) => (v === '' ? undefined : v), zonedDate(tz).optional()),
		leaveDeadline: z.preprocess((v) => (v === '' ? undefined : v), zonedDate(tz).optional()),
		status: z.enum(EVENT_STATUSES).default('open')
	});

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const scheduleSchema = z.object({
	type: z.enum(EVENT_TYPES),
	weekdays: z.array(z.coerce.number().int().min(0).max(6)).transform((a) => [...new Set(a)].sort()),
	startTime: z.string().regex(HHMM),
	leaveDeadlineHours: optInt(0, 336),
	enabled: z.boolean()
});

export const layoutSchema = z.array(
	z.object({ partyId: z.string().min(1), characterIds: z.array(z.string().min(1)).max(40) })
);
