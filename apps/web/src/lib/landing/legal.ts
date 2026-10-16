/**
 * ข้อกำหนดการใช้บริการ + นโยบายความเป็นส่วนตัว (ไทย/อังกฤษ)
 * ข้อมูลผู้ให้บริการ (ชื่อ ที่อยู่ อีเมล เบอร์) ดึงจาก site.legal ใน site.ts
 * ภาษาอื่น (id/fil) ใช้ฉบับอังกฤษ
 */
import type { Lang } from '#lib/landing/content.ts';
import { site } from '#lib/landing/site.ts';

export type LegalLang = 'th' | 'en';
export type LegalDocId = 'terms' | 'privacy';
/** ย่อหน้า (string) หรือรายการแบบ bullet (string[]) */
export type Block = string | string[];
export type LegalDoc = {
	title: string;
	intro: string;
	sections: { id: string; heading: string; body: Block[] }[];
};

export const legalLang = (lang: Lang): LegalLang => (lang === 'th' ? 'th' : 'en');
export const legalPath = (lang: Lang, doc: LegalDocId) => (legalLang(lang) === 'th' ? `/${doc}` : `/en/${doc}`);

export const legalUi: Record<LegalLang, { updated: string; contents: string; back: string; terms: string; privacy: string; refund: string }> = {
	th: {
		updated: 'มีผลบังคับใช้ตั้งแต่',
		contents: 'สารบัญ',
		back: 'กลับหน้าหลัก',
		terms: 'ข้อกำหนดการใช้บริการ',
		privacy: 'นโยบายความเป็นส่วนตัว',
		refund: 'นโยบายการคืนเงิน'
	},
	en: {
		updated: 'Effective',
		contents: 'Contents',
		back: 'Back to home',
		terms: 'Terms & Conditions',
		privacy: 'Privacy Policy',
		refund: 'Refund Policy'
	}
};

const L = site.legal;
const contactBlock = (lang: LegalLang): string[] =>
	lang === 'th'
		? [
				`ผู้ให้บริการ: ${L.businessName}`,
				...(L.taxId ? [`เลขประจำตัวผู้เสียภาษี: ${L.taxId}`] : []),
				`ที่อยู่: ${L.address}`,
				`อีเมล: ${L.email}`,
				`โทรศัพท์: ${L.phone}`
			]
		: [
				`Service provider: ${L.businessNameEn}`,
				...(L.taxId ? [`Tax ID: ${L.taxId}`] : []),
				`Address: ${L.addressEn}`,
				`Email: ${L.email}`,
				`Phone: ${L.phone}`
			];

const terms: Record<LegalLang, LegalDoc> = {
	th: {
		title: 'ข้อกำหนดและเงื่อนไขการใช้บริการ',
		intro: `ข้อกำหนดนี้ใช้กับการใช้บริการ ${site.name} (“บริการ”) ซึ่งให้บริการโดย ${L.businessName} (“เรา”) โปรดอ่านให้ครบถ้วนก่อนสมัครหรือชำระเงิน การใช้บริการถือว่าคุณยอมรับข้อกำหนดนี้`,
		sections: [
			{
				id: 'service',
				heading: 'ลักษณะของบริการ',
				body: [
					`${site.name} เป็นเว็บแอปพลิเคชันสำหรับจัดการกิลด์ในเกม Ragnarok: The New World ประกอบด้วยเครื่องมือจัดปาร์ตี้ (Guild League / Siege War / Polarity) ระบบลาวอร์ ตารางวอร์ คิวประมูลกิลด์ และบอท Discord สำหรับแจ้งเตือนและส่งรูปภาพลงห้องแชท`,
					'บริการเป็นบริการดิจิทัลที่ใช้งานผ่านเว็บเบราว์เซอร์ ไม่มีการจัดส่งสินค้าที่จับต้องได้',
					'บริการนี้เป็นเครื่องมือที่พัฒนาโดยผู้เล่น ไม่ได้มีส่วนเกี่ยวข้อง ได้รับการรับรอง หรือได้รับอนุญาตจากผู้พัฒนาหรือผู้ให้บริการเกม และไม่มีการขายไอเทม สกุลเงิน หรือบัญชีภายในเกม'
				]
			},
			{
				id: 'account',
				heading: 'บัญชีผู้ใช้',
				body: [
					'คุณเข้าสู่ระบบด้วยบัญชี Discord ของคุณ และต้องรับผิดชอบต่อการใช้งานทั้งหมดที่เกิดขึ้นภายใต้บัญชีนั้น',
					'ผู้ที่สมัครแพ็กเกจในนามกิลด์ (โดยทั่วไปคือ Guild Master) เป็น “ผู้ดูแลกิลด์” มีสิทธิ์กำหนดตำแหน่งและสิทธิ์ของสมาชิกคนอื่น และเป็นผู้รับผิดชอบการชำระเงินของกิลด์นั้น',
					'หากคุณอายุต่ำกว่า 20 ปี คุณต้องได้รับความยินยอมจากผู้ปกครองก่อนชำระเงิน'
				]
			},
			{
				id: 'pricing',
				heading: 'แพ็กเกจ ราคา และการชำระเงิน',
				body: [
					'ราคาแพ็กเกจแสดงอยู่ที่หน้า “ราคา” ของเว็บไซต์ เป็นสกุลเงินบาท (THB) คิดราคาต่อกิลด์ต่อเดือน สมาชิกในกิลด์ใช้งานได้โดยไม่มีค่าใช้จ่ายเพิ่ม',
					'ค่าบริการเรียกเก็บล่วงหน้าเป็นรายรอบ (รายเดือน) ราคาที่ใช้คือราคาที่แสดง ณ วันที่ชำระเงิน',
					'การชำระเงินด้วยบัตรเครดิต/เดบิต และช่องทางอื่นที่เปิดให้บริการ ดำเนินการผ่านผู้ให้บริการรับชำระเงิน Omise (Opn Payments) เราไม่จัดเก็บหมายเลขบัตรหรือรหัส CVV ของคุณ',
					'หากคุณเลือกต่ออายุอัตโนมัติ ระบบจะเรียกเก็บค่าบริการรอบถัดไปจากช่องทางชำระเงินเดิมเมื่อครบรอบ จนกว่าคุณจะยกเลิก',
					'เราอาจเปลี่ยนแปลงราคา โดยจะแจ้งล่วงหน้าอย่างน้อย 30 วัน และราคาใหม่จะมีผลในรอบการชำระถัดไป'
				]
			},
			{
				id: 'delivery',
				heading: 'การส่งมอบบริการ',
				body: [
					'เมื่อการชำระเงินได้รับการยืนยัน กิลด์ของคุณจะเปิดใช้งานแพ็กเกจที่เลือกโดยทันที หรือภายใน 24 ชั่วโมงในกรณีที่ต้องตั้งค่าโดยทีมงาน',
					'หากกิลด์ยังไม่เปิดใช้งานภายในเวลาดังกล่าว โปรดติดต่อเราตามช่องทางในข้อ “ติดต่อเรา”'
				]
			},
			{
				id: 'trial',
				heading: 'การทดลองใช้ฟรี',
				body: [
					'แพ็กเกจทดลองใช้ให้ใช้ฟีเจอร์ได้ 14 วัน โดยไม่เรียกเก็บเงินและไม่ต้องผูกบัตร เมื่อครบกำหนด ระบบจะไม่ต่ออายุเป็นแพ็กเกจที่มีค่าใช้จ่ายโดยอัตโนมัติ',
					'เราขอสงวนสิทธิ์ให้ทดลองใช้ได้ 1 ครั้งต่อกิลด์'
				]
			},
			{
				id: 'cancel',
				heading: 'การยกเลิกบริการ',
				body: [
					'คุณยกเลิกการต่ออายุได้ทุกเมื่อ โดยไม่มีสัญญาผูกมัดขั้นต่ำ ผ่านหน้าตั้งค่ากิลด์หรือแจ้งเราทางอีเมล',
					'เมื่อยกเลิก กิลด์ยังใช้งานได้จนถึงวันสิ้นสุดรอบที่ชำระไว้แล้ว และจะไม่ถูกเรียกเก็บเงินในรอบถัดไป'
				]
			},
			{
				id: 'refund',
				heading: 'นโยบายการคืนเงิน',
				body: [
					'เนื่องจากบริการเปิดใช้งานได้ทันทีหลังชำระเงิน และมีแพ็กเกจทดลองใช้ฟรีให้ทดสอบก่อน ค่าบริการที่ชำระแล้วจะไม่คืนเป็นสัดส่วนสำหรับช่วงเวลาที่เหลือของรอบ ยกเว้นกรณีต่อไปนี้ ซึ่งเราจะคืนเงินเต็มจำนวนของรอบนั้น:',
					[
						'ถูกเรียกเก็บเงินซ้ำสำหรับรอบเดียวกัน',
						'ถูกเรียกเก็บเงินหลังจากยกเลิกการต่ออายุเรียบร้อยแล้ว',
						'ชำระเงินแล้วแต่เราไม่สามารถเปิดใช้งานกิลด์ได้ภายใน 7 วัน',
						'บริการใช้งานไม่ได้ติดต่อกันเกิน 7 วันจากสาเหตุที่อยู่ในความรับผิดชอบของเรา'
					],
					`ขอคืนเงินได้ภายใน 14 วันนับจากวันที่ถูกเรียกเก็บเงิน โดยส่งอีเมลมาที่ ${L.email} พร้อมชื่อกิลด์ วันที่ชำระ จำนวนเงิน และเหตุผล`,
					'เราจะตอบกลับภายใน 7 วันทำการ หากอนุมัติ จะคืนเงินผ่านช่องทางชำระเงินเดิมภายใน 30 วัน ระยะเวลาที่ยอดเงินจะปรากฏในบัญชีบัตรขึ้นอยู่กับธนาคารผู้ออกบัตร'
				]
			},
			{
				id: 'acceptable-use',
				heading: 'ข้อห้ามในการใช้งาน',
				body: [
					'คุณตกลงจะไม่:',
					[
						'ใช้บริการในทางที่ผิดกฎหมาย หรือละเมิดสิทธิของผู้อื่น',
						'บันทึกข้อความหรือเนื้อหาที่หมิ่นประมาท ข่มขู่ เหยียดหยาม หรือละเมิดข้อมูลส่วนบุคคลของผู้อื่น',
						'พยายามเข้าถึงระบบหรือข้อมูลของกิลด์อื่นโดยไม่ได้รับอนุญาต หรือรบกวนการทำงานของระบบ',
						'ใช้บริการเพื่อซื้อขายไอเทม สกุลเงิน หรือบัญชีภายในเกมด้วยเงินจริง',
						'ทำซ้ำ ดัดแปลง หรือขายต่อบริการโดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร'
					]
				]
			},
			{
				id: 'content',
				heading: 'ข้อมูลและเนื้อหาของผู้ใช้',
				body: [
					'ข้อมูลที่คุณและสมาชิกกิลด์บันทึกในระบบ (เช่น ชื่อตัวละคร ผังปาร์ตี้ รายการลา คิวประมูล) เป็นของคุณ คุณอนุญาตให้เราจัดเก็บ ประมวลผล และแสดงข้อมูลนั้นเท่าที่จำเป็นเพื่อให้บริการ',
					'ผู้ดูแลกิลด์ที่เพิ่มข้อมูลตัวละครของผู้เล่นที่ยังไม่ได้เข้าสู่ระบบ ต้องมั่นใจว่ามีสิทธิ์ทำเช่นนั้น',
					'การจัดการข้อมูลส่วนบุคคลเป็นไปตามนโยบายความเป็นส่วนตัวของเรา'
				]
			},
			{
				id: 'third-party',
				heading: 'บริการของบุคคลที่สาม',
				body: [
					'บริการทำงานร่วมกับ Discord (การเข้าสู่ระบบและบอท) และ Omise (การรับชำระเงิน) การใช้บริการเหล่านั้นอยู่ภายใต้ข้อกำหนดของผู้ให้บริการแต่ละราย เราไม่รับผิดชอบต่อการหยุดให้บริการหรือการเปลี่ยนแปลงของบริการภายนอก'
				]
			},
			{
				id: 'availability',
				heading: 'ความพร้อมให้บริการและการเปลี่ยนแปลงบริการ',
				body: [
					'เราพยายามให้บริการใช้งานได้ต่อเนื่อง แต่ไม่รับประกันว่าจะไม่มีการหยุดชะงัก อาจมีการปิดปรับปรุงระบบ ซึ่งเราจะแจ้งล่วงหน้าเมื่อทำได้',
					'เราอาจเพิ่ม ปรับปรุง หรือเลิกฟีเจอร์บางส่วน หากการเปลี่ยนแปลงทำให้แพ็กเกจที่ชำระแล้วด้อยลงอย่างมีนัยสำคัญ คุณมีสิทธิ์ยกเลิกและขอคืนเงินส่วนที่เหลือของรอบปัจจุบัน'
				]
			},
			{
				id: 'liability',
				heading: 'ข้อจำกัดความรับผิด',
				body: [
					'บริการให้ “ตามสภาพที่เป็นอยู่” เท่าที่กฎหมายอนุญาต เราไม่รับผิดต่อความเสียหายทางอ้อม เช่น ผลแพ้ชนะในเกม การสูญเสียไอเทม หรือข้อพิพาทระหว่างสมาชิกกิลด์',
					'ความรับผิดรวมของเราต่อคุณไม่เกินจำนวนค่าบริการที่คุณชำระให้เราในช่วง 3 เดือนก่อนเกิดเหตุ ทั้งนี้ไม่ตัดสิทธิ์ใด ๆ ที่คุณมีตามกฎหมายคุ้มครองผู้บริโภค'
				]
			},
			{
				id: 'termination',
				heading: 'การระงับหรือยุติการใช้บริการ',
				body: [
					'เราอาจระงับหรือยุติบัญชีหรือกิลด์ที่ฝ่าฝืนข้อกำหนดนี้อย่างร้ายแรง โดยจะแจ้งเหตุผลให้ทราบ หากการยุติไม่ได้เกิดจากการฝ่าฝืนของคุณ เราจะคืนเงินส่วนที่เหลือของรอบปัจจุบัน',
					'เมื่อยุติการใช้บริการ คุณขอส่งออกข้อมูลกิลด์ได้ภายใน 30 วัน หลังจากนั้นข้อมูลจะถูกลบตามนโยบายความเป็นส่วนตัว'
				]
			},
			{
				id: 'changes',
				heading: 'การแก้ไขข้อกำหนด',
				body: [
					'เราอาจแก้ไขข้อกำหนดนี้เป็นครั้งคราว โดยจะประกาศบนหน้านี้และปรับวันที่มีผลบังคับใช้ หากเป็นการเปลี่ยนแปลงสำคัญ เราจะแจ้งผู้ดูแลกิลด์ล่วงหน้าอย่างน้อย 30 วัน'
				]
			},
			{
				id: 'law',
				heading: 'กฎหมายที่ใช้บังคับ',
				body: ['ข้อกำหนดนี้อยู่ภายใต้กฎหมายไทย ข้อพิพาทใดที่ตกลงกันไม่ได้ให้อยู่ในเขตอำนาจของศาลไทย']
			},
			{
				id: 'contact',
				heading: 'ติดต่อเรา',
				body: ['หากมีคำถามเกี่ยวกับข้อกำหนดนี้ การชำระเงิน หรือการคืนเงิน ติดต่อได้ที่', contactBlock('th')]
			}
		]
	},
	en: {
		title: 'Terms & Conditions',
		intro: `These terms govern your use of ${site.name} (the “Service”), provided by ${L.businessNameEn} (“we”, “us”). Please read them in full before signing up or paying. By using the Service you agree to these terms.`,
		sections: [
			{
				id: 'service',
				heading: 'The Service',
				body: [
					`${site.name} is a web application for managing guilds in Ragnarok: The New World. It includes a party builder (Guild League / Siege War / Polarity), war leave requests, a war schedule, a guild auction queue, and a Discord bot that sends reminders and images to chat channels.`,
					'The Service is a digital service used through a web browser. No physical goods are shipped.',
					'The Service is a player-made tool. It is not affiliated with, endorsed by, or licensed by the game’s developer or publisher, and we do not sell in-game items, currency, or accounts.'
				]
			},
			{
				id: 'account',
				heading: 'Accounts',
				body: [
					'You sign in with your Discord account and are responsible for all activity under it.',
					'The person who subscribes on behalf of a guild (usually the Guild Master) is the “guild owner”. The guild owner controls other members’ ranks and permissions and is responsible for the guild’s payments.',
					'If you are under 20 years old, you must have a parent or guardian’s consent before making a payment.'
				]
			},
			{
				id: 'pricing',
				heading: 'Plans, prices and payment',
				body: [
					'Plan prices are shown in the “Pricing” section of this website in Thai baht (THB), per guild per month. Guild members use the Service at no extra cost.',
					'Fees are charged in advance for each billing period (monthly), at the price shown on the date of payment.',
					'Payments by credit/debit card and other available methods are processed by our payment provider Omise (Opn Payments). We do not store your card number or CVV.',
					'If you choose automatic renewal, the next period is charged to the same payment method at the end of each period until you cancel.',
					'We may change prices with at least 30 days’ notice. New prices apply from the next billing period.'
				]
			},
			{
				id: 'delivery',
				heading: 'Service delivery',
				body: [
					'Once payment is confirmed, your guild’s plan is activated immediately, or within 24 hours if our team needs to set it up.',
					'If your guild is not activated within that time, please contact us using the details under “Contact us”.'
				]
			},
			{
				id: 'trial',
				heading: 'Free trial',
				body: [
					'The trial plan gives access for 14 days with no charge and no card required. It does not convert to a paid plan automatically.',
					'One trial per guild.'
				]
			},
			{
				id: 'cancel',
				heading: 'Cancellation',
				body: [
					'You can cancel renewal at any time, with no minimum term, from your guild settings or by emailing us.',
					'After you cancel, your guild keeps access until the end of the period already paid for and will not be charged again.'
				]
			},
			{
				id: 'refund',
				heading: 'Refund policy',
				body: [
					'Because the Service is available immediately after payment and a free trial is offered beforehand, fees already paid are not refunded pro rata for the rest of a period, except in the following cases, where we refund the full amount for that period:',
					[
						'You were charged twice for the same period.',
						'You were charged after successfully cancelling renewal.',
						'You paid but we could not activate your guild within 7 days.',
						'The Service was unavailable for more than 7 consecutive days for reasons within our control.'
					],
					`Request a refund within 14 days of the charge by emailing ${L.email} with your guild name, payment date, amount and reason.`,
					'We reply within 7 business days. Approved refunds are returned to the original payment method within 30 days; when the amount appears on your card statement depends on your card issuer.'
				]
			},
			{
				id: 'acceptable-use',
				heading: 'Acceptable use',
				body: [
					'You agree not to:',
					[
						'use the Service for anything unlawful or that infringes others’ rights;',
						'post content that is defamatory, threatening, hateful, or that exposes other people’s personal data;',
						'try to access other guilds’ data or systems without permission, or disrupt the Service;',
						'use the Service to trade in-game items, currency or accounts for real money;',
						'copy, modify or resell the Service without our written permission.'
					]
				]
			},
			{
				id: 'content',
				heading: 'Your data and content',
				body: [
					'Data that you and your guild members enter (such as character names, lineups, leave requests and auction queues) belongs to you. You allow us to store, process and display it as needed to provide the Service.',
					'Guild owners and officers who add characters for players who have not signed in must make sure they are entitled to do so.',
					'Personal data is handled as described in our Privacy Policy.'
				]
			},
			{
				id: 'third-party',
				heading: 'Third-party services',
				body: [
					'The Service works with Discord (sign-in and bot) and Omise (payments). Your use of them is subject to their own terms. We are not responsible for outages or changes in third-party services.'
				]
			},
			{
				id: 'availability',
				heading: 'Availability and changes to the Service',
				body: [
					'We aim to keep the Service running but do not guarantee it will be uninterrupted. Maintenance may be needed, and we will give notice when we can.',
					'We may add, change or retire features. If a change makes a paid plan materially worse, you may cancel and request a refund of the unused part of the current period.'
				]
			},
			{
				id: 'liability',
				heading: 'Limitation of liability',
				body: [
					'The Service is provided “as is”. To the extent permitted by law, we are not liable for indirect losses, such as in-game results, lost items, or disputes between guild members.',
					'Our total liability to you is limited to the fees you paid us in the 3 months before the event. This does not limit any rights you have under consumer protection law.'
				]
			},
			{
				id: 'termination',
				heading: 'Suspension and termination',
				body: [
					'We may suspend or close accounts or guilds that seriously breach these terms, and will tell you why. If we close your guild for reasons other than your breach, we refund the unused part of the current period.',
					'After termination you can request an export of your guild data within 30 days. Data is then deleted as described in our Privacy Policy.'
				]
			},
			{
				id: 'changes',
				heading: 'Changes to these terms',
				body: [
					'We may update these terms from time to time by posting them on this page and updating the effective date. For significant changes, we will notify guild owners at least 30 days in advance.'
				]
			},
			{
				id: 'law',
				heading: 'Governing law',
				body: ['These terms are governed by the laws of Thailand. Disputes that cannot be resolved between us are subject to the jurisdiction of the Thai courts.']
			},
			{
				id: 'contact',
				heading: 'Contact us',
				body: ['For questions about these terms, payments or refunds, contact:', contactBlock('en')]
			}
		]
	}
};

const privacy: Record<LegalLang, LegalDoc> = {
	th: {
		title: 'นโยบายความเป็นส่วนตัว',
		intro: `${L.businessName} (“เรา”) ให้ความสำคัญกับข้อมูลส่วนบุคคลของคุณ นโยบายนี้อธิบายว่าเราเก็บ ใช้ เปิดเผย และคุ้มครองข้อมูลส่วนบุคคลอย่างไรเมื่อคุณใช้ ${site.name} ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)`,
		sections: [
			{
				id: 'controller',
				heading: 'ผู้ควบคุมข้อมูลส่วนบุคคล',
				body: [`${L.businessName} เป็นผู้ควบคุมข้อมูลส่วนบุคคลสำหรับข้อมูลที่เก็บผ่านบริการนี้ ติดต่อได้ที่ ${L.email}`]
			},
			{
				id: 'collect',
				heading: 'ข้อมูลที่เราเก็บ',
				body: [
					[
						'ข้อมูลบัญชี Discord ตามสิทธิ์ที่คุณอนุญาตตอนเข้าสู่ระบบ เช่น Discord ID ชื่อผู้ใช้ ชื่อที่แสดง รูปโปรไฟล์ และอีเมล (ถ้ามี)',
						'ข้อมูลเกมที่คุณหรือเจ้าหน้าที่กิลด์บันทึก เช่น ชื่อตัวละคร อาชีพ ตำแหน่งในกิลด์ การจัดปาร์ตี้ รายการลาพร้อมเหตุผล และประวัติคิวประมูล',
						'ข้อมูลการชำระเงิน เช่น ชื่อผู้ชำระ อีเมล จำนวนเงิน วันที่ เลขอ้างอิงธุรกรรม ประเภทบัตรและเลข 4 หลักท้าย ซึ่งได้รับจาก Omise — เราไม่เก็บหมายเลขบัตรเต็มหรือรหัส CVV',
						'ข้อมูลการติดต่อ เช่น ข้อความที่คุณส่งหาเราทาง Discord, LINE, Facebook หรืออีเมล',
						'ข้อมูลทางเทคนิค เช่น หมายเลข IP ประเภทเบราว์เซอร์ และบันทึกการใช้งานระบบ (log) เพื่อความปลอดภัยและแก้ไขปัญหา'
					]
				]
			},
			{
				id: 'purpose',
				heading: 'วัตถุประสงค์และฐานทางกฎหมาย',
				body: [
					[
						'ให้บริการตามสัญญา (ฐานสัญญา): ยืนยันตัวตน แสดงข้อมูลกิลด์ จัดปาร์ตี้ ส่งการแจ้งเตือนผ่านบอท Discord และเปิดใช้งานแพ็กเกจ',
						'รับชำระเงิน ออกใบเสร็จ และดำเนินการคืนเงิน (ฐานสัญญา และฐานหน้าที่ตามกฎหมายด้านบัญชีและภาษี)',
						'รักษาความปลอดภัย ป้องกันการทุจริต และปรับปรุงบริการ (ฐานประโยชน์โดยชอบด้วยกฎหมาย)',
						'ตอบคำถามและให้ความช่วยเหลือ (ฐานสัญญา หรือประโยชน์โดยชอบด้วยกฎหมาย)',
						'ส่งข่าวสารหรือโปรโมชัน เฉพาะเมื่อคุณให้ความยินยอม (ฐานความยินยอม) และถอนความยินยอมได้ทุกเมื่อ'
					]
				]
			},
			{
				id: 'share',
				heading: 'การเปิดเผยข้อมูล',
				body: [
					'เราไม่ขายข้อมูลส่วนบุคคลของคุณ เราเปิดเผยข้อมูลเท่าที่จำเป็นให้แก่:',
					[
						'สมาชิกในกิลด์เดียวกัน ซึ่งเห็นชื่อตัวละคร ตำแหน่ง การจัดปาร์ตี้ และรายการลาตามสิทธิ์ของตำแหน่ง',
						'Omise (Opn Payments) ผู้ให้บริการรับชำระเงิน',
						'Discord สำหรับการเข้าสู่ระบบและการส่งข้อความของบอทลงเซิร์ฟเวอร์ที่คุณกำหนด',
						'ผู้ให้บริการโฮสติ้งและคลาวด์ที่เก็บข้อมูลของระบบ',
						'หน่วยงานรัฐ เมื่อกฎหมายกำหนดหรือมีคำสั่งโดยชอบด้วยกฎหมาย'
					]
				]
			},
			{
				id: 'transfer',
				heading: 'การส่งข้อมูลไปต่างประเทศ',
				body: [
					'ผู้ให้บริการบางราย (เช่น Discord และผู้ให้บริการคลาวด์) อาจเก็บข้อมูลบนเซิร์ฟเวอร์นอกประเทศไทย เราเลือกผู้ให้บริการที่มีมาตรการคุ้มครองข้อมูลที่เหมาะสมตามที่ PDPA กำหนด'
				]
			},
			{
				id: 'retention',
				heading: 'ระยะเวลาการเก็บรักษา',
				body: [
					[
						'ข้อมูลบัญชีและข้อมูลกิลด์: ตลอดระยะเวลาที่ใช้บริการ และลบภายใน 90 วันหลังกิลด์ยุติการใช้บริการหรือเมื่อคุณขอลบ',
						'ข้อมูลการชำระเงินและเอกสารทางบัญชี: เก็บตามระยะเวลาที่กฎหมายบัญชีและภาษีกำหนด (โดยทั่วไป 5 ปี)',
						'บันทึกการใช้งานระบบ (log): ไม่เกิน 90 วัน เว้นแต่จำเป็นต่อการตรวจสอบเหตุด้านความปลอดภัย'
					]
				]
			},
			{
				id: 'cookies',
				heading: 'คุกกี้และการจัดเก็บในเบราว์เซอร์',
				body: [
					'หน้าเว็บไซต์นี้ใช้พื้นที่จัดเก็บในเบราว์เซอร์ (localStorage) เพื่อจำการตั้งค่าธีมสว่าง/มืดเท่านั้น ระบบหลังเข้าสู่ระบบใช้คุกกี้ที่จำเป็นเพื่อรักษาสถานะการเข้าสู่ระบบ เราไม่ใช้คุกกี้โฆษณาหรือคุกกี้ติดตามข้ามเว็บไซต์'
				]
			},
			{
				id: 'security',
				heading: 'การรักษาความปลอดภัย',
				body: [
					'เราใช้การเชื่อมต่อแบบเข้ารหัส (HTTPS) จำกัดสิทธิ์การเข้าถึงข้อมูลตามตำแหน่ง และให้ Omise ซึ่งได้มาตรฐาน PCI DSS เป็นผู้ประมวลผลข้อมูลบัตร หากเกิดเหตุละเมิดข้อมูลส่วนบุคคลที่มีความเสี่ยงต่อสิทธิของคุณ เราจะแจ้งสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลและผู้ที่ได้รับผลกระทบตามที่กฎหมายกำหนด'
				]
			},
			{
				id: 'rights',
				heading: 'สิทธิของเจ้าของข้อมูล',
				body: [
					'ภายใต้ PDPA คุณมีสิทธิ์:',
					[
						'ขอเข้าถึงและขอรับสำเนาข้อมูลส่วนบุคคลของคุณ',
						'ขอให้โอนย้ายข้อมูลไปยังผู้ควบคุมข้อมูลรายอื่น',
						'คัดค้านการเก็บ ใช้ หรือเปิดเผยข้อมูล',
						'ขอให้ลบ ทำลาย หรือทำให้ข้อมูลไม่สามารถระบุตัวตนได้',
						'ขอให้ระงับการใช้ข้อมูล',
						'ขอให้แก้ไขข้อมูลให้ถูกต้องและเป็นปัจจุบัน',
						'ถอนความยินยอมที่เคยให้ไว้',
						'ร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.)'
					],
					`ใช้สิทธิ์ได้โดยส่งอีเมลมาที่ ${L.email} เราจะดำเนินการภายใน 30 วัน และอาจขอให้ยืนยันตัวตนก่อน`
				]
			},
			{
				id: 'children',
				heading: 'ผู้เยาว์',
				body: [
					'ผู้ใช้ที่อายุต่ำกว่า 20 ปีควรได้รับความยินยอมจากผู้ปกครองก่อนชำระเงิน และผู้ที่อายุต่ำกว่า 10 ปีต้องให้ผู้ปกครองเป็นผู้ให้ความยินยอมแทน หากผู้ปกครองพบว่าบุตรหลานให้ข้อมูลโดยไม่ได้รับความยินยอม โปรดติดต่อเราเพื่อลบข้อมูล'
				]
			},
			{
				id: 'changes',
				heading: 'การเปลี่ยนแปลงนโยบาย',
				body: ['เราอาจปรับปรุงนโยบายนี้เป็นครั้งคราว โดยจะประกาศบนหน้านี้พร้อมวันที่มีผลบังคับใช้ หากเป็นการเปลี่ยนแปลงสำคัญ เราจะแจ้งให้ทราบล่วงหน้า']
			},
			{
				id: 'contact',
				heading: 'ติดต่อเรา',
				body: ['หากมีคำถามหรือต้องการใช้สิทธิ์เกี่ยวกับข้อมูลส่วนบุคคล ติดต่อได้ที่', contactBlock('th')]
			}
		]
	},
	en: {
		title: 'Privacy Policy',
		intro: `${L.businessNameEn} (“we”, “us”) respects your privacy. This policy explains how we collect, use, disclose and protect personal data when you use ${site.name}, in line with Thailand’s Personal Data Protection Act B.E. 2562 (2019) (“PDPA”).`,
		sections: [
			{
				id: 'controller',
				heading: 'Data controller',
				body: [`${L.businessNameEn} is the data controller for personal data collected through the Service. Contact: ${L.email}`]
			},
			{
				id: 'collect',
				heading: 'Data we collect',
				body: [
					[
						'Discord account data you allow at sign-in, such as Discord ID, username, display name, avatar and email (if granted).',
						'Game data entered by you or your guild officers, such as character names, classes, guild ranks, party assignments, leave requests with reasons, and auction queue history.',
						'Payment data received from Omise, such as payer name, email, amount, date, transaction reference, card brand and last 4 digits. We never store full card numbers or CVV.',
						'Messages you send us on Discord, LINE, Facebook or email.',
						'Technical data such as IP address, browser type and system logs, for security and troubleshooting.'
					]
				]
			},
			{
				id: 'purpose',
				heading: 'Purposes and legal bases',
				body: [
					[
						'Providing the Service (contract): signing you in, showing guild data, building parties, sending Discord bot notifications and activating plans.',
						'Taking payments, issuing receipts and processing refunds (contract, and legal obligations under accounting and tax law).',
						'Keeping the Service secure, preventing fraud and improving the Service (legitimate interests).',
						'Answering questions and providing support (contract or legitimate interests).',
						'Sending news or promotions only with your consent, which you can withdraw at any time.'
					]
				]
			},
			{
				id: 'share',
				heading: 'Who we share data with',
				body: [
					'We do not sell your personal data. We share it only as needed with:',
					[
						'members of your guild, who can see character names, ranks, lineups and leave requests according to their permissions;',
						'Omise (Opn Payments), our payment provider;',
						'Discord, for sign-in and for bot messages posted to servers you choose;',
						'hosting and cloud providers that store the Service’s data;',
						'government authorities, when required by law or a lawful order.'
					]
				]
			},
			{
				id: 'transfer',
				heading: 'International transfers',
				body: [
					'Some providers (such as Discord and cloud providers) may store data on servers outside Thailand. We use providers with appropriate data protection safeguards as required by the PDPA.'
				]
			},
			{
				id: 'retention',
				heading: 'How long we keep data',
				body: [
					[
						'Account and guild data: while you use the Service, and deleted within 90 days after your guild stops using it or when you ask us to delete it.',
						'Payment records and accounting documents: for the period required by accounting and tax law (generally 5 years).',
						'System logs: up to 90 days, unless needed to investigate a security incident.'
					]
				]
			},
			{
				id: 'cookies',
				heading: 'Cookies and browser storage',
				body: [
					'This website uses browser storage (localStorage) only to remember your light/dark theme. The signed-in app uses essential cookies to keep you logged in. We do not use advertising or cross-site tracking cookies.'
				]
			},
			{
				id: 'security',
				heading: 'Security',
				body: [
					'We use encrypted connections (HTTPS), restrict data access by role, and rely on Omise, a PCI DSS–compliant provider, to process card data. If a personal data breach is likely to put your rights at risk, we will notify the Personal Data Protection Committee and affected people as required by law.'
				]
			},
			{
				id: 'rights',
				heading: 'Your rights',
				body: [
					'Under the PDPA you have the right to:',
					[
						'access and get a copy of your personal data;',
						'have your data transferred to another controller;',
						'object to the collection, use or disclosure of your data;',
						'have your data deleted, destroyed or anonymised;',
						'restrict the use of your data;',
						'have your data corrected and kept up to date;',
						'withdraw consent you have given;',
						'complain to the Office of the Personal Data Protection Committee (PDPC).'
					],
					`To exercise these rights, email ${L.email}. We respond within 30 days and may ask you to verify your identity.`
				]
			},
			{
				id: 'children',
				heading: 'Minors',
				body: [
					'Users under 20 should have a parent or guardian’s consent before paying, and consent for users under 10 must be given by a parent or guardian. If you believe a child has given us data without consent, contact us and we will delete it.'
				]
			},
			{
				id: 'changes',
				heading: 'Changes to this policy',
				body: ['We may update this policy from time to time by posting it on this page with a new effective date. We will give advance notice of significant changes.']
			},
			{
				id: 'contact',
				heading: 'Contact us',
				body: ['For questions or to exercise your rights regarding personal data, contact:', contactBlock('en')]
			}
		]
	}
};

export const legalDocs: Record<LegalDocId, Record<LegalLang, LegalDoc>> = { terms, privacy };
