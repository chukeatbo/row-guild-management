import { can } from '@row/auth/permissions';
import { requireUser } from '#lib/server/guard.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const ctx = await requireUser(event);
	return {
		isSuper: ctx.isSuper,
		guilds: ctx.guilds.map(({ id, name }) => ({ id, name })),
		guild: ctx.guild ? { id: ctx.guild.id, name: ctx.guild.name } : null,
		role: ctx.role,
		canEditGuild: ctx.isSuper || can(ctx.role, 'guild', 'update')
	};
};
