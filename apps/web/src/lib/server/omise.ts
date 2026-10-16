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

/** ดึง charge ล่าสุดจาก Omise ด้วย secret key — แหล่งความจริงของสถานะเงิน (webhook payload ไม่ใช่) */
export async function fetchCharge(chargeId: string): Promise<OmiseCharge> {
	const key = process.env.OMISE_SECRET_KEY;
	if (!key) throw new BillingError('omise_not_configured', 503);
	if (!/^chrg_[A-Za-z0-9_]+$/.test(chargeId)) throw new BillingError('invalid_charge_id', 400);
	const base = (process.env.OMISE_API_BASE ?? 'https://api.omise.co').replace(/\/$/, '');
	const res = await fetch(`${base}/charges/${chargeId}`, {
		headers: { authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}` },
		signal: AbortSignal.timeout(10_000)
	});
	if (res.status === 404) throw new BillingError('charge_not_found', 404);
	if (!res.ok) throw new Error(`omise api ${res.status}`);
	return (await res.json()) as OmiseCharge;
}
