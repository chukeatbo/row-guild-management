import { boolean, check, index, integer, jsonb, pgEnum, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createdAt, id, ts, updatedAt } from './_helpers';
import { organization, user } from './auth';

/**
 * ระบบชำระเงิน (Omise / Opn Payments) — ดูคำอธิบายและ flow ที่ docs/billing.md
 * - เงินทุกจำนวนเก็บเป็นจำนวนเต็ม "สตางค์" (THB x 100) ตามที่ Omise ใช้ ห้ามใช้ float
 * - ข้อมูลการเงินห้ามลบตามกิลด์/ผู้ใช้: FK ไป organization เป็น set null, ไป user/package เป็น restrict
 * - ห้ามเก็บเลขบัตร/CVV ใดๆ (Omise.js tokenize ฝั่ง browser, เราเห็นแค่ brand + 4 ตัวท้ายจาก charge)
 */

/** แพ็กเกจ (ขายบน landing page) — แยกรายเดือน/รายปีเป็นคนละแถว เช่น pro-monthly, pro-yearly */
export const pkg = pgTable(
  'packages',
  {
    id: id(),
    /** slug ที่ landing page / checkout ใช้อ้างอิง (คงที่ ไม่เปลี่ยน) เช่น pro-monthly */
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    /** คำแปลสำหรับแสดงผล { th: { name, description, features[] }, en: {...} } — ไม่มี = ใช้ name/description */
    translations: jsonb('translations').$type<Record<string, { name?: string; description?: string; features?: string[] }>>(),
    /** ราคา (สตางค์) — Omise ขั้นต่ำต่อ charge ของ THB คือ 2000 สตางค์ (฿20) */
    priceSatang: integer('price_satang').notNull(),
    currency: text('currency').notNull().default('THB'),
    /** อายุการใช้งานต่อการซื้อ 1 ครั้ง (วัน); null = ใช้ได้ตลอดไป */
    durationDays: integer('duration_days'),
    /** สิทธิ์ที่ระบบบังคับใช้จริง เช่น { maxMembers: 150, discordBot: true, maxGuilds: 1 } (null = ไม่จำกัด) */
    limits: jsonb('limits').$type<Record<string, number | boolean | null>>().notNull().default({}),
    /** ข้อความขายที่โชว์บน landing (bullet) */
    features: jsonb('features').$type<string[]>().notNull().default([]),
    isActive: boolean('is_active').notNull().default(true), // false = ซื้อใหม่ไม่ได้ (ของเดิมที่ซื้อไปแล้วยังใช้ได้)
    isPublic: boolean('is_public').notNull().default(true), // false = ซ่อนจาก landing (ลิงก์ส่วนตัว/แพ็กเกจพิเศษ)
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (t) => [
    uniqueIndex('package_code_uq').on(t.code),
    check('package_price_nonneg', sql`${t.priceSatang} >= 0`),
    check('package_duration_pos', sql`${t.durationDays} is null or ${t.durationDays} > 0`)
  ]
);

export const orderStatusEnum = pgEnum('order_status', [
  'pending', // สร้างแล้ว รอจ่าย (เช่น รอสแกน PromptPay)
  'paid',
  'failed', // ทุกความพยายามจ่ายล้มเหลว
  'expired', // เลยเวลาจ่าย (QR หมดอายุ)
  'cancelled', // ผู้ซื้อ/แอดมินยกเลิกก่อนจ่าย
  'refunded' // คืนเงินเต็มจำนวนแล้ว
]);

/** คำสั่งซื้อ — 1 order = 1 แพ็กเกจ 1 ชิ้น (ตัวอย่าง: กิลด์ X ซื้อ pro-monthly) */
export const order = pgTable(
  'orders',
  {
    id: id(),
    /** เลขที่คำสั่งซื้อที่คนอ่านได้ (ใส่ใน description ของ Omise charge / ใบเสร็จ) เช่น ROW-261016-7K3QWD */
    orderNo: text('order_no').notNull(),
    /** ผู้ซื้อ (ต้อง login Discord ก่อนจ่าย) */
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    /** กิลด์ที่จะได้รับสิทธิ์ — null ได้ถ้าซื้อก่อนมีกิลด์ (ผูกทีหลังตอนสร้าง/เลือกกิลด์) */
    organizationId: text('organization_id').references(() => organization.id, { onDelete: 'set null' }),
    packageId: text('package_id')
      .notNull()
      .references(() => pkg.id, { onDelete: 'restrict' }),
    /** สำเนาแพ็กเกจ ณ วันซื้อ (ชื่อ ราคา อายุ limits) — แก้ราคา/สิทธิ์ภายหลังต้องไม่กระทบออเดอร์เก่า */
    packageSnapshot: jsonb('package_snapshot')
      .$type<{ code: string; name: string; priceSatang: number; currency: string; durationDays: number | null; limits: Record<string, number | boolean | null> }>()
      .notNull(),
    amountSatang: integer('amount_satang').notNull(),
    currency: text('currency').notNull().default('THB'),
    status: orderStatusEnum('status').notNull().default('pending'),
    /** กันกดซ้ำ/ส่งซ้ำตอนสร้างออเดอร์จาก landing (client สร้าง UUID ต่อการกด "ซื้อ") */
    idempotencyKey: text('idempotency_key'),
    /** ข้อมูลออกใบกำกับภาษี (ถ้าผู้ซื้อกรอก): { name, taxId, address, email } */
    billingInfo: jsonb('billing_info').$type<{ name?: string; taxId?: string; address?: string; email?: string }>(),
    /** ค้างจ่ายได้ถึงเมื่อไหร่ (หลังจากนี้ job ตั้งเป็น expired) */
    expiresAt: ts('expires_at'),
    paidAt: ts('paid_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (t) => [
    uniqueIndex('order_no_uq').on(t.orderNo),
    uniqueIndex('order_idempotency_uq').on(t.userId, t.idempotencyKey),
    index('order_user_idx').on(t.userId, t.createdAt),
    index('order_org_idx').on(t.organizationId),
    index('order_pending_exp_idx').on(t.status, t.expiresAt),
    check('order_amount_nonneg', sql`${t.amountSatang} >= 0`)
  ]
);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending', // สร้าง charge แล้ว รอผู้ใช้จ่าย (PromptPay QR / redirect)
  'successful',
  'failed',
  'expired',
  'reversed' // ถูกยกเลิก/กลับรายการ (ก่อนตัดเงินสำเร็จ)
]);

/**
 * ความพยายามชำระเงิน = Omise charge 1 ใบ (order 1 ใบมีได้หลาย payment เช่น บัตรถูกปฏิเสธแล้วลองใหม่/ลอง PromptPay)
 * ความจริงของสถานะเงินมาจาก Omise เสมอ: ตอน webhook เข้าให้ดึง charge จาก API มาอัปเดตแถวนี้ ไม่เชื่อ payload ตรงๆ
 */
export const payment = pgTable(
  'payment',
  {
    id: id(),
    orderId: text('order_id')
      .notNull()
      .references(() => order.id, { onDelete: 'restrict' }),
    /** chrg_xxx จาก Omise */
    omiseChargeId: text('omise_charge_id').notNull(),
    /** วิธีจ่าย (source.type ของ Omise): promptpay, card, internet_banking_*, mobile_banking_*, truemoney, ... */
    method: text('method').notNull(),
    status: paymentStatusEnum('status').notNull().default('pending'),
    amountSatang: integer('amount_satang').notNull(),
    currency: text('currency').notNull().default('THB'),
    /** ค่าธรรมเนียม/ VAT ที่ Omise หัก (สตางค์) — รู้ตอนโอนเงินจริง ใช้ทำบัญชี; null = ยังไม่รู้ */
    feeSatang: integer('fee_satang'),
    /** URL ให้ผู้ใช้ไปจ่าย (redirect ธนาคาร/3DS) หรือรูป QR PromptPay (download_uri) */
    authorizeUri: text('authorize_uri'),
    qrImageUri: text('qr_image_uri'),
    /** ข้อมูลบัตรที่ปลอดภัย: { brand, last4 } เท่านั้น */
    card: jsonb('card').$type<{ brand?: string; last4?: string }>(),
    failureCode: text('failure_code'),
    failureMessage: text('failure_message'),
    /** QR/ลิงก์หมดอายุเมื่อ */
    expiresAt: ts('expires_at'),
    paidAt: ts('paid_at'),
    /** charge object ล่าสุดจาก Omise (ตัดเลขบัตร/ความลับออกก่อนเก็บ) ไว้ตรวจสอบย้อนหลัง */
    rawCharge: jsonb('raw_charge'),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (t) => [
    uniqueIndex('payment_charge_uq').on(t.omiseChargeId),
    index('payment_order_idx').on(t.orderId),
    check('payment_amount_pos', sql`${t.amountSatang} > 0`)
  ]
);

/** การคืนเงิน (Omise refund rfnd_xxx) — คืนได้หลายครั้งต่อ payment จนครบยอด */
export const refund = pgTable(
  'refund',
  {
    id: id(),
    paymentId: text('payment_id')
      .notNull()
      .references(() => payment.id, { onDelete: 'restrict' }),
    omiseRefundId: text('omise_refund_id').notNull(),
    amountSatang: integer('amount_satang').notNull(),
    reason: text('reason'),
    /** Super Admin ที่สั่งคืน */
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt()
  },
  (t) => [
    uniqueIndex('refund_omise_uq').on(t.omiseRefundId),
    index('refund_payment_idx').on(t.paymentId),
    check('refund_amount_pos', sql`${t.amountSatang} > 0`)
  ]
);

export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'expired', 'cancelled']);

/**
 * สิทธิ์ใช้งานของกิลด์ที่ได้จากออเดอร์ที่จ่ายแล้ว (entitlement)
 * - ระบบเช็คสิทธิ์ด้วย: แถวที่ status=active และ starts_at <= now < ends_at (ends_at null = ตลอดไป) ของกิลด์นั้น
 * - ต่ออายุ = ซื้อใหม่ → แถวใหม่ที่ starts_at ต่อจาก ends_at ของแถวล่าสุด (ไม่ทับของเดิม)
 * - unique(order_id): 1 ออเดอร์ให้สิทธิ์ได้ครั้งเดียว → webhook ซ้ำ/ประมวลผลซ้ำจึงไม่ให้สิทธิ์ซ้อน (insert ... on conflict do nothing)
 */
export const guildSubscription = pgTable(
  'guild_subscription',
  {
    id: id(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    packageId: text('package_id')
      .notNull()
      .references(() => pkg.id, { onDelete: 'restrict' }),
    orderId: text('order_id')
      .notNull()
      .references(() => order.id, { onDelete: 'restrict' }),
    status: subscriptionStatusEnum('status').notNull().default('active'),
    /** limits ที่ใช้จริงของรอบนี้ (คัดลอกจาก order.packageSnapshot — แพ็กเกจเปลี่ยนภายหลังไม่กระทบ) */
    limits: jsonb('limits').$type<Record<string, number | boolean | null>>().notNull().default({}),
    startsAt: ts('starts_at').notNull(),
    endsAt: ts('ends_at'), // null = ตลอดไป
    createdAt: createdAt()
  },
  (t) => [
    uniqueIndex('guild_subscription_order_uq').on(t.orderId),
    index('guild_subscription_active_idx').on(t.organizationId, t.status, t.endsAt)
  ]
);

/**
 * Omise webhook ที่รับเข้ามา (เก็บดิบก่อนประมวลผล) — unique(omise_event_id) กันประมวลผลซ้ำ
 * Omise ส่ง event เดิมซ้ำได้ และไม่รับประกันลำดับ → handler ต้อง idempotent และดึง charge ล่าสุดจาก API เสมอ
 */
export const omiseWebhookEvent = pgTable(
  'omise_webhook_event',
  {
    id: id(),
    omiseEventId: text('omise_event_id').notNull(), // evnt_xxx
    type: text('type').notNull(), // เช่น charge.complete, refund.create
    /** object ที่เกี่ยวข้อง (chrg_xxx / rfnd_xxx) ไว้ค้นหา */
    objectId: text('object_id'),
    payload: jsonb('payload').notNull(),
    processedAt: ts('processed_at'),
    /** ประมวลผลล้มเหลว (เก็บข้อความไว้ให้ retry/ตรวจ) */
    error: text('error'),
    createdAt: createdAt()
  },
  (t) => [
    uniqueIndex('omise_webhook_event_uq').on(t.omiseEventId),
    index('omise_webhook_object_idx').on(t.objectId),
    index('omise_webhook_unprocessed_idx').on(t.processedAt)
  ]
);
