import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => ({
	locale: locals.locale,
	tz: locals.tz,
	user: locals.user ? { name: locals.user.name, image: locals.user.image ?? null } : null
});
