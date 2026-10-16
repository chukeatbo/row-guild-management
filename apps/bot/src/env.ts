const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`${k} is not set (see .env.example)`);
  return v;
};

export const env = {
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  /** URL ของเว็บที่ bot เปิดแคปรูป / เรียก endpoint ภายใน */
  webUrl: (process.env.WEB_URL ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  get botToken() {
    return need('DISCORD_BOT_TOKEN');
  },
  get renderSecret() {
    const v = need('RENDER_SECRET');
    if (v === 'change-me') throw new Error('RENDER_SECRET must be changed from the default');
    return v;
  },
  /** ปิดการเชื่อม Gateway (ซิงก์ชื่อ) — ใช้ตอนทดสอบหรือยังไม่ได้เปิด Server Members Intent */
  gatewayOff: process.env.DISCORD_GATEWAY === 'off',
  /** ใช้ทดสอบกับ Discord ปลอม; ปกติไม่ตั้ง */
  discordApi: process.env.DISCORD_API_BASE,
  /** path ของ Chromium/Edge/Chrome; ไม่ตั้ง = ใช้ที่ `npx playwright install chromium` ลงไว้ */
  browserPath: process.env.CHROMIUM_PATH
};

export const redisConnection = () => {
  const u = new URL(env.redisUrl);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    password: u.password ? decodeURIComponent(u.password) : undefined,
    maxRetriesPerRequest: null as null // BullMQ Worker ต้องการค่านี้
  };
};
