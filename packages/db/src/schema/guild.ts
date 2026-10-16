import { boolean, index, integer, jsonb, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { createdAt, id, updatedAt } from './_helpers';
import { organization, user } from './auth';
import { classRoleEnum, gameClass } from './master';

/** ข้อมูลเสริมของกิลด์ (1:1 กับ organization) */
export const guildProfile = pgTable('guild_profile', {
  organizationId: text('organization_id')
    .primaryKey()
    .references(() => organization.id, { onDelete: 'cascade' }),
  description: text('description'),
  server: text('server'),
  discordGuildId: text('discord_guild_id'),
  // channel สำหรับ scheduler / ส่งรูป / ประมูล
  notifyChannelId: text('notify_channel_id'),
  imageChannelId: text('image_channel_id'),
  auctionChannelId: text('auction_channel_id'),
  suspended: boolean('suspended').notNull().default(false),
  updatedAt: updatedAt()
});

/**
 * ตัวละคร — 1 user มีได้หลายตัว
 * userId nullable: Officer เพิ่มตัวละครของคนที่ยังไม่ login ได้ แล้วค่อยผูกทีหลัง
 */
export const character = pgTable(
  'character',
  {
    id: id(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    ign: text('ign').notNull(), // ชื่อในเกม (แยกจากชื่อ Discord เสมอ)
    classId: text('class_id').references(() => gameClass.id),
    /** role ที่ผู้เล่นเลือกเอง เช่น Priest สาย dmg (null = ใช้ role ตามอาชีพ game_class.role) */
    role: classRoleEnum('role'),
    level: integer('level'),
    combatPower: integer('combat_power'),
    isMain: boolean('is_main').notNull().default(false),
    active: boolean('active').notNull().default(true),
    note: text('note'),
    extra: jsonb('extra'),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (t) => [
    uniqueIndex('character_org_ign_uq').on(t.organizationId, t.ign),
    index('character_user_idx').on(t.userId),
    index('character_class_idx').on(t.classId)
  ]
);
