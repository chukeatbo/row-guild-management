import { requireRenderToken } from '#lib/server/render.ts';
import { loadAuctionSnapshot } from '#lib/server/snapshot.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	requireRenderToken(url, 'auction', params.org);
	return loadAuctionSnapshot(params.org);
};
