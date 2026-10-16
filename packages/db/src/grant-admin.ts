import { and, eq } from 'drizzle-orm';
import { account, createDb, user } from './index';

/**
 * ตั้ง Super Admin จาก Discord ID (ผู้ใช้ต้องเคย login มาก่อนอย่างน้อยหนึ่งครั้ง)
 *   pnpm db:grant-admin <discordId>
 */
const discordId = process.argv[2];
if (!discordId) {
  console.error('Usage: pnpm db:grant-admin <discordId>');
  process.exit(1);
}

const db = createDb();
const [row] = await db
  .select({ userId: account.userId, name: user.name })
  .from(account)
  .innerJoin(user, eq(account.userId, user.id))
  .where(and(eq(account.providerId, 'discord'), eq(account.accountId, discordId)))
  .limit(1);

if (!row) {
  console.error(`No user with Discord ID ${discordId}. Log in to the site once first.`);
  process.exit(1);
}

await db.update(user).set({ role: 'admin' }).where(eq(user.id, row.userId));
console.log(`Granted Super Admin to ${row.name} (${row.userId})`);
process.exit(0);
