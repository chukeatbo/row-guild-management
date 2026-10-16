import { building } from '$app/env';
import type { Handle } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { auth } from '#lib/server/auth.ts';
import { FALLBACK_TZ, isValidTimeZone } from '#lib/datetime.ts';
import { detectLocale, htmlLang, isLocale } from '#lib/i18n/index.ts';

export const handle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	event.locals.session = session?.session ?? null;
	event.locals.user = session?.user ?? null;

	const cookieLocale = event.cookies.get('locale');
	event.locals.locale = isLocale(cookieLocale)
		? cookieLocale
		: detectLocale(event.request.headers.get('accept-language'));
	// โซนเวลาของเครื่องผู้ใช้ (client ตั้ง cookie ให้) — ไม่มี/ไม่ถูกต้อง = UTC
	const tzCookie = event.cookies.get('tz');
	event.locals.tz = isValidTimeZone(tzCookie) ? tzCookie : FALLBACK_TZ;
	const theme = event.cookies.get('theme') === 'dark' ? 'dark' : 'light';

	return svelteKitHandler({
		auth,
		event,
		building,
		resolve: (e) =>
			resolve(e, {
				transformPageChunk: ({ html }) =>
					html
						.replace('%lang%', htmlLang(event.locals.locale))
						.replace('%theme%', theme)
			})
	});
};
