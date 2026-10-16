import { text, timestamp } from 'drizzle-orm/pg-core';

/** id แบบ text เพื่อให้เข้ากับตาราง Better Auth */
export const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

/** เก็บเป็น UTC เสมอ แสดงผลเป็น Asia/Bangkok ที่ฝั่ง UI */
export const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
export const createdAt = () => ts('created_at').notNull().defaultNow();
export const updatedAt = () =>
  ts('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
