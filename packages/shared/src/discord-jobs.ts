/** งานที่เว็บส่งให้ bot ผ่าน BullMQ (คิวเดียว ชื่อ DISCORD_QUEUE) */
export const DISCORD_QUEUE = 'discord';

export type DiscordJob =
  /** แคปหน้า /render/{kind}/... เป็นรูปแล้วส่งลงห้อง */
  | {
      type: 'send_image';
      kind: 'event' | 'auction';
      orgId: string;
      /** event id หรือ organization id (kind=auction) */
      targetId: string;
      channelId: string;
      /** กิจกรรม GL แยกรูปสนามบน (main) / สนามล่าง (sub); ไม่ระบุ = ทั้งหมด */
      field?: 'main' | 'sub';
      caption?: string;
    }
  /** มีคนลา/ยกเลิกลา → แจ้งห้อง notify */
  | { type: 'leave'; orgId: string; eventId: string; ign: string; reason: string | null; cancelled: boolean; byOther: boolean }
  /** Officer มอบไอเทมประมูล → แจ้งห้องประมูล */
  | { type: 'auction_award'; orgId: string; item: string; ign: string }
  /** แพ็กเกจของกิลด์ใกล้หมดอายุ (เว็บ /api/internal/billing-reminders ส่งเข้าคิว) */
  | { type: 'billing_reminder'; orgId: string; daysLeft: number; endsAt: string; renewUrl: string };

/** ห้องส่งรูปปาร์ตี้ของกิลด์ (แยกตามกิจกรรม) */
export interface ImageChannels {
  glMain: string | null;
  glSub: string | null;
  siege: string | null;
  polarity: string | null;
}

/** รูปที่ต้องส่งของ event ประเภทนี้ → [ห้อง, สนาม]: GL ส่ง 2 รูป (บน/ล่าง) ไปคนละห้อง; ห้องที่ไม่ได้ตั้งจะถูกข้าม */
export function eventImageTargets(
  type: string,
  ch: ImageChannels
): { channelId: string; field?: 'main' | 'sub' }[] {
  const list: { channelId: string | null; field?: 'main' | 'sub' }[] =
    type === 'guild_league'
      ? [
          { channelId: ch.glMain, field: 'main' },
          { channelId: ch.glSub, field: 'sub' }
        ]
      : type === 'siege_war'
        ? [{ channelId: ch.siege }]
        : type === 'polarity_elite'
          ? [{ channelId: ch.polarity }]
          : [];
  return list.flatMap((t) => (t.channelId ? [{ channelId: t.channelId, field: t.field }] : []));
}
