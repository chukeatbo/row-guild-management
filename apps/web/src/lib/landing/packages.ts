import type { Lang } from '#lib/landing/content.ts';

/** แพ็กเกจที่ landing ได้จาก `(marketing)/+layout.server.ts` (= listPublicPackages ใน lib/server/billing.ts) */
export interface LandingPackage {
	code: string;
	name: string;
	description: string | null;
	translations: Record<string, { name?: string; description?: string; features?: string[] }> | null;
	priceSatang: number;
	currency: string;
	durationDays: number | null;
	features: string[];
	isTrial: boolean;
	isFeatured: boolean;
}

/** ชื่อ/คำอธิบาย/ฟีเจอร์ตามภาษา — ไม่มีคำแปลภาษานั้นใช้ค่าหลัก (อังกฤษ) */
export function localizePackage(p: LandingPackage, lang: Lang) {
	const tr = p.translations?.[lang];
	return {
		name: tr?.name || p.name,
		description: tr?.description || p.description || '',
		features: tr?.features?.length ? tr.features : p.features
	};
}
