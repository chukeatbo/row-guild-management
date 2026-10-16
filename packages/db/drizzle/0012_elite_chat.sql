ALTER TABLE "orders" ADD COLUMN "granted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "claim_token_hash" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "claim_token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "receipt_sent_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "order_claim_token_uq" ON "orders" USING btree ("claim_token_hash");--> statement-breakpoint
-- ออเดอร์ที่ให้สิทธิ์ไปแล้วก่อนมีคอลัมน์นี้
UPDATE "orders" o SET "granted_at" = s."created_at" FROM "guild_subscription" s WHERE s."order_id" = o."id";
