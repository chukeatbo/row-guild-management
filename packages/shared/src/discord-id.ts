/**
 * ดึง ID ของ Discord จากสิ่งที่ผู้ใช้วาง: ID ล้วน, ลิงก์ https://discord.com/channels/<server>/<channel>
 * (ได้จาก "คัดลอกลิงก์" ของห้อง) หรือ mention <#channel>
 * part: ช่อง "server" เอาส่วนเซิร์ฟเวอร์ของลิงก์, ช่อง "channel" เอาส่วนห้อง
 * คืนข้อความเดิม (trim) ถ้าไม่เข้ารูปแบบใดเลย ให้ผู้เรียกตรวจต่อด้วย isDiscordId
 */
export function extractDiscordId(raw: string, part: 'server' | 'channel'): string {
  const s = raw.trim();
  const link = s.match(/discord(?:app)?\.com\/channels\/(\d+|@me)(?:\/(\d+))?/i);
  if (link) return part === 'server' ? link[1]! : (link[2] ?? s);
  const mention = s.match(/^<#(\d+)>$/);
  return mention ? mention[1]! : s;
}

/** server ID จากลิงก์ห้อง (ใช้เติมช่อง server ให้อัตโนมัติ) — ไม่ใช่ลิงก์ห้อง → null */
export function serverIdFromChannelLink(raw: string): string | null {
  const m = raw.trim().match(/discord(?:app)?\.com\/channels\/(\d+)\/\d+/i);
  return m ? m[1]! : null;
}

export const isDiscordId = (s: string) => /^\d{15,22}$/.test(s);
