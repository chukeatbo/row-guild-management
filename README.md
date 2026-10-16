# ROW Guild Management

เว็บจัดการกิลด์เกม **Ragnarok: The New World** (ROW) — ระบบเดียวที่ Guild Master / Officer ใช้จัดการกิลด์ครบวงจร
พร้อมเชื่อม Discord (แจ้งเตือนตามเวลา, ส่งรูปปาร์ตี้ลงห้อง, ซิงก์ชื่อ)

## ฟีเจอร์

- **สมาชิก & ตัวละคร** — 1 คนมีหลายตัวละคร, กราฟสรุปอาชีพแยกตาม Tank / DPS / Healer / Support (override role ต่อตัวละครได้)
- **Party Builder** — Guild League, Siege War, Elite Party of Polarity Zone: ลาก-วาง, group/ปาร์ตี้, หัวหน้าปาร์ตี้, ล็อกปาร์ตี้
- **ตารางรายสัปดาห์** — event ถาวรประเภทละ 1 อัน เลื่อนรอบอัตโนมัติ, โซนเวลาตามเครื่องผู้ใช้
- **ระบบลา** — ลาวอร์ GL / Siege ก่อนปิดรับ, Officer ลาแทนได้
- **คิวประมูล** — คิวถาวรต่อไอเทม เรียงมาก่อนได้ก่อน
- **Discord** — เตือนก่อนเริ่ม 60 นาที, ปุ่ม "ส่งลง Discord" แคปปาร์ตี้/คิวประมูลเป็นรูป, ซิงก์ชื่อจาก Discord
- **Audit Log** — บันทึกทุก mutation สำคัญ
- **Super Admin** — จัดการ master data (อาชีพ, บอส, ไอเทม, กิลด์)
- รองรับ 5 ภาษา: ไทย / English / Filipino / Indonesia / 简体中文 และธีม light / dark / system

สถานะและรายละเอียดของแต่ละ phase ดูที่ [CLAUDE.md](CLAUDE.md) และ [docs/roadmap.md](docs/roadmap.md)

## Tech stack

| ส่วน | เลือกใช้ |
|---|---|
| Web + API | SvelteKit (TypeScript) |
| Auth | Better Auth + Discord OAuth (`admin`, `organization` plugin) |
| DB | PostgreSQL + Drizzle ORM |
| Queue / Scheduler | BullMQ + Redis |
| Bot | discord.js |
| Image render | Playwright |
| UI | Tailwind CSS v4, `svelte-dnd-action` |
| Monorepo | pnpm workspace, Node 22 LTS |

## โครงสร้าง repo

```
apps/
  web/        SvelteKit: UI + API + Better Auth
  bot/        discord.js + BullMQ worker + scheduler + render (process แยก)
packages/
  db/         Drizzle schema + migrations  (@row/db)
  auth/       Better Auth config / permissions (@row/auth)
  shared/     Zod schemas, constants, types (@row/shared)
docs/         permissions, roadmap, setup, ER diagram
```

## เริ่มต้นใช้งาน

ต้องมี Node.js 22+, pnpm และ Docker Desktop

```bash
pnpm install
cp .env.example .env          # เติม Discord credentials, BETTER_AUTH_SECRET, RENDER_SECRET
docker compose up -d          # postgres (พอร์ต 5433) + redis
pnpm db:migrate               # apply migration
pnpm db:seed                  # อาชีพ 13 สาย
pnpm dev:web                  # http://localhost:5173
pnpm dev:bot                  # bot + worker (ถ้าต้องการฟีเจอร์ Discord)
```

ขั้นตอนละเอียด (Discord Developer Portal, ตั้ง Super Admin คนแรก, ตั้งค่าบอท) อยู่ที่ [docs/SETUP.md](docs/SETUP.md)

## คำสั่งที่ใช้บ่อย

| คำสั่ง | ทำอะไร |
|---|---|
| `pnpm dev:web` / `pnpm dev:bot` | รันเว็บ / บอท |
| `pnpm db:generate` / `pnpm db:migrate` | สร้าง / apply migration |
| `pnpm db:seed` | seed ข้อมูลอาชีพ |
| `pnpm db:grant-admin <discordId>` | ตั้ง Super Admin |
| `pnpm db:seed-dev` / `pnpm db:unseed-dev` | ข้อมูลตัวอย่างสำหรับพัฒนา |
| `pnpm auth:generate` | สร้าง schema Better Auth ใหม่ |
| `pnpm typecheck` | ตรวจ type ทั้ง workspace |

## เอกสาร

- [docs/SETUP.md](docs/SETUP.md) — วิธีตั้งค่า
- [docs/permissions.md](docs/permissions.md) — ตารางสิทธิ์ (RBAC)
- [docs/roadmap.md](docs/roadmap.md) — แผนงานแต่ละ phase
- [docs/er-diagram.md](docs/er-diagram.md) — ER diagram

## ข้อควรระวัง

- ห้าม commit `.env`, token หรือ secret
- `RENDER_SECRET` ต้องเป็นค่าสุ่มยาวๆ (ไม่ใช่ `change-me`) เพราะใช้ป้องกัน route `/render/*`
- ห้ามแก้ `packages/db/src/schema/auth.ts` ด้วยมือ — สร้างด้วย `pnpm auth:generate`
- ซิงก์ชื่อจาก Discord ต้องเปิด **Server Members Intent** ใน Developer Portal
