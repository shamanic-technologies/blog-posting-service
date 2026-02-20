import { Router } from "express";
import { eq, and, desc, sql as dsql } from "drizzle-orm";
import crypto from "crypto";
import { db } from "../db/index.js";
import { blogPosts } from "../db/schema.js";
import { requireApiKey } from "../middleware/auth.js";
import {
  CreatePostBodySchema,
  PublishPostBodySchema,
  UpdatePostBodySchema,
  DeletePostBodySchema,
} from "../schemas.js";
import type { BlogPost } from "../db/schema.js";

const router = Router();

// --- Helpers ---

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripInternalFields(post: BlogPost) {
  const {
    appId: _appId,
    orgId: _orgId,
    userId: _userId,
    campaignId: _campaignId,
    runId: _runId,
    previewToken: _previewToken,
    sourceType: _sourceType,
    sourceMessageId: _sourceMessageId,
    ...publicPost
  } = post;
  return publicPost;
}

// --- Internal endpoints (x-api-key required) ---

// POST /posts — Create a blog post
router.post("/posts", requireApiKey, async (req, res) => {
  try {
    const parsed = CreatePostBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;

    // Auto-generate slug from title if not provided
    let slug = data.slug || slugify(data.title);

    // Dedup slug: check if slug already exists for this targetSite
    const existing = await db
      .select({ slug: blogPosts.slug })
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.targetSite, data.targetSite),
          dsql`${blogPosts.slug} LIKE ${slug + "%"}`
        )
      );

    if (existing.length > 0) {
      const existingSlugs = new Set(existing.map((r) => r.slug));
      if (existingSlugs.has(slug)) {
        let suffix = 2;
        while (existingSlugs.has(`${slug}-${suffix}`)) {
          suffix++;
        }
        slug = `${slug}-${suffix}`;
      }
    }

    const previewToken = crypto.randomUUID();

    const [post] = await db
      .insert(blogPosts)
      .values({
        appId: data.appId,
        runId: data.runId,
        orgId: data.orgId,
        userId: data.userId,
        campaignId: data.campaignId,
        title: data.title,
        slug,
        summary: data.summary,
        bodyMarkdown: data.bodyMarkdown,
        bodyHtml: data.bodyHtml,
        coverImageUrl: data.coverImageUrl,
        authorName: data.authorName,
        authorAvatarUrl: data.authorAvatarUrl,
        targetSite: data.targetSite,
        status: data.status || "draft",
        publishedAt: data.status === "published" ? new Date() : null,
        previewToken,
        tags: data.tags,
        metaDescription: data.metaDescription,
        ogImageUrl: data.ogImageUrl,
        sourceType: data.sourceType,
        sourceMessageId: data.sourceMessageId,
      })
      .returning();

    res.status(201).json({ post });
  } catch (err) {
    console.error("[Blog Posting Service] Error creating post:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /posts/:id/publish — Change draft to published
router.post("/posts/:id/publish", requireApiKey, async (req, res) => {
  try {
    const parsed = PublishPostBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const { id } = req.params;

    const existing = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    if (existing[0].status === "published") {
      res.status(400).json({ error: "Post is already published" });
      return;
    }

    const [post] = await db
      .update(blogPosts)
      .set({
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id))
      .returning();

    res.json({ post });
  } catch (err) {
    console.error("[Blog Posting Service] Error publishing post:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /posts/:id — Update a post
router.patch("/posts/:id", requireApiKey, async (req, res) => {
  try {
    const parsed = UpdatePostBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const { id } = req.params;
    const { appId: _appId, runId: _runId, ...fieldsToUpdate } = parsed.data;

    const existing = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    const [post] = await db
      .update(blogPosts)
      .set({
        ...fieldsToUpdate,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id))
      .returning();

    res.json({ post });
  } catch (err) {
    console.error("[Blog Posting Service] Error updating post:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /posts/:id — Archive a post (soft delete)
router.delete("/posts/:id", requireApiKey, async (req, res) => {
  try {
    const parsed = DeletePostBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const { id } = req.params;

    const existing = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    await db
      .update(blogPosts)
      .set({
        status: "archived",
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id));

    res.json({ success: true });
  } catch (err) {
    console.error("[Blog Posting Service] Error archiving post:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /posts — List posts (internal, filtered)
router.get("/posts", requireApiKey, async (req, res) => {
  try {
    const { appId, orgId, status, targetSite, campaignId, limit, offset } = req.query;

    if (!appId) {
      res.status(400).json({ error: "appId query parameter is required" });
      return;
    }

    const conditions = [eq(blogPosts.appId, appId as string)];
    if (orgId) conditions.push(eq(blogPosts.orgId, orgId as string));
    if (status) conditions.push(eq(blogPosts.status, status as string));
    if (targetSite) conditions.push(eq(blogPosts.targetSite, targetSite as string));
    if (campaignId) conditions.push(eq(blogPosts.campaignId, campaignId as string));

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

    const [posts, countResult] = await Promise.all([
      db
        .select()
        .from(blogPosts)
        .where(whereClause)
        .orderBy(desc(blogPosts.createdAt))
        .limit(Number(limit) || 20)
        .offset(Number(offset) || 0),
      db
        .select({ count: dsql<number>`count(*)::int` })
        .from(blogPosts)
        .where(whereClause),
    ]);

    res.json({ posts, total: countResult[0].count });
  } catch (err) {
    console.error("[Blog Posting Service] Error listing posts:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Public endpoints (no auth) ---

// GET /posts/public — Published posts for a site
router.get("/posts/public", async (req, res) => {
  try {
    const { targetSite, limit, offset } = req.query;

    if (!targetSite) {
      res.status(400).json({ error: "targetSite query parameter is required" });
      return;
    }

    const posts = await db
      .select()
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.targetSite, targetSite as string),
          eq(blogPosts.status, "published")
        )
      )
      .orderBy(desc(blogPosts.publishedAt))
      .limit(Number(limit) || 20)
      .offset(Number(offset) || 0);

    res.json({ posts: posts.map(stripInternalFields) });
  } catch (err) {
    console.error("[Blog Posting Service] Error listing public posts:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /posts/public/:slug — Single published post by slug
router.get("/posts/public/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const { targetSite } = req.query;

    if (!targetSite) {
      res.status(400).json({ error: "targetSite query parameter is required" });
      return;
    }

    const result = await db
      .select()
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.slug, slug),
          eq(blogPosts.targetSite, targetSite as string),
          eq(blogPosts.status, "published")
        )
      )
      .limit(1);

    if (result.length === 0) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    res.json({ post: stripInternalFields(result[0]) });
  } catch (err) {
    console.error("[Blog Posting Service] Error getting public post:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /posts/preview/:id — Draft preview with token
router.get("/posts/preview/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    if (!token) {
      res.status(401).json({ error: "Preview token is required" });
      return;
    }

    const result = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    if (result.length === 0) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    if (result[0].previewToken !== token) {
      res.status(401).json({ error: "Invalid preview token" });
      return;
    }

    res.json({ post: stripInternalFields(result[0]) });
  } catch (err) {
    console.error("[Blog Posting Service] Error previewing post:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
