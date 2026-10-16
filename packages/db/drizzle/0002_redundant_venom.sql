ALTER TABLE "guild_event" DROP CONSTRAINT "guild_event_schedule_start_uq";--> statement-breakpoint
ALTER TABLE "guild_event" DROP CONSTRAINT "guild_event_schedule_id_event_schedule_id_fk";
--> statement-breakpoint
ALTER TABLE "guild_event" ALTER COLUMN "starts_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "guild_event" DROP COLUMN "schedule_id";--> statement-breakpoint
ALTER TABLE "guild_event" ADD CONSTRAINT "guild_event_org_type_uq" UNIQUE("organization_id","type");