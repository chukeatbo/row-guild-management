import { guildProfile } from '@row/db';
import { DISCORD_QUEUE, type DiscordJob } from '@row/shared';
import { Queue } from 'bullmq';
import { eq } from 'drizzle-orm';
import { db } from './db.ts';

/** เว็บส่งงานให้ bot ผ่าน BullMQ (bot เป็น process แยก — CLAUDE.md ข้อ 5) */
const g = globalThis as unknown as { __rowDiscordQueue?: Queue };

function getQueue() {
	if (g.__rowDiscordQueue) return g.__rowDiscordQueue;
	const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
	g.__rowDiscordQueue = new Queue(DISCORD_QUEUE, {
		connection: {
			host: url.hostname,
			port: Number(url.port || 6379),
			password: url.password ? decodeURIComponent(url.password) : undefined,
			// Redis ล่ม → ล้มเร็วแทนที่จะค้างคำขอของผู้ใช้
			enableOfflineQueue: false,
			connectTimeout: 2000,
			retryStrategy: (n: number) => Math.min(n * 300, 3000)
		},
		defaultJobOptions: {
			attempts: 3,
			backoff: { type: 'exponential', delay: 5000 },
			removeOnComplete: 100,
			removeOnFail: 200
		}
	});
	g.__rowDiscordQueue.on('error', () => {}); // ไม่ให้ error ของ connection ทำ process ล้ม; ผลลัพธ์ดูจาก enqueue()
	return g.__rowDiscordQueue;
}

/** คืน true เมื่อเข้าคิวสำเร็จ — ผู้เรียกที่เป็นแค่ "แจ้งเตือน" ไม่ต้องรอ/ไม่ต้อง fail เมื่อ false */
export async function enqueueDiscord(job: DiscordJob): Promise<boolean> {
	try {
		const q = getQueue();
		await Promise.race([
			q.waitUntilReady(),
			new Promise((_, rej) => setTimeout(() => rej(new Error('redis timeout')), 3000))
		]);
		await q.add(job.type, job);
		return true;
	} catch (e) {
		console.error('enqueueDiscord failed', (e as Error).message);
		return false;
	}
}

export async function guildChannels(organizationId: string) {
	const [p] = await db.select().from(guildProfile).where(eq(guildProfile.organizationId, organizationId));
	return {
		notify: p?.notifyChannelId || null,
		image: {
			glMain: p?.imageGlMainChannelId || null,
			glSub: p?.imageGlSubChannelId || null,
			siege: p?.imageSiegeChannelId || null,
			polarity: p?.imagePolarityChannelId || null
		},
		auction: p?.auctionChannelId || null
	};
}
