/**
 * ค่าที่ต้องแก้ก่อนเปิดขายจริง — รวมไว้ที่นี่ที่เดียว
 * (ข้อความทั้งหน้าอยู่ที่ content.ts) — ปุ่ม "เข้าสู่ระบบ" ไป /login หรือ /dashboard อัตโนมัติ
 */
export const site = {
	/** ชื่อแบรนด์ที่แสดงบนหน้า */
	name: 'ROW Guild Management',
	/** URL จริงของเว็บนี้ (ใช้ใน canonical / og:url) */
	url: 'https://example.com',
	/** ช่องทางติดต่อ — เว้นว่าง = ไม่แสดงช่องทางนั้น */
	contact: {
		discord: 'https://discord.gg/your-invite',
		line: 'https://line.me/ti/p/~your-line-id',
		facebook: 'https://facebook.com/your-page'
	},
	/**
	 * ข้อมูลผู้ให้บริการ — แสดงในหน้าข้อกำหนดการใช้บริการ / นโยบายความเป็นส่วนตัว
	 * ⚠️ ต้องเป็นข้อมูลจริงและตรงกับเอกสารที่ยื่นขอ payment gateway (Omise ตรวจชื่อ ที่อยู่ อีเมล เบอร์โทร)
	 */
	legal: {
		/** ชื่อผู้ให้บริการตามเอกสาร (ชื่อบุคคลธรรมดา หรือชื่อนิติบุคคล) */
		businessName: '[ชื่อผู้ประกอบการ / บริษัท]',
		businessNameEn: '[Business / company name]',
		/** เลขประจำตัวผู้เสียภาษี — เว้นว่าง = ไม่แสดง */
		taxId: '',
		address: '[ที่อยู่ตามเอกสาร]',
		addressEn: '[Registered address]',
		email: 'support@example.com',
		phone: '0X-XXX-XXXX',
		/** วันที่มีผลบังคับใช้ของเอกสาร (YYYY-MM-DD) */
		effectiveDate: '2026-10-16'
	}

	/* ราคา/แพ็กเกจ: อยู่ในฐานข้อมูล (ตาราง packages, seed ที่ packages/db/src/seed.ts) ไม่ได้อยู่ที่นี่แล้ว */
};
