import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * token ลงนามสำหรับ route /render/* (CLAUDE.md ข้อ 6) — ใช้ครั้งเดียวระยะสั้น
 * รูปแบบ: `${exp}.${hmac}` โดย hmac = HMAC-SHA256(secret, `${kind}:${id}:${exp}`)
 * ผูกกับ kind + id จึงเอา token ของ event หนึ่งไปเปิดอีก event ไม่ได้
 */
export type RenderKind = 'event' | 'auction';

const mac = (secret: string, kind: RenderKind, id: string, exp: number) =>
  createHmac('sha256', secret).update(`${kind}:${id}:${exp}`).digest('base64url');

export function signRenderToken(secret: string, kind: RenderKind, id: string, ttlMs = 5 * 60_000, now = Date.now()) {
  const exp = now + ttlMs;
  return `${exp}.${mac(secret, kind, id, exp)}`;
}

export function verifyRenderToken(
  secret: string,
  kind: RenderKind,
  id: string,
  token: string | null | undefined,
  now = Date.now()
): boolean {
  if (!secret || !token) return false;
  const [expRaw, sig] = token.split('.');
  const exp = Number(expRaw);
  if (!sig || !Number.isFinite(exp) || exp < now) return false;
  const want = Buffer.from(mac(secret, kind, id, exp));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}
