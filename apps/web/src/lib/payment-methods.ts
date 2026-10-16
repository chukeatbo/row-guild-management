/**
 * ช่องทางชำระเงินของ Omise ที่หน้า checkout รองรับ (ใช้ทั้งฝั่ง server และ client)
 * รายการจริงมาจาก Omise Capability API ของบัญชี (เปิด/ปิดใน Omise dashboard) แล้วกรองด้วย isSupportedMethod
 */

/** ต้องใช้ข้อมูลเพิ่ม (เบอร์/บัญชี/ที่อยู่/รหัสผ่อน) หรือเป็นโหมดที่ร้านต้องสแกนเครื่องลูกค้า — ยังไม่รองรับ */
const UNSUPPORTED = /^(installment_|atome|direct_debit_|bill_payment_|barcode_|points_|econtext)|_upm$|^truemoney$/;

export const isSupportedMethod = (name: string, currencies: string[] = ['THB']) =>
	currencies.includes('THB') && !UNSUPPORTED.test(name);

export type MethodGroup = 'card' | 'qr' | 'bank' | 'wallet';

const LABELS: Record<string, string> = {
	card: 'Credit / Debit card',
	promptpay: 'PromptPay',
	mobile_banking_scb: 'SCB Easy',
	mobile_banking_kbank: 'K PLUS',
	mobile_banking_bay: 'Krungsri (KMA)',
	mobile_banking_bbl: 'Bangkok Bank',
	mobile_banking_ktb: 'Krungthai NEXT',
	truemoney_jumpapp: 'TrueMoney Wallet',
	truemoney_qr: 'TrueMoney QR',
	rabbit_linepay: 'Rabbit LINE Pay',
	shopeepay: 'ShopeePay',
	shopeepay_jumpapp: 'ShopeePay (app)',
	alipay: 'Alipay',
	alipay_cn: 'Alipay (China)',
	alipay_hk: 'AlipayHK',
	alipayplus_mpm: 'Alipay+',
	wechat_pay: 'WeChat Pay',
	wechat_pay_mpm: 'WeChat Pay QR',
	grabpay: 'GrabPay',
	kakaopay: 'KakaoPay',
	touch_n_go: "Touch 'n Go"
};

export const methodLabel = (name: string) =>
	LABELS[name] ?? name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function methodGroup(name: string): MethodGroup {
	if (name === 'card') return 'card';
	if (name === 'promptpay' || name.endsWith('_qr') || name.endsWith('_mpm')) return 'qr';
	if (name.startsWith('mobile_banking_') || name.startsWith('internet_banking_')) return 'bank';
	return 'wallet';
}

const GROUP_ORDER: MethodGroup[] = ['qr', 'card', 'bank', 'wallet'];
/** เรียง: PromptPay ก่อน แล้วบัตร ธนาคาร wallet */
export const sortMethods = (names: string[]) =>
	[...names].sort(
		(a, b) =>
			Number(b === 'promptpay') - Number(a === 'promptpay') ||
			GROUP_ORDER.indexOf(methodGroup(a)) - GROUP_ORDER.indexOf(methodGroup(b)) ||
			methodLabel(a).localeCompare(methodLabel(b))
	);
