import { account, auditLog, guildProfile, member, user } from '@row/db';
import { and, eq } from 'drizzle-orm';
import { db } from './jobs.ts';

/**
 * ซิงก์ชื่อจาก Discord → user.name โดยใช้ Discord ID เป็น key (account.accountId) — ไม่ต้องจับคู่ชื่อเก่า/ใหม่ (CLAUDE.md #11)
 * ทำเฉพาะ user ที่เป็นสมาชิกของกิลด์ที่ผูกกับเซิร์ฟเวอร์ Discord นี้ (guild_profile.discord_guild_id)
 * คืนจำนวนคนที่ชื่อถูกเปลี่ยนจริง (0 = ไม่มีใครต้องเปลี่ยน / ไม่พบ user)
 */
export async function syncMemberName(p: { discordGuildId: string; discordUserId: string; displayName: string }): Promise<number> {
  const name = p.displayName.trim().slice(0, 100);
  if (!name) return 0;

  const rows = await db
    .select({ userId: user.id, oldName: user.name, orgId: guildProfile.organizationId })
    .from(account)
    .innerJoin(user, eq(account.userId, user.id))
    .innerJoin(member, eq(member.userId, user.id))
    .innerJoin(guildProfile, eq(guildProfile.organizationId, member.organizationId))
    .where(and(eq(account.providerId, 'discord'), eq(account.accountId, p.discordUserId), eq(guildProfile.discordGuildId, p.discordGuildId)));

  const changed = rows.filter((r) => r.oldName !== name);
  if (!changed.length) return 0;
  const ids = [...new Set(changed.map((r) => r.userId))];
  for (const id of ids) await db.update(user).set({ name, updatedAt: new Date() }).where(eq(user.id, id));
  for (const r of changed)
    await db.insert(auditLog).values({
      organizationId: r.orgId,
      actorUserId: null,
      action: 'member.discord_sync',
      targetType: 'user',
      targetId: r.userId,
      detail: { from: r.oldName, to: name }
    });
  return ids.length;
}
