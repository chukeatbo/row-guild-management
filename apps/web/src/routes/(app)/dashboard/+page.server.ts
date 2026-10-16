import { loadContext } from '#lib/server/guard.ts';
import { getDiscordId, listCharacters, listPlayers } from '#lib/server/queries.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = (await loadContext(event))!; // (app)/+layout.server.ts รับรองว่าล็อกอินแล้ว
	if (!ctx.guild) {
		return { empty: true as const, discordId: await getDiscordId(ctx.user.id), name: ctx.user.name };
	}

	const [characters, players] = await Promise.all([
		listCharacters(ctx.guild.id),
		listPlayers(ctx.guild.id)
	]);

	const byClass = new Map<string, { label: string; value: number; color: string | null }>();
	const byRole: Record<string, number> = { tank: 0, dps: 0, healer: 0, support: 0 };
	for (const c of characters) {
		const key = c.className ?? '—';
		const row = byClass.get(key) ?? { label: key, value: 0, color: c.classColor };
		row.value++;
		byClass.set(key, row);
		if (c.role) byRole[c.role]!++;
	}

	return {
		empty: false as const,
		name: ctx.user.name,
		total: characters.length,
		players: players.length,
		unlinked: characters.filter((c) => !c.userId).length,
		byRole,
		classes: [...byClass.values()].sort((a, b) => b.value - a.value)
	};
};
