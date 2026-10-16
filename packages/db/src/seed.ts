import { createDb, gameClass } from './index';

/**
 * อาชีพ (13 สาย) — ชื่อและไอคอนจาก roworlddb.com/sea/jobs (job id ในวงเล็บ)
 * ไอคอนอยู่ที่ apps/web/static/classes/*.webp
 * role เป็นค่าเริ่มต้นที่เดาจากสายอาชีพ Super Admin แก้ได้ภายหลัง (บางสายมีหลาย build)
 * color อิงสีป้ายใน Google Sheet ของกิลด์
 */
const CLASSES = [
  { name: 'Lord Knight', slug: 'lord-knight', role: 'tank', color: '#e06666' }, // Knight (212)
  { name: 'Paladin', slug: 'paladin', role: 'tank', color: '#cc0000' }, // Crusader (222)
  { name: 'Champion', slug: 'champion', role: 'dps', color: '#93c47d' }, // Monk (522)
  { name: 'High Priest', slug: 'high-priest', role: 'healer', color: '#00ff00' }, // Priest (512)
  { name: 'Bard', slug: 'bard', role: 'support', color: '#ffd966' }, // Bard (422)
  { name: 'Dancer', slug: 'dancer', role: 'support', color: '#ffe599' }, // Dancer (432)
  { name: 'Alchemist', slug: 'alchemist', role: 'support', color: '#f6b26b' }, // Alchemist (722)
  { name: 'Druid', slug: 'druid', role: 'dps', color: '#00ffff' }, // Kanos (912)
  { name: 'High Wizard', slug: 'high-wizard', role: 'dps', color: '#4a86e8' }, // Wizard (312)
  { name: 'Sniper', slug: 'sniper', role: 'dps', color: '#f1c232' }, // Hunter (412)
  { name: 'Assassin Cross', slug: 'assassin-cross', role: 'dps', color: '#674ea7' }, // Assassin (612)
  { name: 'Night Walker', slug: 'night-walker', role: 'dps', color: '#b45f06' }, // Rebel (812)
  { name: 'Whitesmith', slug: 'whitesmith', role: 'dps', color: '#e69138' } // Blacksmith (712)
] as const;

const db = createDb();

await db
  .insert(gameClass)
  .values(
    CLASSES.map((c, i) => ({
      name: c.name,
      role: c.role,
      color: c.color,
      iconUrl: `/classes/${c.slug}.webp`,
      sortOrder: i
    }))
  )
  .onConflictDoNothing({ target: gameClass.name }); // รันซ้ำได้ ไม่ทับที่ Super Admin แก้ไว้

console.log(`Seeded ${CLASSES.length} classes`);
process.exit(0);
