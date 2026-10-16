import { createDb, guildEvent, guildProfile } from '@row/db';
import type { DiscordJob } from '@row/shared';
import { eq } from 'drizzle-orm';
import { postMessage } from './discord.ts';
import { bangkokTime, eventName, msg } from './messages.ts';
import { renderPng } from './render.ts';

export const db = createDb();

const channels = async (orgId: string) => {
  const [p] = await db.select().from(guildProfile).where(eq(guildProfile.organizationId, orgId));
  return { notify: p?.notifyChannelId || null, auction: p?.auctionChannelId || p?.notifyChannelId || null };
};

/** งานที่ไม่มีห้องปลายทางถือว่าข้าม (ไม่ retry) — ผู้ใช้ยังไม่ได้ตั้งห้อง */
export async function handle(job: DiscordJob) {
  switch (job.type) {
    case 'send_image': {
      const png = await renderPng(job.kind, job.targetId, job.field);
      let caption = job.caption ?? msg.imageCaption.auction();
      if (job.kind === 'event') {
        const [ev] = await db.select().from(guildEvent).where(eq(guildEvent.id, job.targetId));
        caption = job.caption ?? msg.imageCaption.event(ev ? eventName(ev) : '', job.field);
      }
      await postMessage(job.channelId, caption, { name: `${job.kind}.png`, data: png });
      return;
    }
    case 'leave': {
      const ch = (await channels(job.orgId)).notify;
      if (!ch) return;
      const [ev] = await db.select().from(guildEvent).where(eq(guildEvent.id, job.eventId));
      if (!ev) return;
      await postMessage(
        ch,
        msg.leave({
          ign: job.ign,
          event: eventName(ev),
          when: ev.startsAt ? bangkokTime(ev.startsAt) : null,
          reason: job.reason,
          cancelled: job.cancelled,
          byOther: job.byOther
        })
      );
      return;
    }
    case 'billing_reminder': {
      const ch = (await channels(job.orgId)).notify;
      if (!ch) return;
      await postMessage(ch, msg.billingReminder({ daysLeft: job.daysLeft, when: bangkokTime(new Date(job.endsAt)), renewUrl: job.renewUrl }));
      return;
    }
        case 'auction_award': {
      const ch = (await channels(job.orgId)).auction;
      if (!ch) return;
      await postMessage(ch, msg.award({ ign: job.ign, item: job.item }));
      return;
    }
  }
}

