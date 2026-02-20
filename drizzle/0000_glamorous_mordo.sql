CREATE TABLE IF NOT EXISTS "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" text NOT NULL,
	"org_id" text,
	"user_id" text,
	"campaign_id" text,
	"run_id" text,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"summary" text,
	"body_markdown" text NOT NULL,
	"body_html" text NOT NULL,
	"cover_image_url" text,
	"author_name" text NOT NULL,
	"author_avatar_url" text,
	"target_site" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"preview_token" text,
	"meta_description" text,
	"og_image_url" text,
	"tags" text[],
	"source_type" text,
	"source_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_posts_app_id" ON "blog_posts" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_posts_slug_site" ON "blog_posts" USING btree ("slug","target_site");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_posts_target_site_status" ON "blog_posts" USING btree ("target_site","status");