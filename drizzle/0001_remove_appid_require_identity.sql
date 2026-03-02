-- Drop app_id index and column
DROP INDEX IF EXISTS "idx_posts_app_id";--> statement-breakpoint
ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "app_id";--> statement-breakpoint

-- Make org_id and user_id required (backfill NULLs first)
UPDATE "blog_posts" SET "org_id" = 'unknown' WHERE "org_id" IS NULL;--> statement-breakpoint
UPDATE "blog_posts" SET "user_id" = 'unknown' WHERE "user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "blog_posts" ALTER COLUMN "org_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "blog_posts" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint

-- Add org_id index (replaces app_id index)
CREATE INDEX IF NOT EXISTS "idx_posts_org_id" ON "blog_posts" USING btree ("org_id");
