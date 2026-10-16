CREATE TABLE "event_schedule" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"type" "event_type" NOT NULL,
	"weekdays" integer[] DEFAULT '{}' NOT NULL,
	"start_time" text DEFAULT '20:00' NOT NULL,
	"leave_deadline_hours" integer,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_schedule_org_type_uq" UNIQUE("organization_id","type")
);
--> statement-breakpoint
ALTER TABLE "guild_event" ADD COLUMN "schedule_id" text;--> statement-breakpoint
ALTER TABLE "event_schedule" ADD CONSTRAINT "event_schedule_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_event" ADD CONSTRAINT "guild_event_schedule_id_event_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."event_schedule"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_event" ADD CONSTRAINT "guild_event_schedule_start_uq" UNIQUE("schedule_id","starts_at");