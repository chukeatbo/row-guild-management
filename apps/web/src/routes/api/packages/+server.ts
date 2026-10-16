import { json } from '@sveltejs/kit';
import { listPublicPackages } from '#lib/server/billing.ts';
import type { RequestHandler } from './$types';

/** แพ็กเกจที่เปิดขายและไม่ซ่อน — ข้อมูลสาธารณะ ให้ landing page เรียกได้โดยตรง (ไม่ต้องมี key, เปิด CORS) */
export const GET: RequestHandler = async () =>
	json(
		{ packages: await listPublicPackages() },
		{ headers: { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=60' } }
	);
