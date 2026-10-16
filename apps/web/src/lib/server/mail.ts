import nodemailer, { type Transporter } from 'nodemailer';

/**
 * ส่งอีเมลผ่าน SMTP (ค่าเริ่มต้น Gmail) — ตั้งใน .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM
 * Gmail ต้องใช้ App Password (ช่องว่างในรหัสถูกตัดให้อัตโนมัติ) ส่งได้ราว 500 ฉบับ/วัน
 */
let transport: Transporter | null = null;

export const mailConfigured = () => !!(process.env.SMTP_USER && process.env.SMTP_PASSWORD);

function getTransport() {
	if (transport) return transport;
	const port = Number(process.env.SMTP_PORT ?? 465);
	transport = nodemailer.createTransport({
		host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
		port,
		secure: port === 465, // 465 = SSL, 587 = STARTTLS
		auth: { user: process.env.SMTP_USER, pass: (process.env.SMTP_PASSWORD ?? '').replace(/\s+/g, '') }
	});
	return transport;
}

export interface Mail {
	to: string;
	subject: string;
	html: string;
	text: string;
}

/** ส่งอีเมล — ไม่ได้ตั้ง SMTP = ข้าม (คืน false) ไม่ทำให้งานหลักพัง */
export async function sendMail(mail: Mail): Promise<boolean> {
	if (!mailConfigured()) {
		console.warn('[mail] SMTP not configured — skipped:', mail.subject);
		return false;
	}
	await getTransport().sendMail({ from: process.env.MAIL_FROM ?? process.env.SMTP_USER, ...mail });
	return true;
}

/** URL หลักของเว็บสำหรับลิงก์ในอีเมล (ไม่ใช้ origin ของ request เพราะ webhook มาทางโดเมน ngrok) */
export const appUrl = () => (process.env.PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:5173').replace(/\/$/, '');

export const escapeHtml = (s: string) =>
	s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
