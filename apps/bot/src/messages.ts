// ข้อความที่ bot โพสต์ลง Discord (ภาษาไทย — ภาษาของกิลด์)
const TYPE_LABEL: Record<string, string> = {
  guild_league: 'Guild League',
  siege_war: 'Siege War',
  polarity_elite: 'Polarity Zone'
};

export const eventName = (e: { type: string; title: string }) => e.title || TYPE_LABEL[e.type] || e.type;

/** เวลาแสดงเป็น Asia/Bangkok พร้อมโซนกำกับเสมอ */
export function bangkokTime(d: Date) {
  const text = new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d);
  return `${text} (UTC+7)`;
}

export const msg = {
  leave: (p: { ign: string; event: string; when: string | null; reason: string | null; cancelled: boolean; byOther: boolean }) =>
    p.cancelled
      ? `↩️ **${p.ign}** ยกเลิกการลา **${p.event}**${p.when ? ` (${p.when})` : ''}`
      : `📝 **${p.ign}** ลา **${p.event}**${p.when ? ` (${p.when})` : ''}${p.reason ? `\nเหตุผล: ${p.reason}` : ''}${p.byOther ? '\n_(Officer ลงให้)_' : ''}`,
  award: (p: { ign: string; item: string }) => `🎁 **${p.item}** → **${p.ign}**`,
  reminder: (p: { event: string; when: string; assigned: number; onLeave: number }) =>
    `⏰ อีก 1 ชั่วโมงถึง **${p.event}** — ${p.when}\nจัดปาร์ตี้แล้ว ${p.assigned} คน · ลา ${p.onLeave} คน`,
  imageCaption: { event: (name: string, field?: 'main' | 'sub') => `📋 ปาร์ตี้ **${name}**${field ? ` · ${field === 'main' ? 'สนามบน' : 'สนามล่าง'}` : ''}`, auction: () => '🔨 คิวประมูลล่าสุด' }
};
