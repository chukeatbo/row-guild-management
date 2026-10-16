ALTER TABLE "packages" ADD COLUMN "is_trial" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;