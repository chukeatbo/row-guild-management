import type { EventConfig } from '@row/shared';
import { boolean, index, integer, jsonb, pgEnum, pgTable, text, unique } from 'drizzle-orm/pg-core';
import { createdAt, id, ts, updatedAt } from './_helpers';
import { organization, user } from './auth';
import { character } from './guild';

export const eventTypeEnum = pgEnum('event_type', ['guild_league', 'siege_war', 'polarity_elite']);
export const eventStatusEnum = pgEnum('event_status', ['draft', 'open', 'closed', 'done']);

/**
 * ตารางรายสัปดาห์ของ event ถาวร (1 แถวต่อกิลด์ต่อประเภท) ใช้เลื่อน startsAt ไปรอบถัดไปอัตโนมัติ
 * weekdays: 0=อาทิตย์ … 6=เสาร์ ตามปฏิทิน Asia/Bangkok; startTime 'HH:MM' เวลา Asia/Bangkok
 * leaveDeadlineHours: ปิดรับลาก่อนเริ่มกี่ชั่วโมง (null = ไม่กำหนด)
 */
export const eventSchedule = pgTable(
  'event_schedule',
  {
    id: id(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    type: eventTypeEnum('type').notNull(),
    weekdays: integer('weekdays').array().notNull().default([]),
    startTime: text('start_time').notNull().default('20:00'),
    leaveDeadlineHours: integer('leave_deadline_hours'),
    enabled: boolean('enabled').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (t) => [unique('event_schedule_org_type_uq').on(t.organizationId, t.type)]
);

/** Generic event — GL / Siege / Polarity ใช้ตารางเดียว ต่างกันที่ type + config */
export const guildEvent = pgTable(
  'guild_event',
  {
    id: id(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    type: eventTypeEnum('type').notNull(),
    /** ว่าง ('') = ใช้ชื่อประเภทตามภาษาของผู้ดู */
    title: text('title').notNull(),
    /** รอบถัดไปของ event ถาวร (null = ยังไม่ได้กำหนด) */
    startsAt: ts('starts_at'),
    leaveDeadline: ts('leave_deadline'),
    status: eventStatusEnum('status').notNull().default('draft'),
    config: jsonb('config').$type<EventConfig>().notNull(), // partySize / maxPartiesPerGroup / maxMembers / fields
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (t) => [
    index('guild_event_org_type_start_idx').on(t.organizationId, t.type, t.startsAt),
    // 1 กิลด์มี event ถาวรได้ประเภทละ 1 อัน
    unique('guild_event_org_type_uq').on(t.organizationId, t.type)
  ]
);

/**
 * Group ปาร์ตี้ (ปาร์ตี้ใหญ่) — 1 group มีได้ไม่เกิน config.maxPartiesPerGroup ปาร์ตี้ (ปกติ 8 = 40 คน)
 * field: ใช้กับ Guild League ที่มี 2 สนาม ('main' = สนามบน, 'sub' = สนามล่าง); ประเภทอื่นเป็น null
 * lane: เลน บน/กลาง/ล่าง ของ GL (nullable)
 */
export const partyGroup = pgTable(
  'party_group',
  {
    id: id(),
    eventId: text('event_id')
      .notNull()
      .references(() => guildEvent.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    position: integer('position').notNull().default(0),
    field: text('field'),
    lane: text('lane'),
    createdAt: createdAt()
  },
  (t) => [unique('party_group_event_position_uq').on(t.eventId, t.position)]
);

export const party = pgTable(
  'party',
  {
    id: id(),
    eventId: text('event_id')
      .notNull()
      .references(() => guildEvent.id, { onDelete: 'cascade' }),
    groupId: text('group_id')
      .notNull()
      .references(() => partyGroup.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    position: integer('position').notNull().default(0),
    leaderCharacterId: text('leader_character_id').references(() => character.id, {
      onDelete: 'set null'
    }),
    locked: boolean('locked').notNull().default(false),
    note: text('note'),
    createdAt: createdAt()
  },
  (t) => [unique('party_group_position_uq').on(t.groupId, t.position)]
);

export const partySlot = pgTable(
  'party_slot',
  {
    id: id(),
    // eventId เก็บซ้ำ เพื่อทำ unique "ตัวละครเดียวอยู่ได้ปาร์ตี้เดียวต่อ event" ที่ระดับ DB
    eventId: text('event_id')
      .notNull()
      .references(() => guildEvent.id, { onDelete: 'cascade' }),
    partyId: text('party_id')
      .notNull()
      .references(() => party.id, { onDelete: 'cascade' }),
    slotIndex: integer('slot_index').notNull(),
    characterId: text('character_id')
      .notNull()
      .references(() => character.id, { onDelete: 'cascade' }),
    isBench: boolean('is_bench').notNull().default(false),
    createdAt: createdAt()
  },
  (t) => [
    unique('party_slot_position_uq').on(t.partyId, t.slotIndex),
    unique('party_slot_event_character_uq').on(t.eventId, t.characterId)
  ]
);
