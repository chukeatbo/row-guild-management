import { can } from '@row/auth/permissions';
import { auditLog, user } from '@row/db';
import { error } from '@sveltejs/kit';
import { and, desc, eq, like, lt, sql } from 'drizzle-orm';
import { db } from '#lib/server/db.ts';
import { requireGuild } from '#lib/server/guard.ts';
import type { PageServerLoad } from './$types';

const PAGE = 50;
/** หมวดของ action (ส่วนก่อนจุด) ใช้เป็นตัวกรอง */
const AUDIT_GROUPS = ['party', 'group', 'event', 'schedule', 'leave', 'auction', 'member', 'character', 'guild'] as const;

export const load: PageServerLoad = async (event) => {
	const ctx = await requireGuild(event);
	if (!ctx.isSuper && !can(ctx.role, 'auditLog', 'read')) error(403, 'forbidden');

	const group = event.url.searchParams.get('group') ?? '';
	const actor = event.url.searchParams.get('actor') ?? '';
	const beforeRaw = event.url.searchParams.get('before');
	const before = beforeRaw && !Number.isNaN(Date.parse(beforeRaw)) ? new Date(beforeRaw) : null;

	const where = and(
		eq(auditLog.organizationId, ctx.guild.id),
		(AUDIT_GROUPS as readonly string[]).includes(group) ? like(auditLog.action, `${group}.%`) : undefined,
		actor ? eq(auditLog.actorUserId, actor) : undefined,
		before ? lt(auditLog.createdAt, before) : undefined
	);

	const [rows, actors] = await Promise.all([
		db
			.select({
				id: auditLog.id,
				action: auditLog.action,
				targetType: auditLog.targetType,
				detail: auditLog.detail,
				createdAt: auditLog.createdAt,
				actorId: auditLog.actorUserId,
				actorName: user.name
			})
			.from(auditLog)
			.leftJoin(user, eq(auditLog.actorUserId, user.id))
			.where(where)
			.orderBy(desc(auditLog.createdAt))
			.limit(PAGE + 1),
		// คนที่เคยทำรายการในกิลด์นี้ (ใช้เป็นตัวเลือกกรอง)
		db
			.selectDistinct({ id: user.id, name: user.name })
			.from(auditLog)
			.innerJoin(user, eq(auditLog.actorUserId, user.id))
			.where(eq(auditLog.organizationId, ctx.guild.id))
			.orderBy(sql`${user.name}`)
			.limit(200)
	]);

	const page = rows.slice(0, PAGE);
	return {
		rows: page.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
		nextBefore: rows.length > PAGE ? page[page.length - 1]!.createdAt.toISOString() : null,
		actors,
		filters: { group, actor, before: before?.toISOString() ?? null },
		groups: AUDIT_GROUPS
	};
};
