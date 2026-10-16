import { pgTable, text, unique } from 'drizzle-orm/pg-core';
import { createdAt, id, ts } from './_helpers';
import { organization, user } from './auth';
import { character } from './guild';
import { boss } from './master';

/** จองบอสดันกิลด์ — slot ชนกันไม่ได้ (unique org + boss + slotStart) */
export const bossBooking = pgTable(
  'boss_booking',
  {
    id: id(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    bossId: text('boss_id')
      .notNull()
      .references(() => boss.id),
    characterId: text('character_id')
      .notNull()
      .references(() => character.id, { onDelete: 'cascade' }),
    slotStart: ts('slot_start').notNull(),
    note: text('note'),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt()
  },
  (t) => [unique('boss_booking_slot_uq').on(t.organizationId, t.bossId, t.slotStart)]
);
