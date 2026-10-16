import { boolean, index, jsonb, pgEnum, pgTable, text } from 'drizzle-orm/pg-core';
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
