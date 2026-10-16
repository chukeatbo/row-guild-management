import { createDb, type Db } from '@row/db';
import { betterAuth, type BetterAuthPlugin } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, organization } from 'better-auth/plugins';
import { ac, roles } from './permissions';

export * from './permissions';

export interface CreateAuthOptions {
  /** ต้องเป็น plugin ตัวสุดท้ายใน plugins[] — ส่ง sveltekitCookies(getRequestEvent) มาจาก apps/web */
  extraLastPlugins?: BetterAuthPlugin[];
	/** ใช้ db ร่วมกับ app (ไม่ระบุ = สร้าง pool ใหม่) */
	db?: Db;
}

export function createAuth(opts: CreateAuthOptions = {}) {
  const db = opts.db ?? createDb();
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'pg' }),
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    socialProviders: {
      discord: {
        clientId: process.env.DISCORD_CLIENT_ID!,
        clientSecret: process.env.DISCORD_CLIENT_SECRET!
      }
    },
    plugins: [
      admin(), // Super Admin (ระดับระบบ)
      organization({ ac, roles, creatorRole: 'owner' }), // Guild
      ...(opts.extraLastPlugins ?? []) // sveltekitCookies ต้องอยู่ท้ายสุด
    ]
  });
}
