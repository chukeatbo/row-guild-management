// entry สำหรับ Better Auth CLI เท่านั้น (generate schema) — ไม่ต้องต่อ DB จริง
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, organization } from 'better-auth/plugins';
import { ac, roles } from './permissions';

export const auth = betterAuth({
  database: drizzleAdapter({} as never, { provider: 'pg' }),
  socialProviders: { discord: { clientId: 'x', clientSecret: 'x' } },
  plugins: [admin(), organization({ ac, roles, creatorRole: 'owner' })]
});
