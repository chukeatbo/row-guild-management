/**
 * ข้อความทั้งหน้า แยกตามภาษา — เพิ่ม/แก้ข้อความที่นี่
 * ทุกภาษาต้องมี key ครบ (type `Content` บังคับ) ไม่งั้น typecheck ไม่ผ่าน
 */
export type Lang = 'th' | 'en' | 'id' | 'fil';
export type FeatureIcon = 'swords' | 'calendar' | 'repeat' | 'gavel' | 'bot' | 'users' | 'shield' | 'globe';
export type PlanId = 'trial' | 'guild' | 'pro';

export type Content = {
	meta: { title: string; description: string };
	nav: { features: string; pricing: string; faq: string; contact: string; login: string; dashboard: string };
	hero: {
		badge: string;
		title: string;
		highlight: string;
		lead: string;
		cta: string;
		ctaSecondary: string;
		points: string[];
	};
	mock: { title: string; group: string; party: string; leader: string; unassigned: string; onLeave: string };
	features: { eyebrow: string; title: string; lead: string; items: { icon: FeatureIcon; title: string; body: string }[] };
	steps: { eyebrow: string; title: string; items: { title: string; body: string }[] };
	pricing: {
		eyebrow: string;
		title: string;
		lead: string;
		perMonth: string;
		free: string;
		askPrice: string;
		popular: string;
		note: string;
		plans: { id: PlanId; name: string; desc: string; features: string[]; cta: string }[];
	};
	faq: { eyebrow: string; title: string; items: { q: string; a: string }[] };
	contact: { title: string; lead: string; discord: string; line: string; facebook: string };
	footer: { disclaimer: string; rights: string; terms: string; privacy: string; refund: string };
	theme: { light: string; dark: string };
	langName: string;
};

const th: Content = {
	meta: {
		title: 'ROW Guild Management — จัดทัพวอร์และจัดการกิลด์ Ragnarok: The New World',
		description:
			'เว็บจัดการกิลด์ ROW ครบในที่เดียว: จัดปาร์ตี้ Guild League / Siege War / Polarity แบบลาก-วาง ระบบลาวอร์ คิวประมูล และบอท Discord แจ้งเตือน + ส่งรูปปาร์ตี้ลงห้องอัตโนมัติ'
	},
	nav: { features: 'ฟีเจอร์', pricing: 'ราคา', faq: 'คำถามพบบ่อย', contact: 'ติดต่อ', login: 'เข้าสู่ระบบ', dashboard: 'เข้าใช้งาน' },
	hero: {
		badge: 'สำหรับกิลด์ Ragnarok: The New World',
		title: 'จัดทัพวอร์ทั้งกิลด์',
		highlight: 'จบในหน้าเดียว',
		lead: 'เลิกจัดปาร์ตี้ในชีท เลิกไล่ถามใครลาในแชท — ลาก-วางจัดปาร์ตี้ GL / Siege / Polarity ระบบลาที่ถอดคนออกจากปาร์ตี้ให้เอง และบอท Discord ที่เตือนก่อนวอร์พร้อมส่งรูปปาร์ตี้ลงห้องให้ทุกคนเห็น',
		cta: 'ทดลองใช้ฟรี',
		ctaSecondary: 'ดูฟีเจอร์',
		points: ['Login ด้วย Discord', 'ใช้บนมือถือได้', 'รองรับ 150 คน/กิลด์']
	},
	mock: { title: 'Guild League · สนามบน', group: 'เลนกลาง', party: 'ปาร์ตี้', leader: 'หัวหน้า', unassigned: 'ยังไม่ได้จัด', onLeave: 'ลา' },
	features: {
		eyebrow: 'ฟีเจอร์',
		title: 'ทุกอย่างที่ GM และ Officer ต้องใช้ทุกสัปดาห์',
		lead: 'ออกแบบจากการจัดวอร์จริงของกิลด์ ROW — ไม่ใช่เครื่องมือทั่วไปที่ต้องมาดัดแปลงเอง',
		items: [
			{
				icon: 'swords',
				title: 'Party Builder ลาก-วาง',
				body: 'จัดปาร์ตี้ Guild League (สนามบน 3 เลน + สนามล่าง), Siege War (group ไม่จำกัด) และ Polarity 50 คน ตั้งหัวหน้า ล็อกปาร์ตี้ และเห็นสรุป Tank/DPS/Healer/Support ทุกปาร์ตี้'
			},
			{
				icon: 'calendar',
				title: 'ระบบลาวอร์',
				body: 'สมาชิกกดลาเองก่อนเวลาปิดรับ ระบบถอดออกจากปาร์ตี้ให้อัตโนมัติ Officer ลาแทนหรือยกเลิกให้ได้ และเห็นรายชื่อคนลาพร้อมเหตุผล'
			},
			{
				icon: 'repeat',
				title: 'ตารางวอร์รายสัปดาห์',
				body: 'ตั้งวัน-เวลาวอร์ครั้งเดียว ระบบเลื่อนไปรอบถัดไปและล้างรายการลาให้เอง ปาร์ตี้เดิมยังอยู่ แก้แค่คนที่เปลี่ยน เวลาแสดงตามโซนเครื่องของแต่ละคน'
			},
			{
				icon: 'gavel',
				title: 'คิวประมูลกิลด์',
				body: 'คิวต่อไอเทม มาก่อนได้ก่อน สมาชิกลงคิวเองได้ Officer มอบของ (ข้ามคิวได้เมื่อจำเป็น) และมีประวัติการมอบของแต่ละคิวให้ตรวจย้อนหลัง'
			},
			{
				icon: 'bot',
				title: 'บอท Discord',
				body: 'เตือนก่อนวอร์เริ่ม ส่งรูปผังปาร์ตี้และคิวประมูลลงห้องที่กำหนดในคลิกเดียว แจ้งเมื่อมีคนลาหรือมอบไอเทม — สมาชิกไม่ต้องเปิดเว็บก็รู้'
			},
			{
				icon: 'users',
				title: 'สมาชิก & กราฟอาชีพ',
				body: 'รายชื่อตัวละครทั้งกิลด์ 1 คนมีได้หลายตัว ดูสัดส่วนอาชีพและ role ในกราฟ ตั้ง role เองได้ (เช่น Priest สายตี) เพิ่มตัวละครของคนที่ยังไม่ login ได้'
			},
			{
				icon: 'shield',
				title: 'สิทธิ์ตามตำแหน่ง',
				body: 'Guild Master / Officer / Party Leader / Member — หัวหน้าปาร์ตี้แก้ได้เฉพาะปาร์ตี้ตัวเอง และทุกการเปลี่ยนแปลงสำคัญมีบันทึกย้อนหลัง'
			},
			{
				icon: 'globe',
				title: 'หลายภาษา · โหมดมืด',
				body: 'ใช้ได้ทั้งไทย อังกฤษ ฟิลิปปินส์ อินโดนีเซีย และจีน รองรับโหมดมืด และใช้บนมือถือได้สบาย'
			}
		]
	},
	steps: {
		eyebrow: 'เริ่มใช้งาน',
		title: 'พร้อมจัดวอร์ภายในวันเดียว',
		items: [
			{ title: 'ติดต่อเรา', body: 'ทักมาทาง Discord / LINE / Facebook เราเปิดกิลด์ให้และตั้ง GM เป็นเจ้าของ' },
			{ title: 'เชิญบอทเข้า Discord', body: 'เลือกห้องแจ้งเตือนและห้องส่งรูปปาร์ตี้ของแต่ละกิจกรรม' },
			{ title: 'ให้สมาชิก Login', body: 'สมาชิก login ด้วย Discord แล้วเพิ่มตัวละคร — เริ่มลาก-วางจัดทัพได้เลย' }
		]
	},
	pricing: {
		eyebrow: 'ราคา',
		title: 'ราคาเดียว ใช้ได้ทั้งกิลด์',
		lead: 'คิดราคาต่อกิลด์ ไม่ใช่ต่อคน สมาชิกทุกคนใช้ได้ไม่มีค่าใช้จ่ายเพิ่ม',
		perMonth: '/เดือน',
		free: 'ฟรี',
		askPrice: 'สอบถาม',
		popular: 'ยอดนิยม',
		note: 'ชำระผ่านโอน / พร้อมเพย์ ติดต่อทีมงานเพื่อเปิดใช้งาน',
		plans: [
			{
				id: 'trial',
				name: 'ทดลองใช้',
				desc: 'ลองครบทุกฟีเจอร์ 14 วัน',
				features: ['ทุกฟีเจอร์ของแพ็กเกจ Guild', '1 กิลด์', 'ไม่ต้องผูกบัตร'],
				cta: 'เริ่มทดลอง'
			},
			{
				id: 'guild',
				name: 'Guild',
				desc: 'สำหรับกิลด์ที่ลงวอร์ทุกสัปดาห์',
				features: [
					'Party Builder GL / Siege / Polarity',
					'ระบบลา + ตารางวอร์อัตโนมัติ',
					'คิวประมูลกิลด์',
					'บอท Discord แจ้งเตือน + ส่งรูป',
					'สมาชิกสูงสุด 150 คน'
				],
				cta: 'เลือกแพ็กเกจนี้'
			},
			{
				id: 'pro',
				name: 'Alliance',
				desc: 'สำหรับหลายกิลด์ในเครือเดียวกัน',
				features: ['ทุกอย่างใน Guild', 'สูงสุด 3 กิลด์', 'ซัพพอร์ตด่วนทาง Discord', 'ขอฟีเจอร์เพิ่มได้'],
				cta: 'เลือกแพ็กเกจนี้'
			}
		]
	},
	faq: {
		eyebrow: 'คำถามพบบ่อย',
		title: 'มีคำถาม? เรามีคำตอบ',
		items: [
			{ q: 'ต้องติดตั้งโปรแกรมอะไรไหม?', a: 'ไม่ต้อง ใช้ผ่านเบราว์เซอร์ทั้งบนคอมและมือถือ สมาชิก login ด้วยบัญชี Discord ที่มีอยู่แล้ว' },
			{
				q: 'สมาชิกทุกคนต้อง login ไหม?',
				a: 'ไม่จำเป็น Officer เพิ่มตัวละครของคนที่ยังไม่ login แล้วจัดลงปาร์ตี้ได้เลย แต่ถ้าสมาชิก login จะลาวอร์และลงคิวประมูลเองได้'
			},
			{ q: '1 คนมีหลายตัวละครได้ไหม?', a: 'ได้ แต่ละตัวละครมีชื่อในเกมและอาชีพของตัวเอง และจัดลงปาร์ตี้ได้แยกกัน' },
			{ q: 'บอท Discord ต้องการสิทธิ์อะไรบ้าง?', a: 'แค่ส่งข้อความและแนบรูปในห้องที่คุณเลือก บอทไม่อ่านข้อความในเซิร์ฟเวอร์และไม่ต้องใช้สิทธิ์ Admin' },
			{
				q: 'ใช้กับเซิร์ฟเวอร์ไหนได้บ้าง?',
				a: 'ใช้ได้ทุกเซิร์ฟเวอร์ของ Ragnarok: The New World เวลาแสดงตามโซนเวลาของเครื่องแต่ละคน จึงใช้กับกิลด์ที่สมาชิกอยู่ต่างประเทศได้'
			},
			{ q: 'ยกเลิกได้ไหม?', a: 'ได้ทุกเมื่อ ไม่มีสัญญาผูกมัด ระบบใช้ได้จนครบรอบที่ชำระไว้' }
		]
	},
	contact: {
		title: 'พร้อมเลิกจัดวอร์ในชีทหรือยัง?',
		lead: 'ทักมาคุยกับเราได้เลย เราช่วยตั้งค่ากิลด์และบอทให้จนใช้งานได้',
		discord: 'Discord',
		line: 'LINE',
		facebook: 'Facebook'
	},
	footer: {
		disclaimer:
			'Ragnarok: The New World เป็นเครื่องหมายการค้าของเจ้าของลิขสิทธิ์ เว็บนี้เป็นเครื่องมือของผู้เล่น ไม่ได้มีส่วนเกี่ยวข้องกับผู้พัฒนาหรือผู้ให้บริการเกม',
		rights: 'สงวนลิขสิทธิ์',
		terms: 'ข้อกำหนดการใช้บริการ',
		privacy: 'นโยบายความเป็นส่วนตัว',
		refund: 'นโยบายการคืนเงิน'
	},
	theme: { light: 'โหมดสว่าง', dark: 'โหมดมืด' },
	langName: 'ไทย'
};

const en: Content = {
	meta: {
		title: 'ROW Guild Management — War lineups & guild tools for Ragnarok: The New World',
		description:
			'All-in-one guild manager for ROW: drag-and-drop party builder for Guild League / Siege War / Polarity, war leave requests, guild auction queue, and a Discord bot that posts reminders and party images automatically.'
	},
	nav: { features: 'Features', pricing: 'Pricing', faq: 'FAQ', contact: 'Contact', login: 'Log in', dashboard: 'Open dashboard' },
	hero: {
		badge: 'Built for Ragnarok: The New World guilds',
		title: 'Plan your whole guild war',
		highlight: 'on a single page',
		lead: 'Stop building lineups in spreadsheets and chasing who is absent in chat. Drag-and-drop GL / Siege / Polarity parties, a leave system that removes people from parties for you, and a Discord bot that reminds everyone before war and posts the lineup image.',
		cta: 'Start free trial',
		ctaSecondary: 'See features',
		points: ['Log in with Discord', 'Works on mobile', 'Up to 150 members/guild']
	},
	mock: { title: 'Guild League · Main field', group: 'Mid lane', party: 'Party', leader: 'Leader', unassigned: 'Unassigned', onLeave: 'Leave' },
	features: {
		eyebrow: 'Features',
		title: 'Everything your GM and officers need every week',
		lead: 'Designed around how ROW guilds actually run wars — not a generic tool you have to bend into shape.',
		items: [
			{
				icon: 'swords',
				title: 'Drag-and-drop party builder',
				body: 'Build Guild League (3-lane main field + sub field), Siege War (unlimited groups) and 50-player Polarity lineups. Assign leaders, lock parties, and see a Tank/DPS/Healer/Support summary per party.'
			},
			{
				icon: 'calendar',
				title: 'War leave requests',
				body: 'Members request leave before the deadline and are removed from their party automatically. Officers can file or cancel leave for anyone and see every absence with its reason.'
			},
			{
				icon: 'repeat',
				title: 'Weekly war schedule',
				body: 'Set your war days once. Events roll over to the next round and clear old leave requests on their own — lineups stay, so you only adjust what changed. Times show in each viewer’s local time zone.'
			},
			{
				icon: 'gavel',
				title: 'Guild auction queue',
				body: 'One queue per item, first come first served. Members join themselves; officers award items (and can skip when needed), with a per-queue history to review later.'
			},
			{
				icon: 'bot',
				title: 'Discord bot',
				body: 'Reminds everyone before war starts, posts lineup and auction-queue images to the channels you pick in one click, and announces leave requests and awards — no need to open the site.'
			},
			{
				icon: 'users',
				title: 'Members & class chart',
				body: 'Every character in the guild, several per player. See the class and role mix in a chart, override roles (e.g. a damage Priest), and add characters for players who haven’t logged in yet.'
			},
			{
				icon: 'shield',
				title: 'Role-based permissions',
				body: 'Guild Master / Officer / Party Leader / Member. Party leaders can only edit their own party, and every important change is logged.'
			},
			{
				icon: 'globe',
				title: 'Multilingual · Dark mode',
				body: 'Available in Thai, English, Filipino, Indonesian and Chinese, with dark mode and a layout that works well on phones.'
			}
		]
	},
	steps: {
		eyebrow: 'Getting started',
		title: 'Ready for war in a day',
		items: [
			{ title: 'Contact us', body: 'Message us on Discord / LINE / Facebook. We create your guild and make your GM the owner.' },
			{ title: 'Invite the bot', body: 'Pick a reminder channel and an image channel for each activity.' },
			{ title: 'Members log in', body: 'Members sign in with Discord and add their characters — start dragging parties right away.' }
		]
	},
	pricing: {
		eyebrow: 'Pricing',
		title: 'One price for the whole guild',
		lead: 'Priced per guild, not per player. Every member can use it at no extra cost.',
		perMonth: '/month',
		free: 'Free',
		askPrice: 'Contact us',
		popular: 'Most popular',
		note: 'Pay by bank transfer / PromptPay. Contact us to activate your guild.',
		plans: [
			{
				id: 'trial',
				name: 'Trial',
				desc: 'Every feature for 14 days',
				features: ['Everything in Guild', '1 guild', 'No card required'],
				cta: 'Start trial'
			},
			{
				id: 'guild',
				name: 'Guild',
				desc: 'For guilds that fight every week',
				features: [
					'Party builder for GL / Siege / Polarity',
					'Leave requests + automatic schedule',
					'Guild auction queue',
					'Discord reminders + images',
					'Up to 150 members'
				],
				cta: 'Choose this plan'
			},
			{
				id: 'pro',
				name: 'Alliance',
				desc: 'For several guilds in one alliance',
				features: ['Everything in Guild', 'Up to 3 guilds', 'Priority support on Discord', 'Feature requests'],
				cta: 'Choose this plan'
			}
		]
	},
	faq: {
		eyebrow: 'FAQ',
		title: 'Questions? We have answers',
		items: [
			{ q: 'Do we need to install anything?', a: 'No. It runs in the browser on desktop and mobile, and members log in with their existing Discord account.' },
			{
				q: 'Does every member have to log in?',
				a: 'No. Officers can add characters for players who haven’t logged in and put them in parties. Members who log in can request leave and join auction queues themselves.'
			},
			{ q: 'Can one player have several characters?', a: 'Yes. Each character has its own in-game name and class and can be placed in parties separately.' },
			{
				q: 'What permissions does the Discord bot need?',
				a: 'Only sending messages and attaching images in the channels you choose. The bot doesn’t read your server’s messages and doesn’t need Admin.'
			},
			{
				q: 'Which servers are supported?',
				a: 'Any Ragnarok: The New World server. Times are shown in each viewer’s own time zone, so it works for guilds with members abroad.'
			},
			{ q: 'Can we cancel?', a: 'Any time, with no contract. Your guild keeps access until the end of the paid period.' }
		]
	},
	contact: {
		title: 'Ready to stop planning wars in spreadsheets?',
		lead: 'Talk to us — we’ll help set up your guild and bot until everything works.',
		discord: 'Discord',
		line: 'LINE',
		facebook: 'Facebook'
	},
	footer: {
		disclaimer:
			'Ragnarok: The New World is a trademark of its respective owner. This is a player-made tool and is not affiliated with the game’s developer or publisher.',
		rights: 'All rights reserved',
		terms: 'Terms & Conditions',
		privacy: 'Privacy Policy',
		refund: 'Refund Policy'
	},
	theme: { light: 'Light mode', dark: 'Dark mode' },
	langName: 'English'
};

const id: Content = {
	meta: {
		title: 'ROW Guild Management — Atur line-up war & guild Ragnarok: The New World',
		description:
			'Pengelola guild ROW serba ada: party builder drag-and-drop untuk Guild League / Siege War / Polarity, izin absen war, antrean lelang guild, dan bot Discord yang mengirim pengingat serta gambar party secara otomatis.'
	},
	nav: { features: 'Fitur', pricing: 'Harga', faq: 'FAQ', contact: 'Kontak', login: 'Masuk', dashboard: 'Buka dasbor' },
	hero: {
		badge: 'Dibuat untuk guild Ragnarok: The New World',
		title: 'Atur war seluruh guild',
		highlight: 'dalam satu halaman',
		lead: 'Berhenti menyusun party di spreadsheet dan menanyakan siapa yang absen di chat. Susun party GL / Siege / Polarity dengan drag-and-drop, sistem izin yang otomatis mengeluarkan member dari party, dan bot Discord yang mengingatkan semua orang sebelum war sekaligus mengirim gambar line-up.',
		cta: 'Coba gratis',
		ctaSecondary: 'Lihat fitur',
		points: ['Masuk dengan Discord', 'Bisa di HP', 'Hingga 150 member/guild']
	},
	mock: { title: 'Guild League · Arena utama', group: 'Lane tengah', party: 'Party', leader: 'Ketua', unassigned: 'Belum diatur', onLeave: 'Izin' },
	features: {
		eyebrow: 'Fitur',
		title: 'Semua yang dibutuhkan GM dan officer setiap minggu',
		lead: 'Dirancang dari cara guild ROW benar-benar menjalankan war — bukan alat umum yang harus diakali sendiri.',
		items: [
			{
				icon: 'swords',
				title: 'Party builder drag-and-drop',
				body: 'Susun line-up Guild League (arena utama 3 lane + arena bawah), Siege War (grup tanpa batas) dan Polarity 50 pemain. Tentukan ketua, kunci party, dan lihat ringkasan Tank/DPS/Healer/Support tiap party.'
			},
			{
				icon: 'calendar',
				title: 'Izin absen war',
				body: 'Member mengajukan izin sebelum batas waktu dan otomatis dikeluarkan dari party. Officer bisa mengajukan atau membatalkan izin untuk siapa saja dan melihat semua yang absen beserta alasannya.'
			},
			{
				icon: 'repeat',
				title: 'Jadwal war mingguan',
				body: 'Atur hari war sekali saja. Event otomatis pindah ke ronde berikutnya dan menghapus izin lama — line-up tetap ada, jadi cukup ubah yang berganti. Waktu tampil sesuai zona waktu perangkat masing-masing.'
			},
			{
				icon: 'gavel',
				title: 'Antrean lelang guild',
				body: 'Satu antrean per item, siapa cepat dia dapat. Member bisa ikut antre sendiri; officer membagikan item (bisa melewati antrean bila perlu), lengkap dengan riwayat tiap antrean.'
			},
			{
				icon: 'bot',
				title: 'Bot Discord',
				body: 'Mengingatkan sebelum war dimulai, mengirim gambar line-up dan antrean lelang ke channel pilihan dalam sekali klik, serta mengumumkan izin dan pembagian item — tanpa perlu membuka situs.'
			},
			{
				icon: 'users',
				title: 'Member & grafik job',
				body: 'Semua karakter di guild, satu pemain bisa punya beberapa. Lihat komposisi job dan role dalam grafik, ubah role sendiri (mis. Priest damage), dan tambahkan karakter untuk pemain yang belum login.'
			},
			{
				icon: 'shield',
				title: 'Hak akses sesuai jabatan',
				body: 'Guild Master / Officer / Party Leader / Member. Ketua party hanya bisa mengubah party-nya sendiri, dan setiap perubahan penting tercatat.'
			},
			{
				icon: 'globe',
				title: 'Multibahasa · Mode gelap',
				body: 'Tersedia dalam bahasa Thai, Inggris, Filipino, Indonesia dan Mandarin, dengan mode gelap dan tampilan yang nyaman di HP.'
			}
		]
	},
	steps: {
		eyebrow: 'Mulai',
		title: 'Siap war dalam sehari',
		items: [
			{ title: 'Hubungi kami', body: 'Kirim pesan lewat Discord / LINE / Facebook. Kami buatkan guild Anda dan jadikan GM sebagai pemilik.' },
			{ title: 'Undang bot', body: 'Pilih channel pengingat dan channel gambar untuk setiap aktivitas.' },
			{ title: 'Member login', body: 'Member masuk dengan Discord lalu menambahkan karakter — langsung mulai susun party.' }
		]
	},
	pricing: {
		eyebrow: 'Harga',
		title: 'Satu harga untuk seluruh guild',
		lead: 'Harga per guild, bukan per pemain. Semua member bisa memakainya tanpa biaya tambahan.',
		perMonth: '/bulan',
		free: 'Gratis',
		askPrice: 'Hubungi kami',
		popular: 'Terpopuler',
		note: 'Pembayaran via transfer bank / PromptPay. Hubungi kami untuk mengaktifkan guild Anda.',
		plans: [
			{
				id: 'trial',
				name: 'Uji coba',
				desc: 'Semua fitur selama 14 hari',
				features: ['Semua fitur paket Guild', '1 guild', 'Tanpa kartu'],
				cta: 'Mulai uji coba'
			},
			{
				id: 'guild',
				name: 'Guild',
				desc: 'Untuk guild yang war setiap minggu',
				features: [
					'Party builder GL / Siege / Polarity',
					'Izin absen + jadwal otomatis',
					'Antrean lelang guild',
					'Pengingat + gambar di Discord',
					'Hingga 150 member'
				],
				cta: 'Pilih paket ini'
			},
			{
				id: 'pro',
				name: 'Alliance',
				desc: 'Untuk beberapa guild dalam satu aliansi',
				features: ['Semua fitur Guild', 'Hingga 3 guild', 'Dukungan prioritas di Discord', 'Bisa request fitur'],
				cta: 'Pilih paket ini'
			}
		]
	},
	faq: {
		eyebrow: 'FAQ',
		title: 'Ada pertanyaan? Ini jawabannya',
		items: [
			{ q: 'Perlu instal sesuatu?', a: 'Tidak. Cukup lewat browser di PC maupun HP, dan member masuk dengan akun Discord yang sudah ada.' },
			{
				q: 'Apakah semua member wajib login?',
				a: 'Tidak. Officer bisa menambahkan karakter pemain yang belum login dan memasukkannya ke party. Member yang login bisa mengajukan izin dan ikut antrean lelang sendiri.'
			},
			{ q: 'Bisakah satu pemain punya beberapa karakter?', a: 'Bisa. Setiap karakter punya nama in-game dan job sendiri, dan bisa dimasukkan ke party secara terpisah.' },
			{
				q: 'Izin apa saja yang dibutuhkan bot Discord?',
				a: 'Hanya mengirim pesan dan melampirkan gambar di channel yang Anda pilih. Bot tidak membaca pesan di server Anda dan tidak butuh akses Admin.'
			},
			{
				q: 'Server mana saja yang didukung?',
				a: 'Semua server Ragnarok: The New World. Waktu ditampilkan sesuai zona waktu masing-masing, jadi cocok untuk guild dengan member di luar negeri.'
			},
			{ q: 'Bisa berhenti berlangganan?', a: 'Kapan saja, tanpa kontrak. Guild Anda tetap bisa memakai layanan hingga akhir periode yang sudah dibayar.' }
		]
	},
	contact: {
		title: 'Siap berhenti mengatur war di spreadsheet?',
		lead: 'Ngobrol dengan kami — kami bantu atur guild dan bot sampai semuanya berjalan.',
		discord: 'Discord',
		line: 'LINE',
		facebook: 'Facebook'
	},
	footer: {
		disclaimer:
			'Ragnarok: The New World adalah merek dagang milik pemiliknya. Situs ini adalah alat buatan pemain dan tidak berafiliasi dengan pengembang maupun penerbit game.',
		rights: 'Hak cipta dilindungi',
		terms: 'Syarat & Ketentuan',
		privacy: 'Kebijakan Privasi',
		refund: 'Kebijakan Pengembalian Dana'
	},
	theme: { light: 'Mode terang', dark: 'Mode gelap' },
	langName: 'Bahasa Indonesia'
};

const fil: Content = {
	meta: {
		title: 'ROW Guild Management — War line-up at guild tools para sa Ragnarok: The New World',
		description:
			'All-in-one na guild manager para sa ROW: drag-and-drop na party builder para sa Guild League / Siege War / Polarity, leave sa war, guild auction queue, at Discord bot na awtomatikong nagpapadala ng paalala at larawan ng party.'
	},
	nav: { features: 'Mga Feature', pricing: 'Presyo', faq: 'FAQ', contact: 'Kontak', login: 'Mag-log in', dashboard: 'Buksan ang dashboard' },
	hero: {
		badge: 'Gawa para sa mga guild ng Ragnarok: The New World',
		title: 'Ayusin ang buong guild war',
		highlight: 'sa iisang pahina',
		lead: 'Tama na ang pag-aayos ng party sa spreadsheet at pagtatanong sa chat kung sino ang absent. Drag-and-drop na party para sa GL / Siege / Polarity, leave system na kusang nag-aalis ng member sa party, at Discord bot na nagpapaalala bago ang war at nagpo-post ng larawan ng line-up.',
		cta: 'Subukan nang libre',
		ctaSecondary: 'Tingnan ang features',
		points: ['Mag-log in gamit ang Discord', 'Gumagana sa phone', 'Hanggang 150 member/guild']
	},
	mock: { title: 'Guild League · Main field', group: 'Mid lane', party: 'Party', leader: 'Leader', unassigned: 'Wala pang party', onLeave: 'Leave' },
	features: {
		eyebrow: 'Mga Feature',
		title: 'Lahat ng kailangan ng GM at officers linggo-linggo',
		lead: 'Dinisenyo batay sa totoong pagpapatakbo ng war ng mga guild sa ROW — hindi generic na tool na kailangan mo pang baguhin.',
		items: [
			{
				icon: 'swords',
				title: 'Drag-and-drop na party builder',
				body: 'Gumawa ng line-up para sa Guild League (3-lane main field + sub field), Siege War (walang limitasyong group) at 50-player na Polarity. Pumili ng leader, i-lock ang party, at makita ang buod ng Tank/DPS/Healer/Support bawat party.'
			},
			{
				icon: 'calendar',
				title: 'Leave sa war',
				body: 'Nagfa-file ng leave ang member bago ang deadline at awtomatikong inaalis sa party. Puwedeng mag-file o mag-cancel ng leave ang officer para sa kahit sino at makita ang lahat ng absent kasama ang dahilan.'
			},
			{
				icon: 'repeat',
				title: 'Lingguhang iskedyul ng war',
				body: 'Isang beses lang i-set ang araw ng war. Kusang lilipat sa susunod na round at buburahin ang lumang leave — nananatili ang line-up kaya babaguhin mo lang ang nagbago. Ipinapakita ang oras ayon sa time zone ng bawat isa.'
			},
			{
				icon: 'gavel',
				title: 'Guild auction queue',
				body: 'Isang pila bawat item, first come first served. Puwedeng pumila ang member mismo; ang officer ang nagbibigay ng item (puwedeng lumaktaw kung kailangan), at may history bawat pila.'
			},
			{
				icon: 'bot',
				title: 'Discord bot',
				body: 'Nagpapaalala bago magsimula ang war, nagpo-post ng larawan ng line-up at auction queue sa piniling channel sa isang click, at nag-aanunsyo ng leave at pagbibigay ng item — hindi na kailangang buksan ang site.'
			},
			{
				icon: 'users',
				title: 'Members at class chart',
				body: 'Lahat ng character sa guild, puwedeng marami bawat player. Makita ang halo ng class at role sa chart, palitan ang role (hal. damage Priest), at magdagdag ng character para sa mga hindi pa naka-log in.'
			},
			{
				icon: 'shield',
				title: 'Permissions ayon sa posisyon',
				body: 'Guild Master / Officer / Party Leader / Member. Sariling party lang ang mae-edit ng party leader, at naka-log ang bawat mahalagang pagbabago.'
			},
			{
				icon: 'globe',
				title: 'Maraming wika · Dark mode',
				body: 'Available sa Thai, English, Filipino, Indonesian at Chinese, may dark mode at maayos gamitin sa phone.'
			}
		]
	},
	steps: {
		eyebrow: 'Pagsisimula',
		title: 'Handa na sa war sa loob ng isang araw',
		items: [
			{ title: 'Kontakin kami', body: 'Mag-message sa Discord / LINE / Facebook. Gagawin namin ang guild mo at gagawing owner ang GM.' },
			{ title: 'I-invite ang bot', body: 'Pumili ng reminder channel at image channel para sa bawat activity.' },
			{ title: 'Mag-log in ang members', body: 'Mag-sign in ang members gamit ang Discord at idagdag ang kanilang characters — puwede nang mag-drag ng party agad.' }
		]
	},
	pricing: {
		eyebrow: 'Presyo',
		title: 'Iisang presyo para sa buong guild',
		lead: 'Presyo bawat guild, hindi bawat player. Lahat ng member ay makakagamit nang walang dagdag na bayad.',
		perMonth: '/buwan',
		free: 'Libre',
		askPrice: 'Kontakin kami',
		popular: 'Pinakasikat',
		note: 'Bayad sa bank transfer / PromptPay. Kontakin kami para ma-activate ang guild mo.',
		plans: [
			{
				id: 'trial',
				name: 'Trial',
				desc: 'Lahat ng feature sa loob ng 14 na araw',
				features: ['Lahat ng nasa Guild', '1 guild', 'Hindi kailangan ng card'],
				cta: 'Simulan ang trial'
			},
			{
				id: 'guild',
				name: 'Guild',
				desc: 'Para sa mga guild na lumalaban linggo-linggo',
				features: [
					'Party builder para sa GL / Siege / Polarity',
					'Leave + awtomatikong iskedyul',
					'Guild auction queue',
					'Discord reminders + larawan',
					'Hanggang 150 member'
				],
				cta: 'Piliin ang plan na ito'
			},
			{
				id: 'pro',
				name: 'Alliance',
				desc: 'Para sa ilang guild sa iisang alliance',
				features: ['Lahat ng nasa Guild', 'Hanggang 3 guild', 'Priority support sa Discord', 'Puwedeng mag-request ng feature'],
				cta: 'Piliin ang plan na ito'
			}
		]
	},
	faq: {
		eyebrow: 'FAQ',
		title: 'May tanong? Narito ang sagot',
		items: [
			{ q: 'Kailangan bang mag-install ng kahit ano?', a: 'Hindi. Gumagana ito sa browser sa desktop at phone, at nagla-log in ang members gamit ang kanilang Discord account.' },
			{
				q: 'Kailangan bang mag-log in ang lahat ng member?',
				a: 'Hindi. Puwedeng magdagdag ang officer ng character ng mga hindi pa naka-log in at ilagay sila sa party. Ang mga naka-log in ay puwedeng mag-file ng leave at pumila sa auction mismo.'
			},
			{ q: 'Puwede bang marami ang character ng isang player?', a: 'Oo. May sariling in-game name at class ang bawat character at puwedeng ilagay sa party nang hiwalay.' },
			{
				q: 'Anong permissions ang kailangan ng Discord bot?',
				a: 'Pagpapadala lang ng message at pag-attach ng larawan sa mga channel na pipiliin mo. Hindi binabasa ng bot ang mga message sa server mo at hindi nito kailangan ng Admin.'
			},
			{
				q: 'Anong mga server ang suportado?',
				a: 'Lahat ng server ng Ragnarok: The New World. Ipinapakita ang oras ayon sa time zone ng bawat isa, kaya puwede ito sa mga guild na may members sa ibang bansa.'
			},
			{ q: 'Puwede bang mag-cancel?', a: 'Kahit kailan, walang kontrata. Magagamit pa rin ng guild mo hanggang matapos ang bayad na period.' }
		]
	},
	contact: {
		title: 'Handa ka na bang tumigil sa pag-aayos ng war sa spreadsheet?',
		lead: 'Kausapin kami — tutulungan ka naming i-set up ang guild at bot hanggang gumana ang lahat.',
		discord: 'Discord',
		line: 'LINE',
		facebook: 'Facebook'
	},
	footer: {
		disclaimer:
			'Ang Ragnarok: The New World ay trademark ng may-ari nito. Ang site na ito ay tool na gawa ng player at walang kaugnayan sa developer o publisher ng laro.',
		rights: 'Nakalaan ang lahat ng karapatan',
		terms: 'Mga Tuntunin at Kundisyon',
		privacy: 'Patakaran sa Privacy',
		refund: 'Patakaran sa Refund'
	},
	theme: { light: 'Light mode', dark: 'Dark mode' },
	langName: 'Filipino'
};

export const content: Record<Lang, Content> = { th, en, id, fil };
export const langs = Object.keys(content) as Lang[];
export const langPath: Record<Lang, string> = { th: '/', en: '/en', id: '/id', fil: '/fil' };
/** locale สำหรับจัดรูปแบบตัวเลข */
export const langLocale: Record<Lang, string> = { th: 'th-TH', en: 'en-US', id: 'id-ID', fil: 'fil-PH' };

const LANDING_ROOTS = ['/', '/terms', '/privacy'];
/** ภาษาของหน้า landing/กฎหมายจาก path (/en, /id/..., /terms) — ไม่ใช่หน้า landing = null */
export function landingLangFromPath(path: string): Lang | null {
	if (LANDING_ROOTS.includes(path)) return 'th';
	for (const l of langs) {
		const base = langPath[l];
		if (base === '/') continue;
		if (path === base || LANDING_ROOTS.some((r) => r !== '/' && path === base + r)) return l;
	}
	return null;
}
