import { DISCORD_QUEUE, eventImageTargets, type DiscordJob } from '@row/shared';
import { eventLeave, guildEvent, guildProfile, notificationSent, partySlot } from '@row/db';
import { Queue } from 'bullmq';
import { and, count, eq, gt, inArray, lte } from 'drizzle-orm';
import { postMessage } from './discord.ts';
import { env, redisConnection } from './env.ts';
import { db } from './jobs.ts';
import { bangkokTime, eventName, msg } from './messages.ts';

const REMINDER_MIN = 60;
export const TICK_MS = 60_000;

/** เรียกเว็บให้เลื่อน event ถาวรไปรอบถัดไป (ใช้ logic เดียวกับตอนเปิดหน้า) */
async function rollover() {
  try {
    const res = await fetch(`${env.webUrl}/api/internal/rollover`, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.renderSecret}` },
      signal: AbortSignal.timeout(20_000)
    });
    if (!res.ok) console.error('[scheduler] rollover http', res.status);
  } catch (e) {
    console.error('[scheduler] rollover failed:', (e as Error).message);
  }
}

/**
 * เตือนก่อน event เริ่ม 60 นาที: ข้อความ (ห้อง notify) + รูปปาร์ตี้ (ห้องรูป ถ้าไม่ตั้งใช้ห้อง notify)
 * จองสิทธิ์ส่งด้วย insert-on-conflict ลง notification_sent (กันซ้ำเมื่อรีสตาร์ท/รันหลายตัว);
 * ส่งข้อความไม่สำเร็จ → คืนสิทธิ์ให้ tick ถัดไปลองใหม่
 */
export async function reminders(queue: Queue, now = new Date()) {
  const horizon = new Date(now.getTime() + REMINDER_MIN * 60_000);
  const due = await db
    .select({ ev: guildEvent, notify: guildProfile.notifyChannelId, profile: guildProfile })
    .from(guildEvent)
    .innerJoin(guildProfile, eq(guildProfile.organizationId, guildEvent.organizationId))
    .where(and(gt(guildEvent.startsAt, now), lte(guildEvent.startsAt, horizon), inArray(guildEvent.status, ['open', 'closed'])));

  for (const { ev, notify, profile } of due) {
    if (!notify || !ev.startsAt) continue;
    const [claimed] = await db
      .insert(notificationSent)
      .values({ eventId: ev.id, startsAt: ev.startsAt, kind: 'reminder_60' })
      .onConflictDoNothing()
      .returning({ id: notificationSent.id });
    if (!claimed) continue;
    try {
      const [[a], [l]] = await Promise.all([
        db.select({ n: count() }).from(partySlot).where(eq(partySlot.eventId, ev.id)),
        db.select({ n: count() }).from(eventLeave).where(eq(eventLeave.eventId, ev.id))
      ]);
      await postMessage(notify, msg.reminder({ event: eventName(ev), when: bangkokTime(ev.startsAt), assigned: a?.n ?? 0, onLeave: l?.n ?? 0 }));
      // รูปไปห้องตามประเภทกิจกรรม (GL แยกบน/ล่าง); ไม่ได้ตั้งห้องรูปเลย → ส่งรูปรวมที่ห้องแจ้งเตือน
      const targets = eventImageTargets(ev.type, {
        glMain: profile.imageGlMainChannelId,
        glSub: profile.imageGlSubChannelId,
        siege: profile.imageSiegeChannelId,
        polarity: profile.imagePolarityChannelId
      });
      for (const t of targets.length ? targets : [{ channelId: notify, field: undefined }]) {
        const job: DiscordJob = { type: 'send_image', kind: 'event', orgId: ev.organizationId, targetId: ev.id, ...t };
        await queue.add(job.type, job);
      }
    } catch (e) {
      console.error('[scheduler] reminder failed, will retry:', (e as Error).message);
      await db.delete(notificationSent).where(eq(notificationSent.id, claimed.id));
    }
  }
}

export function startScheduler() {
  const queue = new Queue(DISCORD_QUEUE, {
    connection: redisConnection(),
    defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 100, removeOnFail: 200 }
  });
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await rollover();
      await reminders(queue);
    } catch (e) {
      console.error('[scheduler] tick error:', e);
    } finally {
      running = false;
    }
  };
  void tick();
  const timer = setInterval(tick, TICK_MS);
  return async () => {
    clearInterval(timer);
    await queue.close();
  };
}
