import { boolean, integer, pgEnum, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { createdAt, id } from './_helpers';

export const classRoleEnum = pgEnum('class_role', ['tank', 'dps', 'healer', 'support']);

// ---- Master data (Super Admin จัดการ) ----
export const gameClass = pgTable(
  'game_class',
  {
    id: id(),
    name: text('name').notNull(),
    role: classRoleEnum('role').notNull(), // ใช้ทำกราฟแยก Tank/DPS/Healer/Support
    iconUrl: text('icon_url'),
    color: text('color'), // สีป้ายอาชีพ (hex) ใช้ใน UI / รูป capture
    sortOrder: integer('sort_order').notNull().default(0),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt()
  },
  (t) => [uniqueIndex('game_class_name_uq').on(t.name)]
);

export const boss = pgTable(
  'boss',
  {
    id: id(),
    name: text('name').notNull(),
    iconUrl: text('icon_url'),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt()
  },
  (t) => [uniqueIndex('boss_name_uq').on(t.name)]
);

export const auctionItem = pgTable(
  'auction_item',
  {
    id: id(),
    name: text('name').notNull(),
    iconUrl: text('icon_url'),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt()
  },
  (t) => [uniqueIndex('auction_item_name_uq').on(t.name)]
);
