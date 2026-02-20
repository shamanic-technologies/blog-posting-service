import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Ownership
    appId: text("app_id").notNull(),
    orgId: text("org_id"),
    userId: text("user_id"),
    campaignId: text("campaign_id"),
    runId: text("run_id"),

    // Content
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary"),
    bodyMarkdown: text("body_markdown").notNull(),
    bodyHtml: text("body_html").notNull(),
    coverImageUrl: text("cover_image_url"),

    // Author
    authorName: text("author_name").notNull(),
    authorAvatarUrl: text("author_avatar_url"),

    // Targeting
    targetSite: text("target_site").notNull(),

    // Status
    status: text("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    previewToken: text("preview_token"),

    // SEO
    metaDescription: text("meta_description"),
    ogImageUrl: text("og_image_url"),
    tags: text("tags").array(),

    // Source tracking
    sourceType: text("source_type"),
    sourceMessageId: text("source_message_id"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_posts_app_id").on(table.appId),
    index("idx_posts_slug_site").on(table.slug, table.targetSite),
    index("idx_posts_target_site_status").on(table.targetSite, table.status),
  ]
);

export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
