import { and, eq, gt, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import type { Db } from './index';
import { guildSubscription, pkg } from './schema/billing';
import { guildProfile } from './schema/guild';

/**
 * สิทธิ์ใช้งานของกิลด์ (ใช้ร่วมกันระหว่างเว็บและบอท)
 * - `exempt`  : guild_profile.billing_exempt (กิลด์ที่ Super Admin สร้าง/มีก่อนระบบ billing) ใช้ได้ไม่จำกัด
 * - `active`  : มี guild_subscription status=active และ starts_at <= now < ends_at (ends_at null = ตลอดไป)
 * - `expired` : ไม่มีทั้งสองอย่าง → ข้อมูลยังอยู่ แต่ใช้ฟีเจอร์ไม่ได้ + บอทหยุดทำงานให้กิลด์นี้
 */
export type GuildAccessState = 'exempt' | 'active' | 'expired';

export interface GuildAccess {
  state: GuildAccessState;
  /** วันหมดอายุของสิทธิ์ที่ยาวที่สุด (null = ไม่หมดอายุ หรือไม่มีสิทธิ์) */
  endsAt: Date | null;
  /** สิทธิ์ปัจจุบันมาจากแพ็กเกจทดลองใช้ */
  isTrial: boolean;
  /** limits ของสิทธิ์ปัจจุบัน (exempt = {} ไม่จำกัด) */
  limits: Record<string, number | boolean | null>;
}

/** เงื่อนไข SQL "กิลด์นี้ใช้งานได้" สำหรับใส่ใน where (เช่น scheduler ของบอท) — orgId = คอลัมน์ organization_id ของตารางหลัก */
export function guildActiveSql(orgId: AnyPgColumn, now = new Date()): SQL {
  return sql`(
    exists (select 1 from ${guildProfile} where ${guildProfile.organizationId} = ${orgId} and ${guildProfile.billingExempt})
    or exists (
      select 1 from ${guildSubscription}
      where ${guildSubscription.organizationId} = ${orgId}
        and ${guildSubscription.status} = 'active'
        and ${guildSubscription.startsAt} <= ${now}
        and (${guildSubscription.endsAt} is null or ${guildSubscription.endsAt} > ${now})
    )
  )`;
}

export async function getGuildAccess(db: Db, orgId: string, now = new Date()): Promise<GuildAccess> {
  const [profile] = await db
    .select({ exempt: guildProfile.billingExempt })
    .from(guildProfile)
    .where(eq(guildProfile.organizationId, orgId));
  if (profile?.exempt) return { state: 'exempt', endsAt: null, isTrial: false, limits: {} };

  // สิทธิ์ที่ใช้อยู่ตอนนี้ (รอบต่ออายุที่ยังไม่เริ่มไม่นับ) — เลือกตัวที่หมดช้าที่สุด
  const [current] = await db
    .select({ limits: guildSubscription.limits, isTrial: pkg.isTrial })
    .from(guildSubscription)
    .innerJoin(pkg, eq(pkg.id, guildSubscription.packageId))
    .where(
      and(
        eq(guildSubscription.organizationId, orgId),
        eq(guildSubscription.status, 'active'),
        lte(guildSubscription.startsAt, now),
        or(isNull(guildSubscription.endsAt), gt(guildSubscription.endsAt, now))
      )
    )
    .orderBy(sql`${guildSubscription.endsAt} desc nulls first`)
    .limit(1);
  if (!current) return { state: 'expired', endsAt: null, isTrial: false, limits: {} };

  // วันหมดอายุจริง = ปลายสุดของสิทธิ์ทั้งหมด (รวมรอบที่ต่ออายุไว้ล่วงหน้า)
  const [last] = await db
    .select({ endsAt: guildSubscription.endsAt })
    .from(guildSubscription)
    .where(and(eq(guildSubscription.organizationId, orgId), eq(guildSubscription.status, 'active')))
    .orderBy(sql`${guildSubscription.endsAt} desc nulls first`)
    .limit(1);
  return { state: 'active', endsAt: last?.endsAt ?? null, isTrial: current.isTrial, limits: current.limits };
}

export const isGuildUsable = (a: GuildAccess) => a.state !== 'expired';

