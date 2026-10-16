import { REST, Routes } from 'discord.js';
import { env } from './env.ts';

let rest: REST | undefined;
const client = () =>
  (rest ??= new REST({ version: '10', ...(env.discordApi ? { api: env.discordApi } : {}) }).setToken(env.botToken));

/** โพสต์ข้อความ (+ รูป PNG แนบ) ลงห้อง — ไม่ mention ใครอัตโนมัติ */
export async function postMessage(channelId: string, content: string, image?: { name: string; data: Buffer }) {
  await client().post(Routes.channelMessages(channelId), {
    body: { content, allowed_mentions: { parse: [] } },
    files: image ? [{ name: image.name, data: image.data, contentType: 'image/png' }] : undefined
  });
}
