import { HeartPulse, Shield, Sparkles, Swords } from '@lucide/svelte';

/** role ของตัวละคร: สี + ไอคอนเดียวกันทั้งระบบ (ชิปในปาร์ตี้, สรุป, ตารางสมาชิก) */
export const ROLE_ORDER = ['tank', 'dps', 'healer', 'support'] as const;
export type Role = (typeof ROLE_ORDER)[number];

export const ROLE_COLORS: Record<Role, string> = {
	tank: '#e05d5d',
	dps: '#e8912e',
	healer: '#2fb872',
	support: '#4f8bf0'
};

export const ROLE_ICONS = { tank: Shield, dps: Swords, healer: HeartPulse, support: Sparkles } as const;

export const isRole = (v: unknown): v is Role => (ROLE_ORDER as readonly unknown[]).includes(v);
