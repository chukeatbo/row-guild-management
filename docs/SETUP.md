# Setup (Windows / PowerShell)

โครงสร้าง monorepo, dependencies, Better Auth config, schema และ migration ถูกสร้างไว้แล้วใน repo
เหลือขั้นตอนที่ต้องทำบนเครื่องคุณเอง:

## 1. เตรียมเครื่อง
```powershell
node -v       # v22 LTS ขึ้นไป
pnpm -v
pnpm install
```
ถ้า PowerShell ฟ้อง script ถูกปิด: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

## 2. Infra (เปิด Docker Desktop ก่อน)
```powershell
copy .env.example .env     # แล้วเติมค่า Discord + BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up -d       # postgres + redis
```

## 3. Discord Developer Portal
สร้าง Application → OAuth2 → Redirects: `http://localhost:5173/api/auth/callback/discord`
นำ Client ID / Secret ใส่ `.env` (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`)

## 4. Migrate
```powershell
$env:DATABASE_URL = "postgres://row:row@localhost:5433/row"
pnpm db:migrate      # apply packages/db/drizzle/*.sql (สร้างไว้แล้ว)
pnpm db:seed         # อาชีพ 13 สาย + ไอคอน (รันซ้ำได้ ไม่ทับค่าที่ Super Admin แก้)
```

## 5. ทดสอบ
```powershell
pnpm dev:web         # http://localhost:5173 → Login with Discord
pnpm typecheck
```

## เมื่อเปลี่ยน schema
- **ตาราง Better Auth** (เปลี่ยน plugin/role/field): `pnpm auth:generate` แล้ว `pnpm db:generate && pnpm db:migrate`
  ห้ามแก้ `packages/db/src/schema/auth.ts` ด้วยมือ
- **ตารางของเรา**: แก้ `packages/db/src/schema/*.ts` → `pnpm db:generate && pnpm db:migrate`

## ข้อควรรู้ (เวอร์ชันที่ติดตั้งจริง)
- **SvelteKit 3**: ไม่มี alias `$lib` แล้ว ใช้ `#lib/...ts` (ใส่นามสกุล); `$app/environment` → `$app/env`;
  type `Handle` อยู่ที่ `@sveltejs/kit/hooks`; `$app/server` (`getRequestEvent`) ยังใช้ได้
- **Better Auth 1.7**: `sveltekitCookies` / `svelteKitHandler` จาก `better-auth/svelte-kit`,
  access control จาก `better-auth/plugins/access` และ `better-auth/plugins/organization/access`
- CLI คือ `@better-auth/cli` (bin ชื่อ `better-auth`) ติดตั้งใน `packages/auth`; config สำหรับ CLI อยู่ที่ `packages/auth/src/cli.ts`
- Vite config โหลด `.env` จาก root ให้ `process.env` (เพราะ `@row/*` อ่านผ่าน process.env)
- ยังไม่ได้ติดตั้ง Tailwind / shadcn-svelte (ทำใน Phase 1)

## Super Admin คนแรก
1. `pnpm dev:web` แล้ว login ด้วย Discord หนึ่งครั้ง (เพื่อสร้าง user)
2. `pnpm db:grant-admin <Discord ID ของคุณ>` (เปิด Developer Mode ใน Discord → คลิกขวาโปรไฟล์ → Copy User ID)
3. รีเฟรช — จะเห็นเมนู Admin → แท็บ "กิลด์" → สร้างกิลด์ (ใส่ Discord ID เจ้าของ หรือเว้นว่างให้ตัวเองเป็น owner)
4. ผู้เล่นอื่น login แล้วส่ง Discord ID ให้ Guild Master/Officer เพิ่มที่หน้า สมาชิก → สมาชิกกิลด์

## Discord bot (Phase 6)
1. Developer Portal → Bot: คัดลอก token ใส่ `DISCORD_BOT_TOKEN` (ไม่ต้องเปิด intent พิเศษสำหรับ Phase นี้ — ใช้ REST ส่งข้อความอย่างเดียว)
2. เชิญบอทเข้าเซิร์ฟเวอร์ (ต้องมีสิทธิ์ View Channel / Send Messages / Attach Files):
   `https://discord.com/oauth2/authorize?client_id=<DISCORD_CLIENT_ID>&scope=bot&permissions=52224`
3. ตั้ง `RENDER_SECRET` เป็นค่าสุ่มยาวๆ (ห้ามใช้ `change-me` — เว็บและบอทปฏิเสธ) แล้ว **รีสตาร์ท dev:web** ให้โหลดค่าใหม่
4. ตั้ง Channel ID ที่หน้า Guild (แจ้งเตือน / ส่งรูป / ประมูล)
5. ติดตั้งเบราว์เซอร์สำหรับแคปรูป: `npx playwright-core install chromium` หรือตั้ง `CHROMIUM_PATH` เป็น Chrome/Edge ที่มีอยู่
6. `docker compose up -d` (Redis) แล้ว `pnpm dev:web` + `pnpm dev:bot` (เปิดสองเทอร์มินัล)

bot ทำ: worker รับงานจากเว็บ (ส่งรูป, แจ้งลา, แจ้งผู้ได้ไอเทม) + scheduler ทุกนาที (เลื่อนรอบ event ผ่าน `POST /api/internal/rollover`, เตือนก่อนเริ่ม 60 นาที พร้อมรูปปาร์ตี้)
