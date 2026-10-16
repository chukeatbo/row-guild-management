import { guildEvent } from '@row/db';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db.ts';
import { requireRenderToken } from '#lib/server/render.ts';
import { loadEventSnapshot } from '#lib/server/snapshot.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	requireRenderToken(url, 'event', params.id);
	const [ev] = await db.select().from(guildEvent).where(eq(guildEvent.id, params.id)).limit(1);
	if (!ev) error(404);
	const f = url.searchParams.get('field');
	return loadEventSnapshot(ev, f === 'main' || f === 'sub' ? f : null);
};
