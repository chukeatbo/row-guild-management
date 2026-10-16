import { z } from 'zod';

export const GUILD_ROLES = ['owner', 'officer', 'leader', 'member'] as const;
export type GuildRole = (typeof GUILD_ROLES)[number];

export const EVENT_TYPES = ['guild_league', 'siege_war', 'polarity_elite'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_STATUSES = ['draft', 'open', 'closed', 'done'] as const;
export const CLASS_ROLES = ['tank', 'dps', 'healer', 'support'] as const;
export type ClassRole = (typeof CLASS_ROLES)[number];

export const AUCTION_STATUSES = ['queued', 'bidding', 'closed', 'cancelled'] as const;

export const TIMEZONE = 'Asia/Bangkok';

/**
 * config ของ guild_event (กติกาจริง: ปาร์ตี้ละ 5 คน, group ละไม่เกิน 8 ปาร์ตี้, กิลด์ 150 คน)
 * - guild_league: 2 สนาม — main 60 คน (12 ปาร์ตี้, 3 group/3 เลน), sub = คนที่เหลือ (~90 คน, group ละ 40)
 * - siege_war: ไม่จำกัดจำนวน group (user สร้างเอง)
 * - polarity_elite: จำกัด 50 คน (10 ปาร์ตี้แบบแบน ไม่มี group)
 */
export const eventConfigSchema = z.object({
  partySize: z.number().int().min(1).max(10).default(5),
  maxPartiesPerGroup: z.number().int().min(1).max(20).default(8),
  maxMembers: z.number().int().min(1).optional(), // เพดานทั้ง event (ไม่ระบุ = ไม่จำกัด)
  fields: z
    .array(z.object({ key: z.string(), label: z.string(), maxMembers: z.number().int().optional() }))
    .optional()
});
export type EventConfig = z.infer<typeof eventConfigSchema>;

export const EVENT_PRESETS: Record<EventType, EventConfig> = {
  guild_league: {
    partySize: 5,
    maxPartiesPerGroup: 8,
    fields: [
      { key: 'main', label: 'สนามบน', maxMembers: 60 },
      { key: 'sub', label: 'สนามล่าง' }
    ]
  },
  siege_war: { partySize: 5, maxPartiesPerGroup: 8 },
  polarity_elite: { partySize: 5, maxPartiesPerGroup: 10, maxMembers: 50 } // ไม่มี group: ปาร์ตี้ย่อย 10 ปาร์ตี้ในกลุ่มซ่อน 1 อัน
};

/** ประเภท event ที่มีระบบลา (Polarity ไม่มี) */
export const LEAVE_EVENT_TYPES = ['guild_league', 'siege_war'] as const satisfies readonly EventType[];
