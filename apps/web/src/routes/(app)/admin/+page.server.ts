import { boss, gameClass, guildProfile, guildSubscription, member, organization } from '@row/db';
import { asc, count, eq, max } from 'drizzle-orm';
import { writeAudit } from '#lib/server/audit.ts';
import { db } from '#lib/server/db.ts';
import { formError, isUniqueViolation, requireSuperAdmin } from '#lib/server/guard.ts';
import { findUserByDiscordId, listClasses } from '#lib/server/queries.ts';
import { classSchema, createGuildSchema, formToObject, simpleMasterSchema } from '#lib/schemas.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	await requireSuperAdmin(event);
	const [classes, bosses, guilds] = await Promise.all([
		listClasses(),
		db.select().from(boss).orderBy(asc(boss.name)),
		db
			.select({
				id: organization.id,
				name: organization.name,
				slug: organization.slug,
				suspended: guildProfile.suspended,
				billingExempt: guildProfile.billingExempt,
				members: count(member.id)
			})
			.from(organization)
			.leftJoin(guildProfile, eq(guildProfile.organizationId, organization.id))
			.leftJoin(member, eq(member.organizationId, organization.id))
			.groupBy(organization.id, guildProfile.suspended, guildProfile.billingExempt)
			.orderBy(asc(organization.name))
	]);
	// วันหมดอายุของแพ็กเกจแต่ละกิลด์ (ปลายสุดของสิทธิ์ที่ active) — กิลด์ billing_exempt ไม่ต้องใช้
	const subs = await db
		.select({ orgId: guildSubscription.organizationId, endsAt: max(guildSubscription.endsAt) })
		.from(guildSubscription)
		.where(eq(guildSubscription.status, 'active'))
		.groupBy(guildSubscription.organizationId);
	const ends = new Map(subs.map((r) => [r.orgId, r.endsAt?.toISOString() ?? null]));
	return { classes, bosses, guilds: guilds.map((g) => ({ ...g, planEndsAt: ends.get(g.id) ?? null, hasPlan: ends.has(g.id) })) };
};

const idOf = (fd: FormData) => ((fd.get('id') as string) || undefined);

export const actions: Actions = {
	saveClass: async (event) => {
		const ctx = await requireSuperAdmin(event);
		const fd = await event.request.formData();
		const parsed = classSchema.safeParse(formToObject(fd, ['active']));
		if (!parsed.success) return formError('error.invalid');
		const id = idOf(fd);
		try {
			if (id) await db.update(gameClass).set(parsed.data).where(eq(gameClass.id, id));
			else await db.insert(gameClass).values(parsed.data);
		} catch (e) {
			if (isUniqueViolation(e)) return formError('error.duplicate');
			throw e;
		}
		await writeAudit({ organizationId: null, actorUserId: ctx.user.id, action: id ? 'master.class_update' : 'master.class_create', targetType: 'game_class', targetId: id, detail: parsed.data });
		return { ok: true };
	},

	saveBoss: async (event) => {
		const ctx = await requireSuperAdmin(event);
		const fd = await event.request.formData();
		const parsed = simpleMasterSchema.safeParse(formToObject(fd, ['active']));
		if (!parsed.success) return formError('error.invalid');
		const id = idOf(fd);
		try {
			if (id) await db.update(boss).set(parsed.data).where(eq(boss.id, id));
			else await db.insert(boss).values(parsed.data);
		} catch (e) {
			if (isUniqueViolation(e)) return formError('error.duplicate');
			throw e;
		}
		await writeAudit({ organizationId: null, actorUserId: ctx.user.id, action: id ? 'master.boss_update' : 'master.boss_create', targetType: 'boss', targetId: id, detail: parsed.data });
		return { ok: true };
	},

	createGuild: async (event) => {
		const ctx = await requireSuperAdmin(event);
		const parsed = createGuildSchema.safeParse(formToObject(await event.request.formData()));
		if (!parsed.success) return formError('error.invalid');
		const { name, slug, ownerDiscordId } = parsed.data;

		let ownerId = ctx.user.id;
		if (ownerDiscordId) {
			const owner = await findUserByDiscordId(ownerDiscordId);
			if (!owner) return formError('error.userNotFound');
			ownerId = owner.id;
		}

		const orgId = crypto.randomUUID();
		try {
			await db.transaction(async (tx) => {
				await tx.insert(organization).values({ id: orgId, name, slug, createdAt: new Date() });
				await tx.insert(member).values({ id: crypto.randomUUID(), organizationId: orgId, userId: ownerId, role: 'owner', createdAt: new Date() });
				await tx.insert(guildProfile).values({ organizationId: orgId, billingExempt: true }); // Super Admin สร้าง = ใช้ได้ไม่จำกัด
			});
		} catch (e) {
			if (isUniqueViolation(e)) return formError('error.duplicate');
			throw e;
		}
		await writeAudit({ organizationId: orgId, actorUserId: ctx.user.id, action: 'guild.create', targetType: 'organization', targetId: orgId, detail: { name, slug, ownerId } });
		return { ok: true };
	},

	/** สลับ "ใช้ได้ไม่จำกัด" (ไม่ต้องมีแพ็กเกจ) ของกิลด์ */
	toggleExempt: async (event) => {
		const ctx = await requireSuperAdmin(event);
		const orgId = idOf(await event.request.formData());
		if (!orgId) return formError('error.invalid');
		const [row] = await db.select().from(guildProfile).where(eq(guildProfile.organizationId, orgId));
		const billingExempt = !(row?.billingExempt ?? false);
		await db
			.insert(guildProfile)
			.values({ organizationId: orgId, billingExempt })
			.onConflictDoUpdate({ target: guildProfile.organizationId, set: { billingExempt } });
		await writeAudit({ organizationId: orgId, actorUserId: ctx.user.id, action: billingExempt ? 'guild.billing_exempt' : 'guild.billing_unexempt', targetType: 'organization', targetId: orgId });
		return { ok: true };
	},

	toggleSuspend: async (event) => {
		const ctx = await requireSuperAdmin(event);
		const orgId = idOf(await event.request.formData());
		if (!orgId) return formError('error.invalid');
		const [row] = await db.select().from(guildProfile).where(eq(guildProfile.organizationId, orgId));
		const suspended = !(row?.suspended ?? false);
		await db
			.insert(guildProfile)
			.values({ organizationId: orgId, suspended })
			.onConflictDoUpdate({ target: guildProfile.organizationId, set: { suspended } });
		await writeAudit({ organizationId: orgId, actorUserId: ctx.user.id, action: suspended ? 'guild.suspend' : 'guild.unsuspend', targetType: 'organization', targetId: orgId });
		return { ok: true };
	}
};
