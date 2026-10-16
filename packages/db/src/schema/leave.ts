import { pgTable, text, unique } from 'drizzle-orm/pg-core';
import { createdAt, id } from './_helpers';
import { user } from './auth';
import { guildEvent } from './event';
import { character } from './guild';

export const eventLeave = pgTable(
  'event_leave',
  {
    id: id(),
    eventId: text('event_id')
      .notNull()
      .references(() => guildEvent.id, { onDelete: 'cascade' }),
    characterId: text('character_id')
      .notNull()
      .references(() => character.id, { onDelete: 'cascade' }),
    reason: text('reason'),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }), // ลาแทนคนอื่น
    createdAt: createdAt()
  },
  (t) => [unique('event_leave_uq').on(t.eventId, t.characterId)] // ลาซ้ำไม่ได้
);
