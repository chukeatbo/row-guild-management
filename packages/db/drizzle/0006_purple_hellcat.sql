CREATE TABLE "notification_sent" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_sent" ADD CONSTRAINT "notification_sent_event_id_guild_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."guild_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_sent_uq" ON "notification_sent" USING btree ("event_id","starts_at","kind");