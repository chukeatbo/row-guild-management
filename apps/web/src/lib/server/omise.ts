import { BillingError } from './billing-error.ts';

/** ส่วนของ Omise charge object ที่เราใช้ (https://docs.opn.ooo/charges-api) */
export interface OmiseCharge {
	id: string;
	status: string; // pending | successful | failed | expired | reversed
	paid?: boolean;
	amount: number; // สตางค์
	currency: string;
	refunded_amount?: number;
	failure_code?: string | null;
	failure_message?: string | null;
	authorize_uri?: string | null;
	expires_at?: string | null;
	paid_at?: string | null;
	metadata?: Record<string, unknown> | null;
	source?: { type?: string; scannable_code?: { image?: { download_uri?: string } } } | null;
	card?: { brand?: string; last_digits?: string; name?: string; fingerprint?: string } | null;
	refunds?: { data?: { id: string; amount: number; created_at?: string }[] } | null;
	[k: string]: unknown;
}

const apiBase = () => (process.env.OMISE_API_BASE ?? 'https://api.omise.co').replace(/\/$/, '');
const basic = (key: string) => `Basic ${Buffer.from(`${key}:`).toString('base64')}`;

function secretKey() {
	const key = process.env.OMISE_SECRET_KEY;
	if (!key) throw new BillingError('omise_not_configured', 503);
	return key;
}

/** public key สำหรับ Omise.js ฝั่ง browser (tokenize บัตร) — ไม่ใช่ความลับ */
export const omisePublicKey = () => process.env.OMISE_PUBLIC_KEY ?? '';

/** ดึง charge ล่าสุดจาก Omise ด้วย secret key — แหล่งความจริงของสถานะเงิน (webhook payload ไม่ใช่) */
export async function fetchCharge(chargeId: string): Promise<OmiseCharge> {
	const key = secretKey();
	if (!/^chrg_[A-Za-z0-9_]+$/.test(chargeId)) throw new BillingError('invalid_charge_id', 400);
	const res = await fetch(`${apiBase()}/charges/${chargeId}`, {
		headers: { authorization: basic(key) },
		signal: AbortSignal.timeout(10_000)
	});
	if (res.status === 404) throw new BillingError('charge_not_found', 404);
	if (!res.ok) throw new Error(`omise api ${res.status}`);
	return (await res.json()) as OmiseCharge;
}

export interface CreateChargeInput {
	amount: number;
	currency: string;
	description: string;
	metadata: Record<string, string | null>;
	returnUri: string;
	/** card token จาก Omise.js (tokn_...) */
	card?: string;
	/** ชนิด source เช่น promptpay, mobile_banking_scb */
	sourceType?: string;
}

/**
 * สร้าง charge ด้วย secret key (ฝั่งเซิร์ฟเวอร์เท่านั้น)
 * ผลลัพธ์: บัตรอาจสำเร็จทันทีหรือต้อง 3DS (authorize_uri); PromptPay/QR ได้ scannable_code; ธนาคาร/wallet ได้ authorize_uri
 */
export async function createCharge(input: CreateChargeInput): Promise<OmiseCharge> {
	const key = secretKey();
	const body = new URLSearchParams({
		amount: String(input.amount),
		currency: input.currency.toLowerCase(),
		description: input.description,
		return_uri: input.returnUri
	});
	for (const [k, v] of Object.entries(input.metadata)) if (v != null) body.set(`metadata[${k}]`, v);
	if (input.card) body.set('card', input.card);
	else if (input.sourceType) body.set('source[type]', input.sourceType);
	else throw new BillingError('invalid_method', 400);

	const res = await fetch(`${apiBase()}/charges`, {
		method: 'POST',
		headers: { authorization: basic(key), 'content-type': 'application/x-www-form-urlencoded' },
		body,
		signal: AbortSignal.timeout(20_000)
	});
	const data = (await res.json().catch(() => null)) as (OmiseCharge & { object?: string; code?: string; message?: string }) | null;
	if (!res.ok || !data || data.object === 'error') {
		// เช่น บัตรถูกปฏิเสธตอนสร้าง / ช่องทางไม่ได้เปิดในบัญชี / ยอดต่ำกว่าขั้นต่ำ
		console.error('[omise] create charge failed:', res.status, data?.code, data?.message);
		throw new BillingError(data?.code === 'invalid_card' || data?.code === 'failed_processing' ? 'payment_declined' : 'payment_failed', 402);
	}
	return data;
}

export interface OmiseCapability {
	payment_methods: { name: string; currencies: string[] }[];
	limits?: { charge_amount?: { min: number; max: number } };
}

let capCache: { at: number; data: OmiseCapability } | null = null;
/** ช่องทางที่บัญชี Omise เปิดไว้ (cache 10 นาที) — ใช้ public key ได้ */
export async function getCapability(): Promise<OmiseCapability | null> {
	if (capCache && Date.now() - capCache.at < 10 * 60_000) return capCache.data;
	const key = omisePublicKey();
	if (!key) return null;
	try {
		const res = await fetch(`${apiBase()}/capability`, { headers: { authorization: basic(key) }, signal: AbortSignal.timeout(10_000) });
		if (!res.ok) return capCache?.data ?? null;
		capCache = { at: Date.now(), data: (await res.json()) as OmiseCapability };
		return capCache.data;
	} catch {
		return capCache?.data ?? null;
	}
}
