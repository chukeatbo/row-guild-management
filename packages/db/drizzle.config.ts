import { defineConfig } from 'drizzle-kit';

// .env อยู่ที่ root ของ monorepo (ไม่มีไฟล์ก็ข้าม เช่นใน CI ที่ตั้ง env เอง)
try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! }
});
