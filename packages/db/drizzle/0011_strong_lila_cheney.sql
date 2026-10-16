ALTER TABLE "guild_profile" ADD COLUMN "billing_exempt" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- กิลด์ที่มีอยู่ก่อนระบบ billing (Super Admin สร้าง) ใช้ได้ไม่จำกัด — ไม่งั้นจะถูกล็อกทันทีที่เปิดใช้การตรวจสิทธิ์
INSERT INTO "guild_profile" ("organization_id", "billing_exempt")
SELECT "id", true FROM "organization"
ON CONFLICT ("organization_id") DO UPDATE SET "billing_exempt" = true;
