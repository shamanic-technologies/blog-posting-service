import { db, sql } from "../../src/db/index.js";
import { blogPosts } from "../../src/db/schema.js";

export async function cleanTestData() {
  await db.delete(blogPosts);
}

export async function insertTestPost(data: {
  runId?: string;
  title: string;
  slug: string;
  bodyMarkdown?: string;
  bodyHtml?: string;
  authorName?: string;
  targetSite?: string;
  status?: string;
  publishedAt?: Date;
  previewToken?: string;
  tags?: string[];
  orgId?: string;
  userId?: string;
  campaignId?: string;
  summary?: string;
  metaDescription?: string;
}) {
  const [post] = await db
    .insert(blogPosts)
    .values({
      orgId: data.orgId || "test-org-id",
      userId: data.userId || "test-user-id",
      runId: data.runId || "test-run",
      title: data.title,
      slug: data.slug,
      bodyMarkdown: data.bodyMarkdown || "# Test",
      bodyHtml: data.bodyHtml || "<h1>Test</h1>",
      authorName: data.authorName || "Test Author",
      targetSite: data.targetSite || "test.com",
      status: data.status || "draft",
      publishedAt: data.publishedAt,
      previewToken: data.previewToken || "preview-token-123",
      tags: data.tags,
      campaignId: data.campaignId,
      summary: data.summary,
      metaDescription: data.metaDescription,
    })
    .returning();
  return post;
}

export async function closeDb() {
  await sql.end();
}
