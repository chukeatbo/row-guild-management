/** error ที่มี code ให้ API ตอบกลับเป็น JSON (status = HTTP status) */
export class BillingError extends Error {
	constructor(
		public code: string,
		public status = 400
	) {
		super(code);
	}
}

/** เหตุการณ์ที่รับทราบแล้วแต่ไม่ต้องทำอะไร/ไม่ควรให้ Omise ส่งซ้ำ (เช่น charge ที่ไม่ได้มาจากระบบเรา) */
export class Ignored extends Error {}
