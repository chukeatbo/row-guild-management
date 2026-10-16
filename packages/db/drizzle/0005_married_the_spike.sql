CREATE TABLE "auction_award" (
	"id" text PRIMARY KEY NOT NULL,
	"auction_id" text NOT NULL,
	"character_id" text,
	"ign" text NOT NULL,
	"awarded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auction_award" ADD CONSTRAINT "auction_award_auction_id_auction_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_award" ADD CONSTRAINT "auction_award_character_id_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."character"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_award" ADD CONSTRAINT "auction_award_awarded_by_user_id_fk" FOREIGN KEY ("awarded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auction_award_auction_idx" ON "auction_award" USING btree ("auction_id","created_at");