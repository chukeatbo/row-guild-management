import { error } from '@sveltejs/kit';
import { verifyRenderToken, type RenderKind } from '@row/shared/render-token';

/** route /render/* ไม่มี session — ต้องมี token ลงนามจาก bot (RENDER_SECRET) ที่ผูกกับ kind+id (CLAUDE.md ข้อ 6) */
export function requireRenderToken(url: URL, kind: RenderKind, id: string) {
	const secret = process.env.RENDER_SECRET ?? '';
	if (!secret || secret === 'change-me' || !verifyRenderToken(secret, kind, id, url.searchParams.get('token')))
		error(403, 'forbidden');
}

/** ตรวจ bot เรียก endpoint ภายใน: Authorization: Bearer RENDER_SECRET */
export function isInternalCall(request: Request) {
	const secret = process.env.RENDER_SECRET ?? '';
	if (!secret || secret === 'change-me') return false;
	return request.headers.get('authorization') === `Bearer ${secret}`;
}
