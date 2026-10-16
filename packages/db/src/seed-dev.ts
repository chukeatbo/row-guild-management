import { and, eq, isNotNull, like } from 'drizzle-orm';
import { account, auction, auctionAward, auctionEntry, auctionItem, character, createDb, gameClass, guildProfile, member, organization, user } from './index';

/**
 * ข้อมูลทดสอบสำหรับ dev เท่านั้น (ทุกอย่างปลอม ขึ้นต้นด้วย mock-)
 *   pnpm db:seed-dev <discordId ของคุณ>   สร้างกิลด์ mock-guild โดยคุณเป็น owner + สมาชิก/ตัวละครปลอม
 *   pnpm db:unseed-dev                     ลบข้อมูลปลอมทั้งหมด (ไม่แตะข้อมูลจริง)
 * รันซ้ำได้ (ไม่สร้างซ้ำ)
 */
const SLUG = 'mock-guild';
const USER_PREFIX = 'mock-user-';
const db = createDb();

if (process.argv[2] === '--unseed') {
  await db.delete(organization).where(eq(organization.slug, SLUG)); // cascade: member, character, event, ...
  await db.delete(user).where(like(user.id, `${USER_PREFIX}%`)); // cascade: account, session
  console.log('Removed mock guild and mock users');
  process.exit(0);
}

const ownerDiscordId = process.argv[2];
if (!ownerDiscordId) {
  console.error('Usage: pnpm db:seed-dev <your Discord ID>');
  process.exit(1);
}

const [owner] = await db
  .select({ id: user.id, name: user.name })
  .from(account)
  .innerJoin(user, eq(account.userId, user.id))
  .where(and(eq(account.providerId, 'discord'), eq(account.accountId, ownerDiscordId)))
  .limit(1);
if (!owner) {
  console.error(`No user with Discord ID ${ownerDiscordId}. Log in once first.`);
  process.exit(1);
}

// ---- pseudo-random แบบคงที่ (ผลเหมือนเดิมทุกครั้ง) ----
let seed = 20261016;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]!;
const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));

const NAME_A = ['Dark', 'Star', 'Moon', 'Sun', 'Blue', 'Red', 'Silver', 'Gold', 'Iron', 'Wild', 'Night', 'Storm', 'Frost', 'Fire', 'Shadow', 'Holy', 'Mega', 'Tiny', 'Lazy', 'Happy'];
const NAME_B = ['Wolf', 'Cat', 'Fox', 'Knight', 'Blade', 'Rose', 'Bear', 'Hawk', 'Dragon', 'Panda', 'Ninja', 'Mage', 'Heal', 'Bunny', 'Tiger', 'Poring', 'Angel', 'Devil', 'King', 'Queen'];
const THAI = ['น้องแมว', 'หมูกรอบ', 'ปลาทู', 'มะม่วง', 'ข้าวเหนียว', 'ส้มตำ', 'เจ้าตัวเล็ก', 'พี่หมี', 'ลุงตู่', 'ป้าแมว', 'นายพราน', 'หนูนา', 'คุณปู', 'แมวส้ม', 'ไอ้ตัวแสบ'];
const classes = await db.select({ id: gameClass.id, name: gameClass.name }).from(gameClass);
if (!classes.length) {
  console.error('No classes. Run pnpm db:seed first.');
  process.exit(1);
}
// น้ำหนักอาชีพให้ใกล้เคียงกิลด์จริง (High Priest/Druid/Alchemist มาก)
const WEIGHTS: Record<string, number> = { 'High Priest': 14, Druid: 10, Alchemist: 10, Bard: 8, 'Lord Knight': 8, 'Night Walker': 8, 'High Wizard': 7, 'Assassin Cross': 7, Paladin: 6, Champion: 6, Sniper: 5, Dancer: 5, Whitesmith: 3 };
const bag = classes.flatMap((c) => Array<string>(WEIGHTS[c.name] ?? 4).fill(c.id));

const usedNames = new Set<string>();
const newIgn = () => {
  for (;;) {
    const r = rnd();
    const n = r < 0.2 ? `${pick(THAI)}${int(1, 99)}` : r < 0.85 ? `${pick(NAME_A)}${pick(NAME_B)}${rnd() < 0.4 ? int(1, 99) : ''}` : `${pick(NAME_B)}${int(100, 999)}`;
    if (!usedNames.has(n)) return usedNames.add(n), n;
  }
};

// ---- กิลด์ + owner = คุณ ----
let [org] = await db.select().from(organization).where(eq(organization.slug, SLUG));
if (!org) {
  [org] = await db.insert(organization).values({ id: crypto.randomUUID(), name: 'Mock Guild (dev)', slug: SLUG, createdAt: new Date() }).returning();
  await db.insert(guildProfile).values({ organizationId: org!.id, description: 'กิลด์ทดสอบ — ข้อมูลทั้งหมดเป็นข้อมูลปลอม ลบได้ด้วย pnpm db:unseed-dev', server: 'SEA' });
}
const orgId = org!.id;
const addMember = async (userId: string, role: string) => {
  const [exists] = await db.select({ id: member.id }).from(member).where(and(eq(member.organizationId, orgId), eq(member.userId, userId)));
  if (exists) await db.update(member).set({ role }).where(eq(member.id, exists.id));
  else await db.insert(member).values({ id: crypto.randomUUID(), organizationId: orgId, userId, role, createdAt: new Date() });
};
await addMember(owner.id, 'owner');

// ---- ผู้เล่นปลอม 24 คน (มี Discord ID ปลอม → ลองผูกตัวละครด้วย Discord ID ได้) ----
const ROLES = ['officer', 'officer', 'leader', 'leader', 'leader', 'leader'];
const mockUsers: { id: string; discordId: string }[] = [];
for (let i = 1; i <= 24; i++) {
  const id = `${USER_PREFIX}${String(i).padStart(2, '0')}`;
  const discordId = `9000000000000${String(i).padStart(5, '0')}`;
  await db.insert(user).values({ id, name: `${pick(NAME_A)}${pick(NAME_B)}_dc`, email: `${id}@example.invalid`, emailVerified: true, createdAt: new Date(), updatedAt: new Date() }).onConflictDoNothing();
  await db.insert(account).values({ id: `${id}-discord`, accountId: discordId, providerId: 'discord', userId: id, createdAt: new Date(), updatedAt: new Date() }).onConflictDoNothing();
  await addMember(id, ROLES[i - 1] ?? 'member');
  mockUsers.push({ id, discordId });
}

// ---- ตัวละคร 150: เจ้าของคุณ 2 ตัว, ผู้เล่นปลอมคนละ 1–2 ตัว, ที่เหลือไม่ผูกบัญชี (Officer เพิ่มให้คนที่ยังไม่ login) ----
const rows: (typeof character.$inferInsert)[] = [];
const add = (userId: string | null) =>
  rows.push({ organizationId: orgId, userId, ign: newIgn(), classId: pick(bag), level: int(80, 100), combatPower: int(40_000, 220_000) * 10, isMain: false });
for (let i = 0; i < 2; i++) add(owner.id);
for (const u of mockUsers) for (let k = 0; k < int(1, 2); k++) add(u.id);
while (rows.length < 150) add(null);

let inserted = 0;
for (let i = 0; i < rows.length; i += 50) {
  const res = await db.insert(character).values(rows.slice(i, i + 50)).onConflictDoNothing().returning({ id: character.id });
  inserted += res.length;
}
// ตัวอย่าง role ที่ตั้งเอง: High Priest / Bard ทุกตัวที่ 3 (เรียงตามชื่อ แยกตามอาชีพ) เล่นสาย dmg
// คิดจากรายชื่อเต็มของอาชีพ จึงรันซ้ำแล้วได้ชุดเดิม (ไม่ทับตัวที่ตั้ง role ไว้แล้ว)
for (const className of ['High Priest', 'Bard']) {
  const rows = await db
    .select({ id: character.id, role: character.role })
    .from(character)
    .innerJoin(gameClass, eq(character.classId, gameClass.id))
    .where(and(eq(character.organizationId, orgId), eq(gameClass.name, className)))
    .orderBy(character.ign);
  for (const [i, c] of rows.entries())
    if (i % 3 === 0 && c.role === null) await db.update(character).set({ role: 'dps' }).where(eq(character.id, c.id));
}

// คิวประมูลตัวอย่าง: Relic STR 8 แบบ (ชื่อชนิดที่ไม่รู้แน่เป็นชื่อสมมติ) — สร้างเฉพาะเมื่อกิลด์ยังไม่มีคิว
const [hasQueue] = await db.select({ id: auction.id }).from(auction).where(eq(auction.organizationId, orgId)).limit(1);
if (!hasQueue) {
  const RELICS = ['โล่', 'หอก', 'ดาบ', 'ขวาน', 'คทา', 'ธนู', 'มีดสั้น', 'ไม้เท้า'];
  const owned = await db.select({ id: character.id, userId: character.userId, ign: character.ign }).from(character).where(and(eq(character.organizationId, orgId), isNotNull(character.userId))).orderBy(character.ign);
  const now = Date.now();
  for (const [i, kind] of RELICS.entries()) {
    const name = `Relic STR (${kind})`;
    await db.insert(auctionItem).values({ name }).onConflictDoNothing();
    const [item] = await db.select({ id: auctionItem.id }).from(auctionItem).where(eq(auctionItem.name, name));
    const [q] = await db.insert(auction).values({ organizationId: orgId, itemId: item!.id }).returning({ id: auction.id });
    // ตัวอย่างความหลากหลาย: บางคิวว่าง บางคิวยาว; 1 คนต่อ 1 ตัวละครต่อคิว
    const size = i === 7 ? 0 : int(2, 9);
    const seen = new Set<string>();
    const picked: typeof owned = [];
    while (picked.length < size && seen.size < owned.length) {
      const c = pick(owned);
      if (seen.has(c.userId!)) continue;
      seen.add(c.userId!);
      picked.push(c);
    }
    if (picked.length)
      await db.insert(auctionEntry).values(picked.map((c, k) => ({ auctionId: q!.id, characterId: c.id, createdAt: new Date(now - (picked.length - k) * 3_600_000) })));
    // ประวัติการมอบ: โล่/หอกมีคนได้ไปแล้ว
    if (i < 2) {
      const w = pick(owned);
      await db.insert(auctionAward).values({ auctionId: q!.id, characterId: w.id, ign: w.ign, createdAt: new Date(now - (i + 1) * 86_400_000) });
    }
  }
}

console.log(`Guild "${org!.name}" ready — owner: ${owner.name}; mock players: ${mockUsers.length}; characters inserted: ${inserted}`);
process.exit(0);
