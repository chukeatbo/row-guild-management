import { createDb, gameClass, pkg } from './index';

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

/**
 * แพ็กเกจที่ขายบน landing (ราคาเป็นสตางค์) — `name`/`description`/`features` หลัก = ภาษาอังกฤษ, ภาษาอื่นอยู่ใน translations
 * limits.maxMembers = จำนวนตัวละครสูงสุดในกิลด์ที่ระบบบังคับ
 */
const GUILD_FEATURES = {
  th: ['Party Builder GL / Siege / Polarity', 'ระบบลา + ตารางวอร์อัตโนมัติ', 'คิวประมูลกิลด์', 'บอท Discord แจ้งเตือน + ส่งรูป', 'สมาชิกสูงสุด 150 คน', 'ต่ออายุบัตรอัตโนมัติ (เร็วๆ นี้)'],
  en: ['Party builder for GL / Siege / Polarity', 'Leave requests + automatic schedule', 'Guild auction queue', 'Discord reminders + images', 'Up to 150 members', 'Automatic card renewal (coming soon)'],
  id: ['Penyusun party GL / Siege / Polarity', 'Izin + jadwal otomatis', 'Antrean lelang guild', 'Pengingat Discord + gambar', 'Hingga 150 anggota', 'Perpanjangan otomatis kartu (segera hadir)'],
  fil: ['Party builder para sa GL / Siege / Polarity', 'Leave + awtomatikong iskedyul', 'Auction queue ng guild', 'Discord reminder + larawan', 'Hanggang 150 miyembro', 'Awtomatikong renewal sa card (malapit na)'],
  zh: ['GL / Siege / Polarity 队伍编排', '请假 + 自动日程', '公会拍卖排队', 'Discord 提醒 + 图片', '最多 150 名成员', '信用卡自动续费（即将推出）']
};
const TRIAL_FEATURES = {
  th: ['ทุกฟีเจอร์ของแพ็กเกจ Guild', '1 กิลด์', 'ไม่ต้องจ่ายเงิน ไม่ต้องผูกบัตร', 'ทดลองได้ 1 ครั้งต่อบัญชี Discord'],
  en: ['Everything in Guild', '1 guild', 'No payment, no card required', 'One trial per Discord account'],
  id: ['Semua fitur paket Guild', '1 guild', 'Tanpa pembayaran, tanpa kartu', 'Satu kali uji coba per akun Discord'],
  fil: ['Lahat ng feature ng Guild', '1 guild', 'Walang bayad, walang card', 'Isang trial bawat Discord account'],
  zh: ['包含 Guild 套餐全部功能', '1 个公会', '无需付款、无需绑卡', '每个 Discord 账号限试用一次']
};
const PACKAGES = [
  {
    code: 'trial',
    name: 'Trial',
    description: 'Every feature for 14 days',
    translations: {
      th: { name: 'ทดลองใช้', description: 'ลองครบทุกฟีเจอร์ 14 วัน', features: TRIAL_FEATURES.th },
      en: { name: 'Trial', description: 'Every feature for 14 days', features: TRIAL_FEATURES.en },
      id: { name: 'Uji coba', description: 'Semua fitur selama 14 hari', features: TRIAL_FEATURES.id },
      fil: { name: 'Trial', description: 'Lahat ng feature sa loob ng 14 araw', features: TRIAL_FEATURES.fil },
      zh: { name: '试用', description: '14 天体验全部功能', features: TRIAL_FEATURES.zh }
    },
    features: TRIAL_FEATURES.en,
    priceSatang: 0,
    durationDays: 14,
    limits: { maxMembers: 150 },
    isTrial: true,
    isFeatured: false,
    sortOrder: 0
  },
  {
    code: 'guild-monthly',
    name: 'Guild',
    description: 'For guilds that fight every week',
    translations: {
      th: { name: 'Guild', description: 'สำหรับกิลด์ที่ลงวอร์ทุกสัปดาห์', features: GUILD_FEATURES.th },
      en: { name: 'Guild', description: 'For guilds that fight every week', features: GUILD_FEATURES.en },
      id: { name: 'Guild', description: 'Untuk guild yang perang tiap minggu', features: GUILD_FEATURES.id },
      fil: { name: 'Guild', description: 'Para sa mga guild na lumalaban linggo-linggo', features: GUILD_FEATURES.fil },
      zh: { name: 'Guild', description: '适合每周参战的公会', features: GUILD_FEATURES.zh }
    },
    features: GUILD_FEATURES.en,
    priceSatang: 29_900,
    durationDays: 30,
    limits: { maxMembers: 150 },
    isTrial: false,
    isFeatured: true,
    sortOrder: 10
  }
];

await db.insert(pkg).values(PACKAGES).onConflictDoNothing({ target: pkg.code }); // รันซ้ำได้ ไม่ทับที่ Super Admin แก้ไว้
console.log(`Seeded ${PACKAGES.length} packages`);
process.exit(0);
