import { guildProfile } from '@row/db';
import { isNotNull } from 'drizzle-orm';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { env } from './env.ts';
import { db } from './jobs.ts';
import { syncMemberName } from './sync.ts';

/**
 * เชื่อม Gateway เพื่อรับ guildMemberUpdate (เปลี่ยนชื่อเล่น/ชื่อแสดงผลใน Discord) แล้วซิงก์ชื่อเข้าเว็บ
 * ต้องเปิด "Server Members Intent" ใน Developer Portal → Bot ไม่งั้น login ไม่ผ่าน — กรณีนั้นแค่ log เตือน
 * แล้วให้ส่วนอื่นของบอท (ส่งรูป/แจ้งเตือน) ทำงานต่อได้
 */
export async function startGateway() {
  if (env.gatewayOff) {
    console.log('[gateway] disabled (DISCORD_GATEWAY=off)');
    return async () => {};
  }
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

  client.on(Events.GuildMemberUpdate, async (_old, m) => {
    try {
      const n = await syncMemberName({ discordGuildId: m.guild.id, discordUserId: m.id, displayName: m.displayName });
      if (n) console.log(`[gateway] synced name for ${m.id} → ${m.displayName}`);
    } catch (e) {
      console.error('[gateway] sync failed:', (e as Error).message);
    }
  });

  /** ตอนเริ่ม: ไล่ซิงก์ทุกกิลด์ที่ตั้ง server ID ไว้ (ชดเชยชื่อที่เปลี่ยนตอนบอทปิดอยู่) */
  client.once(Events.ClientReady, async () => {
    try {
      const profiles = await db.select({ id: guildProfile.discordGuildId }).from(guildProfile).where(isNotNull(guildProfile.discordGuildId));
      for (const { id } of profiles) {
        const guild = id ? client.guilds.cache.get(id) : undefined;
        if (!guild) continue; // บอทยังไม่ได้อยู่ในเซิร์ฟเวอร์นี้
        let changed = 0;
        for (const m of (await guild.members.fetch()).values())
          changed += await syncMemberName({ discordGuildId: guild.id, discordUserId: m.id, displayName: m.displayName });
        console.log(`[gateway] initial sync ${guild.name}: ${changed} name(s) updated`);
      }
    } catch (e) {
      console.error('[gateway] initial sync failed:', (e as Error).message);
    }
  });

  try {
    await client.login(env.botToken);
    console.log('[gateway] connected');
  } catch (e) {
    console.error(
      `[gateway] login failed: ${(e as Error).message}\n  → เปิด "Server Members Intent" ที่ Developer Portal → Bot แล้วรีสตาร์ท (ฟีเจอร์ซิงก์ชื่อจะยังไม่ทำงาน ส่วนอื่นของบอทปกติ)`
    );
  }
  return async () => {
    await client.destroy();
  };
}
