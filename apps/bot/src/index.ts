import type { DiscordJob } from '@row/shared';
import { DISCORD_QUEUE } from '@row/shared';
import { Worker } from 'bullmq';
import { redisConnection } from './env.ts';
import { handle } from './jobs.ts';
import { closeBrowser } from './render.ts';
import { startGateway } from './gateway.ts';
import { startScheduler } from './scheduler.ts';

const worker = new Worker<DiscordJob>(DISCORD_QUEUE, (job) => handle(job.data), {
  connection: redisConnection(),
  concurrency: 2 // แคปรูปกินทรัพยากร
});
worker.on('completed', (job) => console.log(`[worker] ${job.name} ${job.id} done`));
worker.on('failed', (job, err) => console.error(`[worker] ${job?.name} ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message));
worker.on('error', (err) => console.error('[worker] error:', err.message));

const stopScheduler = startScheduler();
const stopGateway = startGateway(); // Promise — login ล้มเหลวไม่กระทบ worker/scheduler
console.log('[bot] worker + scheduler started');

async function shutdown() {
  await stopScheduler();
  await (await stopGateway)();
  await worker.close();
  await closeBrowser();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
