import { listPublicPackages } from '#lib/server/billing.ts';
import type { LayoutServerLoad } from './$types';

/** แพ็กเกจที่เปิดขาย (ตาราง packages) — การ์ดราคาบน landing render จากตรงนี้ */
export const load: LayoutServerLoad = async () => ({ packages: await listPublicPackages() });
