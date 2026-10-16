import { landingLangFromPath } from '#lib/landing/content.ts';

/**
 * ธีมแยก 2 ชุด: หน้า landing/กฎหมาย (`site`) กับหน้าระบบ (`app` — login, แดชบอร์ด, render ฯลฯ)
 * แต่ละชุดมี cookie และค่าเริ่มต้นของตัวเอง สลับธีมฝั่งหนึ่งไม่กระทบอีกฝั่ง
 */
export type ThemeScope = 'site' | 'app';
export type ThemePref = 'light' | 'dark' | 'system';

export const THEME_COOKIE: Record<ThemeScope, string> = { site: 'site-theme', app: 'app-theme' };
export const DEFAULT_THEME: Record<ThemeScope, 'light' | 'dark'> = { site: 'light', app: 'dark' };

export const themeScope = (pathname: string): ThemeScope => (landingLangFromPath(pathname) ? 'site' : 'app');

export const isThemePref = (v: unknown): v is ThemePref => v === 'light' || v === 'dark' || v === 'system';

/** ธีมที่ใช้ตอน SSR — `system` ยังไม่รู้ค่าเครื่อง ใช้ค่าเริ่มต้นไปก่อน (inline script ใน app.html แก้ก่อน paint) */
export const ssrTheme = (scope: ThemeScope, pref: string | undefined): 'light' | 'dark' =>
	pref === 'light' || pref === 'dark' ? pref : DEFAULT_THEME[scope];

/* ---------- ฝั่ง client ---------- */

export function readThemePref(scope: ThemeScope): ThemePref {
	const m = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE[scope]}=(light|dark|system)`));
	return (m?.[1] as ThemePref | undefined) ?? DEFAULT_THEME[scope];
}

export function applyTheme(pref: ThemePref) {
	const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
	document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function saveThemePref(scope: ThemeScope, pref: ThemePref) {
	document.cookie = `${THEME_COOKIE[scope]}=${pref}; path=/; max-age=31536000; samesite=lax`;
	applyTheme(pref);
}
