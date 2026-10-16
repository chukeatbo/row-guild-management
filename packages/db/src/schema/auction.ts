import { index, integer, pgEnum, pgTable, text, unique } from 'drizzle-orm/pg-core';
import { createdAt, id, ts } from './_helpers';
import { organization, user } from './auth';
import { character } from './guild';
import { auctionItem } from './master';

export const auctionStatusEnum = pgEnum('auction_status', [
  'queued',
  'bidding',
  'closed',
  'cancelled'
]);

/** รอบประมูล 1 ไอเทม — กติกาจัดคิวยังไม่กำหนด จึงเก็บ priority แบบ generic ใน entry */
export const auction = pgTable(
  'auction',
  {
    id: id(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    itemId: text('item_id')
      .notNull()
      .references(() => auctionItem.id),
    status: auctionStatusEnum('status').notNull().default('queued'),
    winnerCharacterId: text('winner_character_id').references(() => character.id, {
      onDelete: 'set null'
    }),
    closedBy: text('closed_by').references(() => user.id, { onDelete: 'set null' }),
    closedAt: ts('closed_at'),
    createdAt: createdAt()
  },
  (t) => [index('auction_org_status_idx').on(t.organizationId, t.status)]
);

/** ประวัติการมอบไอเทม — คิวเป็นคิวถาวร มอบแล้วคนนั้นหลุดจากคิว แต่คิวยังอยู่ */
export const auctionAward = pgTable(
  'auction_award',
  {
    id: id(),
    auctionId: text('auction_id')
      .notNull()
      .references(() => auction.id, { onDelete: 'cascade' }),
    characterId: text('character_id').references(() => character.id, { onDelete: 'set null' }),
    ign: text('ign').notNull(), // snapshot เผื่อตัวละครถูกลบ/เปลี่ยนชื่อ
    awardedBy: text('awarded_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt()
  },
  (t) => [index('auction_award_auction_idx').on(t.auctionId, t.createdAt)]
);

export const auctionEntry = pgTable(
  'auction_entry',
  {
    id: id(),
    auctionId: text('auction_id')
      .notNull()
      .references(() => auction.id, { onDelete: 'cascade' }),
    characterId: text('character_id')
      .notNull()
      .references(() => character.id, { onDelete: 'cascade' }),
    priority: integer('priority'), // แต้ม/ลำดับ — ตีความตามกติกาที่จะกำหนดทีหลัง
    createdAt: createdAt()
  },
  (t) => [unique('auction_entry_uq').on(t.auctionId, t.characterId)]
);
