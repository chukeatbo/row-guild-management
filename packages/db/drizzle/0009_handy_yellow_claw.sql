CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'successful', 'failed', 'expired', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'expired', 'cancelled');--> statement-breakpoint
CREATE TABLE "guild_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"package_id" text NOT NULL,
	"order_id" text NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"limits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "omise_webhook_event" (
	"id" text PRIMARY KEY NOT NULL,
	"omise_event_id" text NOT NULL,
	"type" text NOT NULL,
	"object_id" text,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_no" text NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text,
	"package_id" text NOT NULL,
	"package_snapshot" jsonb NOT NULL,
	"amount_satang" integer NOT NULL,
	"currency" text DEFAULT 'THB' NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"idempotency_key" text,
	"billing_info" jsonb,
	"expires_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_amount_nonneg" CHECK ("orders"."amount_satang" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"omise_charge_id" text NOT NULL,
	"method" text NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"amount_satang" integer NOT NULL,
	"currency" text DEFAULT 'THB' NOT NULL,
	"fee_satang" integer,
	"authorize_uri" text,
	"qr_image_uri" text,
	"card" jsonb,
	"failure_code" text,
	"failure_message" text,
	"expires_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"raw_charge" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_amount_pos" CHECK ("payment"."amount_satang" > 0)
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"translations" jsonb,
	"price_satang" integer NOT NULL,
	"currency" text DEFAULT 'THB' NOT NULL,
	"duration_days" integer,
	"limits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "package_price_nonneg" CHECK ("packages"."price_satang" >= 0),
	CONSTRAINT "package_duration_pos" CHECK ("packages"."duration_days" is null or "packages"."duration_days" > 0)
);
--> statement-breakpoint
CREATE TABLE "refund" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"omise_refund_id" text NOT NULL,
	"amount_satang" integer NOT NULL,
	"reason" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refund_amount_pos" CHECK ("refund"."amount_satang" > 0)
);
--> statement-breakpoint
ALTER TABLE "guild_subscription" ADD CONSTRAINT "guild_subscription_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_subscription" ADD CONSTRAINT "guild_subscription_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_subscription" ADD CONSTRAINT "guild_subscription_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund" ADD CONSTRAINT "refund_payment_id_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund" ADD CONSTRAINT "refund_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "guild_subscription_order_uq" ON "guild_subscription" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "guild_subscription_active_idx" ON "guild_subscription" USING btree ("organization_id","status","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "omise_webhook_event_uq" ON "omise_webhook_event" USING btree ("omise_event_id");--> statement-breakpoint
CREATE INDEX "omise_webhook_object_idx" ON "omise_webhook_event" USING btree ("object_id");--> statement-breakpoint
CREATE INDEX "omise_webhook_unprocessed_idx" ON "omise_webhook_event" USING btree ("processed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "order_no_uq" ON "orders" USING btree ("order_no");--> statement-breakpoint
CREATE UNIQUE INDEX "order_idempotency_uq" ON "orders" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "order_user_idx" ON "orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "order_org_idx" ON "orders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "order_pending_exp_idx" ON "orders" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_charge_uq" ON "payment" USING btree ("omise_charge_id");--> statement-breakpoint
CREATE INDEX "payment_order_idx" ON "payment" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "package_code_uq" ON "packages" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "refund_omise_uq" ON "refund" USING btree ("omise_refund_id");--> statement-breakpoint
CREATE INDEX "refund_payment_idx" ON "refund" USING btree ("payment_id");