import { getContext, setContext } from 'svelte';
import { en, type MessageKey, type Messages } from './messages/en';
import { fil } from './messages/fil';
import { id } from './messages/id';
import { th } from './messages/th';
import { zh } from './messages/zh';

export type { MessageKey };

export const LOCALES = [
	{ code: 'th', label: 'ไทย', htmlLang: 'th' },
	{ code: 'en', label: 'English', htmlLang: 'en' },
	{ code: 'fil', label: 'Filipino', htmlLang: 'fil' },
	{ code: 'id', label: 'Bahasa Indonesia', htmlLang: 'id' },
	{ code: 'zh', label: '简体中文', htmlLang: 'zh-CN' }
] as const;

export type Locale = (typeof LOCALES)[number]['code'];
export const DEFAULT_LOCALE: Locale = 'th';

const dictionaries: Record<Locale, Messages> = { th, en, fil, id, zh };

export const isLocale = (v: unknown): v is Locale => LOCALES.some((l) => l.code === v);
export const htmlLang = (l: Locale) => LOCALES.find((x) => x.code === l)!.htmlLang;

/** เลือกภาษาจาก Accept-Language (ใช้เมื่อยังไม่มี cookie) */
export function detectLocale(acceptLanguage: string | null): Locale {
	for (const part of (acceptLanguage ?? '').split(',')) {
		const tag = part.split(';')[0]!.trim().toLowerCase();
		const base = tag.split('-')[0];
		if (base === 'tl' || base === 'fil') return 'fil';
		if (base === 'in') return 'id';
		if (isLocale(base)) return base;
	}
	return DEFAULT_LOCALE;
}

export function translate(
	locale: Locale,
	key: MessageKey,
	params?: Record<string, string | number>
): string {
	let text = dictionaries[locale][key] ?? en[key] ?? key;
	if (params) for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, String(v));
	return text;
}

// ---- Svelte context: ใช้ getter เพื่อให้ reactive เมื่อเปลี่ยนภาษา ----
const KEY = Symbol('locale');

export function provideLocale(get: () => Locale) {
	setContext(KEY, get);
}

export function useLocale(): () => Locale {
	return getContext<() => Locale>(KEY);
}

export function useT() {
	const get = useLocale();
	return (key: MessageKey, params?: Record<string, string | number>) =>
		translate(get(), key, params);
}
