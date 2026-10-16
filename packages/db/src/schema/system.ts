import { boolean, index, jsonb, pgEnum, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { createdAt, id, ts } from './_helpers';
import { organization, user } from './auth';
import { guildEvent } from './event';

export const scheduleKindEnum = pgEnum('schedule_kind', ['event_reminder', 'custom']);

/** งานแจ้งเตือน Discord — bot/worker อ่านตารางนี้แล้วสร้าง BullMQ job */
export const notificationSchedule = pgTable(
  'notification_schedule',
  {
    id: id(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    eventId: text('event_id').references(() => guildEvent.id, { onDelete: 'cascade' }),
    kind: scheduleKindEnum('kind').notNull(),
    runAt: ts('run_at'), // ครั้งเดียว
    cron: text('cron'), // หรือวนซ้ำ (timezone Asia/Bangkok)
    channelId: text('channel_id'),
    message: text('message'),
    enabled: boolean('enabled').notNull().default(true),
    lastRunAt: ts('last_run_at'),
    createdAt: createdAt()
  },
  (t) => [index('notification_due_idx').on(t.enabled, t.runAt)]
);

/**
 * บันทึกว่าแจ้งเตือนอัตโนมัติของ event รอบนั้น (starts_at) ส่งไปแล้ว — กันส่งซ้ำเมื่อ bot รีสตาร์ท/รันหลายตัว
 * insert ... on conflict do nothing แล้วดูว่าได้แถวไหม = "จองสิทธิ์ส่ง"
 */
export const notificationSent = pgTable(
  'notification_sent',
  {
    id: id(),
    eventId: text('event_id')
      .notNull()
      .references(() => guildEvent.id, { onDelete: 'cascade' }),
    startsAt: ts('starts_at').notNull(),
    kind: text('kind').notNull(), // เช่น reminder_60
    sentAt: createdAt()
  },
  (t) => [uniqueIndex('notification_sent_uq').on(t.eventId, t.startsAt, t.kind)]
);

/** ทุก mutation สำคัญต้องเขียนที่นี่ */
export const auditLog = pgTable(
  'audit_log',
  {
    id: id(),
    organizationId: text('organization_id').references(() => organization.id, {
      onDelete: 'cascade'
    }),
    actorUserId: text('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
    action: text('action').notNull(), // เช่น party.assign, member.role_change, auction.close
    targetType: text('target_type'),
    targetId: text('target_id'),
    detail: jsonb('detail'),
    createdAt: createdAt()
  },
  (t) => [index('audit_org_created_idx').on(t.organizationId, t.createdAt)]
);
