# ROW Guild Management

เว็บจัดการกิลด์เกม **Ragnarok: The New World** (ROW)

> ภาษา: ตอบผู้ใช้เป็น **ภาษาไทย** ส่วนโค้ด ชื่อตัวแปร และ commit message เป็นภาษาอังกฤษ
> ไฟล์นี้สรุปการออกแบบที่ตกลงกันไว้ก่อนเริ่มโค้ด (จากการคุยบน claude.ai) อ่านเอกสารใน `docs/` ประกอบ

## เป้าหมาย

ระบบเดียวที่ Guild Master / Officer ใช้จัดการกิลด์ครบวงจร: สมาชิก ปาร์ตี้สงคราม ระบบลา คิวประมูล จองบอส
และเชื่อม Discord (แจ้งเตือนตามเวลา, ส่งรูปปาร์ตี้ลงห้อง, sync ชื่อ)

## Scope ฟีเจอร์

ลำดับความสำคัญ: **P0** ต้องมี / **P1** ควรมี / **P2** ทีหลังได้

| # | ฟีเจอร์ | P |
|---|---|---|
| 1 | รายละเอียดกิลด์ | P0 |
| 2 | จัดการสมาชิก + กราฟสรุปอาชีพ (แยกตาม Tank/DPS/Healer/Support) | P0 |
| 3 | จัดการปาร์ตี้ Guild League | P0 |
| 4 | จัดการปาร์ตี้ Siege War | P0 |
| 5 | จัดการปาร์ตี้ Elite Party of Polarity Zone | P0 |
| 6 | ลาวอร์ Guild League / Siege War | P0 |
| 7 | คิวจองประมูล Guild | P1 |
| 8 | Scheduler notification ลง Discord | P0 |
| 9 | จองบอสดันกิลด์ | P1 |
| 10 | ปุ่ม "Send to Discord" capture ปาร์ตี้/คิวประมูลเป็นรูปส่งลง Discord | P0 |
| 11 | Auto sync เมื่อเปลี่ยนชื่อใน Discord (ใช้ Discord ID เป็น key ไม่ต้อง `oldName=newName`) | P2 |
| 12 | หน้า Super Admin จัดการ master data (บอส, อาชีพ, ไอเทมประมูล) | P0 |

ไอเดียเสริมที่เห็นด้วยแล้ว (ยังไม่เร่ง): Audit Log (P1), Party Template, ล็อกปาร์ตี้, ตัวสำรอง (bench),
Activity Tracker, ปฏิทินรวม + export .ics, Announcement, PWA/mobile-friendly

## Tech stack

| ส่วน | เลือกใช้ |
|---|---|
| Frontend + API | **SvelteKit** (TypeScript) — server routes / form actions / `hooks.server.ts` (ไม่ใช้ NestJS) |
| Auth | **Better Auth** + Discord OAuth, `admin` plugin (Super Admin), `organization` plugin (Guild) |
| DB | PostgreSQL + **Drizzle ORM** |
| Validation | Zod (+ Superforms ฝั่งฟอร์ม) |
| Queue/Scheduler | BullMQ + Redis |
| Bot | discord.js |
| Image render | Playwright (หรือ satori + resvg ถ้าอยากเบากว่า) |
| UI | Tailwind + shadcn-svelte, DnD: `svelte-dnd-action`, กราฟ: LayerChart/Chart.js |
| Package manager | pnpm workspace (Node 22 LTS) |

## โครงสร้าง repo (pnpm monorepo)

```
apps/
  web/        SvelteKit: UI + API + Better Auth
  bot/        discord.js + BullMQ worker + render (process แยก)
packages/
  db/         Drizzle schema + migrations  (@row/db)   ใช้ร่วม web + bot
  auth/       Better Auth permissions/config (@row/auth)
  shared/     Zod schemas, constants, types (@row/shared)
docs/         permissions, roadmap, setup
```

## การตัดสินใจด้านสถาปัตยกรรม (อย่าเปลี่ยนโดยไม่ถามผู้ใช้)

1. **Guild = Better Auth `organization`** ไม่สร้างตาราง guild/member ซ้ำ ข้อมูลเฉพาะเกมอยู่ในตารางของเรา
   อ้าง `organization.id` และ `user.id`
2. **Discord ID อยู่ใน `account.accountId`** (`providerId = 'discord'`) ไม่ได้อยู่ใน `user` — bot หา user จากตรงนี้
3. **User 1 : N Character** — `character.userId` เป็น nullable เพื่อให้ Officer เพิ่มตัวละครของคนที่ยังไม่ login ได้
   และมี `ign` (ชื่อในเกม) แยกจากชื่อ Discord เสมอ
4. **Party Builder เป็น generic** — GL / Siege / Polarity ใช้ตารางเดียวกัน (`guild_event.type`) ต่างกันที่ config
5. **Bot + Worker แยก process จาก web** (WebSocket ค้าง, cron, Playwright กินทรัพยากร) แต่ใช้ `@row/db` ร่วมกัน
   อ่าน/เขียน DB ตรงๆ ไม่ต้องยิง HTTP กลับมาที่เว็บ
6. **รูป capture**: web มี route render-only เช่น `/render/party/[id]` (ไม่มี navbar) → bot ใช้ Playwright
   screenshot → ส่ง Discord **ต้องป้องกัน route นี้ด้วย signed token / `RENDER_SECRET`** ห้ามเปิดสาธารณะ
7. **เวลา**: เก็บ UTC ในฐานข้อมูล **แสดงผลและช่องกรอกตามโซนเวลาของเครื่องผู้ใช้ (ไม่ผูกกับภาษา — ผู้ใช้เปลี่ยนใจแล้ว)** พร้อมเขียนโซนกำกับเสมอ เช่น `9:00 PM (UTC+7)`
   ไคลเอนต์อ่านโซนจาก `Intl` แล้วเก็บ cookie `tz` (root `+layout.svelte`) → server อ่านเป็น `locals.tz` (ไม่มี/ไม่ถูกต้อง = UTC); ครั้งแรกที่ยังไม่มี cookie SSR แสดง UTC แวบเดียวแล้วเปลี่ยนเป็นโซนเครื่อง
   helper อยู่ที่ `apps/web/src/lib/datetime.ts` (รองรับ DST/offset ครึ่งชั่วโมง คำนวณ offset ตามวันที่ของ event; ฟอร์มใช้ `fromInput(value, tz)` / `toInput(date, tz)`) — **ห้ามใช้ offset คงที่**
   ยกเว้นตาราง `event_schedule` ที่กำหนดวัน/เวลาตามเวลา `Asia/Bangkok` ของกิลด์เสมอ (`GUILD_ZONE`) เพื่อไม่ให้ "วัน" เลื่อนตามเครื่องคนที่เปิด
8. **กันข้อมูลชนที่ระดับ DB** ด้วย unique index (จองบอสชน, ลาซ้ำ, slot ซ้ำ, ตัวละครชื่อซ้ำในกิลด์)
9. **ทุก mutation สำคัญ** (จัดปาร์ตี้, ประมูล, เปลี่ยน role) ต้องเขียน `audit_log`
10. **Party Leader แก้ได้เฉพาะปาร์ตี้ตัวเอง** — role อย่างเดียวไม่พอ ต้องเช็ค `party.leaderCharacterId` ใน server code

## สิทธิ์ (RBAC)

Role ใน Guild: `owner` (Guild Master) / `officer` / `leader` (Party Leader) / `member`
Super Admin มาจาก admin plugin (ระดับระบบ) ตารางเต็มอยู่ที่ `docs/permissions.md`
โค้ดอยู่ที่ `packages/auth/src/permissions.ts`

## สมมติฐานชั่วคราว (ผู้ใช้ยังไม่ได้ตอบ — ถามก่อนลงรายละเอียดส่วนที่เกี่ยวข้อง)

- รองรับหลายกิลด์ (organization plugin รองรับอยู่แล้ว) แต่เริ่มใช้งานจริงกิลด์เดียว
- 1 คนมีหลายตัวละครได้
- **กติกาคิวประมูล: ยังไม่กำหนด** (ตามเวลา / ตามแต้ม / สุ่ม / cooldown?) ต้องถามก่อนทำ Phase 4
- **ขนาดปาร์ตี้ (ยืนยันแล้ว)**: กิลด์ 150 คน, ปาร์ตี้ย่อย 5 คน, group party ≤ 8 ปาร์ตี้ย่อย (40 คน)
  GL สนามบน 12 ปาร์ตี้ 3 group (เลน บน/กลาง/ล่าง), สนามล่าง = คนที่เหลือ (~90) แบ่ง group ละ 40
  Siege = จำนวน group ไม่จำกัด, Polarity = 50 คน (10 ปาร์ตี้ย่อยแบบแบน **ไม่มี group** — ผู้ใช้สั่ง; ภายในเก็บเป็นกลุ่มซ่อน 1 อัน, UI ซ่อนชั้น group, server ปฏิเสธ add/deleteGroup) — ตั้งผ่าน `guild_event.config` / `EVENT_PRESETS`
  มีตาราง `party_group` คั่นระหว่าง event กับ party

## Commands

```bash
docker compose up -d                  # postgres + redis
pnpm dev:web                          # SvelteKit  http://localhost:5173
pnpm dev:bot                          # bot + worker
pnpm db:generate && pnpm db:migrate   # drizzle migration
pnpm typecheck
```

## ข้อควรระวัง

- **API ของ Better Auth เปลี่ยนตามเวอร์ชัน** (import path ของ `better-auth/svelte-kit`, `getRequestEvent`,
  `plugins/access`, ชื่อ CLI) — ตรวจเอกสารเวอร์ชันที่ติดตั้งจริงก่อน อย่าเชื่อโค้ดตัวอย่างใน repo ทั้งหมด
- `packages/db/src/schema/auth.ts` เป็น **placeholder** ต้องสร้างด้วย Better Auth CLI (ดู `docs/SETUP.md`) ห้ามเขียนมือ
- ปลั๊กอิน `sveltekitCookies` ต้องอยู่ท้ายสุดใน `plugins: []`
- Discord bot ต้องเปิด **Server Members Intent** ถึงจะรับ event `guildMemberUpdate` ได้
- ห้าม commit `.env` / token / secret

## สถานะปัจจุบัน

อัปเดตส่วนนี้ทุกครั้งที่ทำเสร็จ

- [x] ออกแบบ stack, schema, permission matrix
- [x] Scaffold ไฟล์ตั้งต้น (workspace, docker-compose, `packages/db`, `packages/auth/permissions.ts`)
- [x] ติดตั้ง pnpm และ dependencies
- [x] สร้าง `apps/web` (SvelteKit 3 — ใช้ `#lib/...ts` แทน `$lib`, ดู `docs/SETUP.md`)
- [x] ตั้งค่า Better Auth + Discord login (โค้ดพร้อม, ยังไม่ได้ทดสอบ login จริง — รอ Discord credentials) + generate auth schema
- [x] Drizzle schema ครบ + สร้าง migration แล้ว (`packages/db/drizzle/`) / ER ที่ `docs/er-diagram.md`
- [x] Apply migration + seed อาชีพ 13 สายแล้ว (Postgres ของโปรเจกต์อยู่ที่พอร์ต **5433** เพราะเครื่องผู้ใช้มี Postgres อื่นใช้ 5432)
- **UI อาชีพ**: เก็บ `game_class.iconUrl` ไว้ แต่หน้าเว็บ/รูป capture **ยังไม่แสดงไอคอน** แสดงเฉพาะสีอาชีพ (`game_class.color`) — ผู้ใช้สั่งไว้ชั่วคราว
- [x] ตั้งค่า Discord login ใช้งานได้จริงแล้ว (ผู้ใช้ login ผ่านและเป็น Super Admin แล้ว)
- [x] **Phase 1**: Dashboard + กราฟอาชีพ, รายละเอียดกิลด์, สมาชิก/ตัวละคร, Super Admin (อาชีพ/บอส/ไอเทม/กิลด์)
- **Design system**: Tailwind v4 + token ใน `apps/web/src/app.css` (light/dark/system, ชื่อ token แบบ shadcn), คลาส `.btn-* .input .card .table` — ยังไม่ได้ติดตั้ง shadcn-svelte
- **i18n**: th/en/fil/id/zh(简体) ที่ `apps/web/src/lib/i18n/` (key ใหม่ต้องใส่ครบทุกภาษา ไม่งั้น typecheck ไม่ผ่าน), เก็บภาษา/ธีมใน cookie `locale`/`theme`
- **กิลด์ปัจจุบัน** เลือกจาก cookie `guild` แล้วตรวจกับ membership เสมอ (`lib/server/guard.ts`); Super Admin ถือเป็น owner ทุกกิลด์; กิลด์ที่ถูกระงับสมาชิกทั่วไปเข้าไม่ได้
- **ตั้ง Super Admin**: login ครั้งหนึ่งก่อน แล้วรัน `pnpm db:grant-admin <discordId>`; เพิ่มสมาชิกเข้ากิลด์ด้วย Discord ID (ไม่ใช้ระบบ invitation/email)
- ตาราง `member` ของ Better Auth ไม่มี unique (org,user) — เช็คซ้ำใน server code
- [x] **Phase 2** Party Builder (ทดสอบ 22 เคสด้วย session ทดสอบ + ลาก-วางใน Edge จริงผ่านแล้ว): `/events` (การ์ด event ถาวร 3 ใบ — ดูข้อ "Event ถาวร" ด้านล่าง), `/events/[id]` (ลาก-วาง, group/ปาร์ตี้, หัวหน้า, ล็อก, เพดานคน/สนาม)
  - layout เริ่มต้นอยู่ที่ `lib/server/events.ts` (`presetPlan`): GL = สนามบน 3 group×4 ปาร์ตี้ (เลน บน/กลาง/ล่าง) + สนามล่าง 8+8+2; Polarity = 10 ปาร์ตี้ในกลุ่มซ่อน 1 อัน (ไม่มี group, migration `0004` รวมข้อมูลเดิมที่เคยเป็น 5+5); Siege = 1 group×8 — แก้ได้ใน builder
  - บันทึกแบบ replace-all ต่อ event (`saveLayout`, last-write-wins ยังไม่มี optimistic lock); server ตรวจ: leader แก้ได้เฉพาะปาร์ตี้ที่ `leaderCharacterId` เป็นตัวละครตัวเอง, ปาร์ตี้ล็อก, event closed/done (เฉพาะ officer+), ปาร์ตี้เต็ม, ซ้ำ, คนลา, เพดานคน
  - svelte-dnd-action: ต้อง render wrapper ให้ทุก item รวม shadow placeholder และเก็บ id ตัวละครใน `cid` (ไลบรารีเปลี่ยน `id` ของ shadow)
  - ยังไม่มี: UI ลา (Phase 3 — ตาราง `event_leave` มีแล้วและ builder เคารพอยู่), Send to Discord, ตัวสำรอง (bench)
- [x] **Phase 3** ระบบลา (ทดสอบ 22 เคส + UI จริงผ่านแล้ว): `/leave` เฉพาะ event GL + Siege (`LEAVE_EVENT_TYPES` ใน `@row/shared`)
  - ลาได้เฉพาะตัวละครตัวเองก่อน `leaveDeadline`; Officer ขึ้นไปลาแทน/ยกเลิกของใครก็ได้แม้เลย deadline; event ที่ `done` ลาไม่ได้
  - ลา = ลบออกจากปาร์ตี้ของ event นั้น + เคลียร์หัวหน้าอัตโนมัติ (ใน transaction เดียว); ยกเลิกลา = กลับไปอยู่ "ยังไม่ได้จัด"
  - ยังไม่มี: แจ้งเตือน Discord เมื่อมีคนลา (Phase 6)
- [x] **Event ถาวร (ประเภทละ 1) + ตารางรายสัปดาห์ + โซนเวลา (ตามเครื่องผู้ใช้)** (ทดสอบ 56 เคส + UI จริงผ่านแล้ว) — ผู้ใช้สั่ง: ไม่สร้าง event ใหม่ทุกรอบ ให้แก้ปาร์ตี้ของ event เดิมก่อนแต่ละรอบ
  - **1 กิลด์มี event ประเภทละ 1 อัน** (unique `(organization_id, type)` ใน `guild_event`); สร้างอัตโนมัติให้ครบ 3 ประเภทตอนเปิดหน้า (`ensureStandingEvents`); ไม่มี UI สร้าง/ลบ event; `starts_at` เป็น null ได้ (Polarity ที่ยังไม่ตั้งตาราง)
  - ตาราง `event_schedule` (ต่อกิลด์ต่อประเภท): วัน (0=อาทิตย์), เวลาเริ่ม (เวลา Bangkok), ปิดรับลาก่อนเริ่มกี่ชม., เปิด/ปิด — แก้ที่หน้า Guild (owner); ใช้เลื่อน `starts_at` ไปรอบถัดไปเท่านั้น
  - ค่าเริ่มต้น: GL อังคาร+พฤหัส, Siege อาทิตย์ (เปิด, **เวลา 20:00 เป็นค่าสมมติ ผู้ใช้ยังไม่ยืนยันเวลาจริง**, ปิดรับลา 2 ชม.ก่อนเริ่ม), Polarity ปิดไว้ให้กิลด์ตั้งเอง
  - **เลื่อนรอบอัตโนมัติ** (lazy ตอนเปิด `/events` `/leave` `/events/[id]`; Phase 6 ให้ bot เรียกฟังก์ชันเดียวกัน): เมื่อรอบเก่าเริ่มไปเกิน 3 ชม. (`ROLLOVER_GRACE_HOURS`) → ตั้งวันรอบถัดไป, status กลับเป็น `open`, **ล้างรายการลา**; ปาร์ตี้/หัวหน้า/ล็อกคงเดิม; ปลอดภัยเมื่อเรียกพร้อมกัน (เช็คเวลาใน SQL เดียวกับ UPDATE — อย่าเทียบ `starts_at = Date` เพราะ DB เก็บไมโครวินาที)
  - ตารางปิดอยู่ = ไม่เลื่อนอัตโนมัติ (ผู้ใช้กำหนดวันเองที่ปุ่มแก้ไข); แก้วันเองเป็นครั้งเดียวได้และไม่ถูกทับจนกว่ารอบนั้นจบ; บันทึกตารางใหม่ → ย้ายไปรอบถัดไปตามตาราง (ล้างลาเฉพาะเมื่อวันที่เปลี่ยน)
  - title ว่าง (`''`) = UI แสดงชื่อประเภทตามภาษา (`eventLabel`)
- [x] **Role ของตัวละคร (override ได้)** (ทดสอบ 21 เคส + UI จริงผ่านแล้ว): `character.role` (null = ตามอาชีพ `game_class.role`) — เช่น Priest/Bard สาย dmg
  - role ที่ใช้จริง = `coalesce(character.role, game_class.role)` คำนวณใน `listCharacters` (`role`; `classRole` = ค่าตามอาชีพ, `roleOverride` = ที่เลือกเอง) — กราฟ Dashboard, สรุปในปาร์ตี้ (builder) ต้องใช้ `role` ไม่ใช่ `classRole`
  - แก้ได้ที่ฟอร์มตัวละคร (เจ้าของตัวละครหรือผู้มี `character:update_any`); ตารางสมาชิกมีคอลัมน์ Role + ตัวกรอง (ที่ตั้งเองมีพื้นหลังสี); ชิปตัวละครในปาร์ตี้มีจุดสี role
  - `pnpm db:seed-dev` ตั้งตัวอย่าง High Priest/Bard สาย dmg ให้กิลด์ทดสอบ
- **UI role ใน builder** (ผู้ใช้บอกว่าดูยาก): role แสดงเป็นไอคอน+สีเดียวกันทั้งระบบ (`lib/roles.ts` + `RoleIcon.svelte`: 🛡 Tank / ⚔ DPS / ❤ Healer / ✨ Support) — ชิปตัวละครมีกล่องไอคอน, หัวการ์ดปาร์ตี้มีแถวสรุปครบ 4 role (role ที่ไม่มีจะจาง), แถบสรุป role รวมด้านบนมีชื่อกำกับ, pool กรองตาม role ได้; หน้าสมาชิกใช้ไอคอนเดียวกัน — อย่าสร้างสีหรือไอคอน role ใหม่ที่อื่น ให้ import จาก `lib/roles.ts`
- **Combobox**: รายการยาว (ชื่อตัวละคร, อาชีพ) ใช้ `lib/components/Combobox.svelte` (พิมพ์ค้นหา, ลูกศร/Enter/Esc, ส่งค่าผ่าน hidden input `name` จึงใช้กับ form action ได้) แทน `<select>` — ผู้ใช้สั่งให้ใช้ทุกหน้าที่เป็น dropdown รายชื่อ; รายการสั้นคงที่ (role, สถานะ, ภาษา, กิลด์) ยังเป็น `<select>`
- [x] **Phase 4 คิวประมูล** (ทดสอบ 31 เคส + UI จริงผ่านแล้ว): `/auction` — **คิวถาวรต่อไอเทม** (ผู้ใช้พิมพ์ชื่อเอง เช่น "Relic STR (โล่)" — ในชีทแถวสีแดงคือชนิด Relic STR 8 แบบ), เรียงมาก่อนได้ก่อน (`auction_entry.createdAt`), 1 คนลงได้ 1 ตัวละครต่อคิว แต่ลงหลายคิวพร้อมกันได้
  - ผู้มี `auction:close` (officer ขึ้นไป) เพิ่มคิว (เลือกจาก master หรือพิมพ์ชื่อใหม่ → สร้างใน `auction_item`), **มอบให้ใครในคิวก็ได้ (ข้ามคนแรกได้** เช่นไม่มีเพชรพอ/ไม่อยู่) → คนนั้นหลุดจากคิว + บันทึกใน `auction_award` **คิวไม่ปิด**; เอาคนออก, ยกเลิกคิว; ทุกคน (`auction:enter`) ลงคิว/ออกเองได้; ลงใหม่ = ต่อท้ายคิว
  - ยังไม่มี: แจ้งเตือน/ส่งรูปคิวลง Discord (Phase 6); `auction.status closed/winner*` ไม่ได้ใช้แล้ว

## แนวทางทำงานร่วมกัน

- งานใหญ่ให้ทำทีละ phase ตาม `docs/roadmap.md` และสรุปแผนสั้นๆ ก่อนลงมือ
- เปลี่ยนการตัดสินใจในหัวข้อ "การตัดสินใจด้านสถาปัตยกรรม" ต้องถามผู้ใช้ก่อน
- รัน `pnpm typecheck` ก่อนบอกว่างานเสร็จ
- เจอจุดที่เอกสาร/โค้ดตัวอย่างขัดกับเวอร์ชันจริง ให้แก้ตามเวอร์ชันจริงและบอกผู้ใช้
