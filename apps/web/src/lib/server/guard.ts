import { can, isSuperAdmin } from '@row/auth/permissions';
import { getGuildAccess, guildProfile, member, organization, type GuildAccess } from '@row/db';
import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { MessageKey } from '#lib/i18n/index.ts';
import { db } from './db.ts';

export const GUILD_COOKIE = 'guild';

export interface GuildSummary {
	id: string;
	name: string;
	slug: string;
	role: string | null;
}

export interface AppContext {
	user: NonNullable<App.Locals['user']>;
	isSuper: boolean;
	guilds: GuildSummary[];
	/** guild ที่กำลังใช้งาน (null = ยังไม่อยู่ในกิลด์ใดเลย) */
	guild: GuildSummary | null;
	/** role ที่มีผลจริง: Super Admin ถือเป็น owner ของทุกกิลด์ */
	role: string | null;
	/** สิทธิ์ใช้งาน (แพ็กเกจ) ของกิลด์ปัจจุบัน — null = ไม่มีกิลด์ */
	access: GuildAccess | null;
}

/** โหลดบริบทผู้ใช้ + กิลด์ปัจจุบัน (กิลด์เลือกจาก cookie แล้วตรวจกับ membership เสมอ) */
export async function loadContext(event: RequestEvent): Promise<AppContext | null> {
	const user = event.locals.user;
	if (!user) return null;
	const isSuper = isSuperAdmin(user);

	const memberships = await db
		.select({
			id: organization.id,
			name: organization.name,
			slug: organization.slug,
			role: member.role,
			suspended: guildProfile.suspended
		})
		.from(member)
		.innerJoin(organization, eq(member.organizationId, organization.id))
		.leftJoin(guildProfile, eq(guildProfile.organizationId, organization.id))
		.where(eq(member.userId, user.id));

	// กิลด์ที่ถูกระงับ: สมาชิกทั่วไปเข้าไม่ได้ (Super Admin ยังเห็น)
	let guilds: GuildSummary[] = memberships.filter((m) => !m.suspended);
	if (isSuper) {
		const all = await db
			.select({ id: organization.id, name: organization.name, slug: organization.slug })
			.from(organization);
		guilds = all.map((o) => ({ ...o, role: memberships.find((m) => m.id === o.id)?.role ?? null }));
	}

	const wanted = event.cookies.get(GUILD_COOKIE);
	const guild = guilds.find((g) => g.id === wanted) ?? guilds[0] ?? null;
	const role = guild ? (isSuper ? 'owner' : guild.role) : null;
	const access = guild ? await getGuildAccess(db, guild.id) : null;
	return { user, isSuper, guilds, guild, role, access };
}

/** ต้องล็อกอิน — ยังไม่ login พาไปหน้า login แล้วกลับมาหน้าเดิม (`?next=`) */
export async function requireUser(event: RequestEvent): Promise<AppContext> {
	const ctx = await loadContext(event);
	if (!ctx) redirect(303, loginUrl(event.url));
	return ctx;
}

/** หน้า login ที่จะพากลับมา `url` หลัง login (เฉพาะ GET — POST กลับไปหน้าเดิมไม่ได้) */
export function loginUrl(url: URL) {
	const next = url.pathname + url.search;
	return next === '/' || next.startsWith('/login') ? '/login' : `/login?next=${encodeURIComponent(next)}`;
}

/** ต้องอยู่ในกิลด์ และ (ถ้าระบุ) มีสิทธิ์ resource:action */
export async function requireGuild(
	event: RequestEvent,
	permission?: [resource: Parameters<typeof can>[1], action: string]
) {
	const ctx = await requireUser(event);
	if (!ctx.guild) error(403, 'no guild');
	// แพ็กเกจหมดอายุ → ใช้ฟีเจอร์ของกิลด์ไม่ได้ (ข้อมูลยังอยู่) จนกว่าจะต่ออายุ; Super Admin ผ่านเสมอ
	if (!ctx.isSuper && ctx.access?.state === 'expired') redirect(303, '/billing');
	if (permission && !ctx.isSuper && !can(ctx.role, ...permission)) error(403, 'forbidden');
	return { ...ctx, guild: ctx.guild };
}

export async function requireSuperAdmin(event: RequestEvent) {
	const ctx = await requireUser(event);
	if (!ctx.isSuper) error(403, 'forbidden');
	return ctx;
}

/** ส่ง error key (แปลที่ฝั่ง client) กลับจาก form action */
export const formError = (key: MessageKey, status = 400, extra: Record<string, unknown> = {}) =>
	fail(status, { error: key, ...extra });

export const isUniqueViolation = (e: unknown) =>
	typeof e === 'object' &&
	e !== null &&
	('code' in e && (e as { code?: string }).code === '23505' ||
		('cause' in e && (e as { cause?: { code?: string } }).cause?.code === '23505'));
