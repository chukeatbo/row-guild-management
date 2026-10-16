import { auctionItem, boss, gameClass, guildProfile, member, organization } from '@row/db';
import { asc, count, eq } from 'drizzle-orm';
import { writeAudit } from '#lib/server/audit.ts';
import { db } from '#lib/server/db.ts';
import { formError, isUniqueViolation, requireSuperAdmin } from '#lib/server/guard.ts';
import { findUserByDiscordId, listClasses } from '#lib/server/queries.ts';
import { classSchema, createGuildSchema, formToObject, simpleMasterSchema } from '#lib/schemas.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	await requireSuperAdmin(event);
	const [classes, bosses, items, guilds] = await Promise.all([
		listClasses(),
		db.select().from(boss).orderBy(asc(boss.name)),
		db.select().from(auctionItem).orderBy(asc(auctionItem.name)),
		db
			.select({
				id: organization.id,
				name: organization.name,
				slug: organization.slug,
				suspended: guildProfile.suspended,
				members: count(member.id)
			})
			.from(organization)
			.leftJoin(guildProfile, eq(guildProfile.organizationId, organization.id))
			.leftJoin(member, eq(member.organizationId, organization.id))
			.groupBy(organization.id, guildProfile.suspended)
			.orderBy(asc(organization.name))
	]);
	return { classes, bosses, items, guilds };
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

	saveItem: async (event) => {
		const ctx = await requireSuperAdmin(event);
		const fd = await event.request.formData();
		const parsed = simpleMasterSchema.safeParse(formToObject(fd, ['active']));
		if (!parsed.success) return formError('error.invalid');
		const id = idOf(fd);
		try {
			if (id) await db.update(auctionItem).set(parsed.data).where(eq(auctionItem.id, id));
			else await db.insert(auctionItem).values(parsed.data);
		} catch (e) {
			if (isUniqueViolation(e)) return formError('error.duplicate');
			throw e;
		}
		await writeAudit({ organizationId: null, actorUserId: ctx.user.id, action: id ? 'master.item_update' : 'master.item_create', targetType: 'auction_item', targetId: id, detail: parsed.data });
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
				await tx.insert(guildProfile).values({ organizationId: orgId });
			});
		} catch (e) {
			if (isUniqueViolation(e)) return formError('error.duplicate');
			throw e;
		}
		await writeAudit({ organizationId: orgId, actorUserId: ctx.user.id, action: 'guild.create', targetType: 'organization', targetId: orgId, detail: { name, slug, ownerId } });
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
