import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createTestApp, getAuthHeaders } from "../helpers/test-app.js";
import { cleanTestData, insertTestPost, closeDb } from "../helpers/test-db.js";

describe("Posts CRUD", () => {
  const app = createTestApp();
  const authHeaders = getAuthHeaders();

  beforeEach(async () => {
    await cleanTestData();
  });

  afterAll(async () => {
    await cleanTestData();
    await closeDb();
  });

  // --- POST /posts ---

  describe("POST /posts", () => {
    it("creates a draft post", async () => {
      const res = await request(app)
        .post("/posts")
        .set(authHeaders)
        .send({
          appId: "test-app",
          runId: "test-run",
          title: "My First Post",
          bodyMarkdown: "# Hello World",
          bodyHtml: "<h1>Hello World</h1>",
          authorName: "Kevin",
          targetSite: "kevinlourd.com",
        });

      expect(res.status).toBe(201);
      expect(res.body.post.title).toBe("My First Post");
      expect(res.body.post.slug).toBe("my-first-post");
      expect(res.body.post.status).toBe("draft");
      expect(res.body.post.previewToken).toBeDefined();
      expect(res.body.post.publishedAt).toBeNull();
    });

    it("creates a published post with publishedAt set", async () => {
      const res = await request(app)
        .post("/posts")
        .set(authHeaders)
        .send({
          appId: "test-app",
          runId: "test-run",
          title: "Published Post",
          bodyMarkdown: "# Published",
          bodyHtml: "<h1>Published</h1>",
          authorName: "Kevin",
          targetSite: "kevinlourd.com",
          status: "published",
        });

      expect(res.status).toBe(201);
      expect(res.body.post.status).toBe("published");
      expect(res.body.post.publishedAt).not.toBeNull();
    });

    it("uses custom slug when provided", async () => {
      const res = await request(app)
        .post("/posts")
        .set(authHeaders)
        .send({
          appId: "test-app",
          runId: "test-run",
          title: "My Post",
          slug: "custom-slug",
          bodyMarkdown: "# Test",
          bodyHtml: "<h1>Test</h1>",
          authorName: "Kevin",
          targetSite: "kevinlourd.com",
        });

      expect(res.status).toBe(201);
      expect(res.body.post.slug).toBe("custom-slug");
    });

    it("deduplicates slugs with suffix", async () => {
      await insertTestPost({
        title: "Test",
        slug: "my-post",
        targetSite: "kevinlourd.com",
      });

      const res = await request(app)
        .post("/posts")
        .set(authHeaders)
        .send({
          appId: "test-app",
          runId: "test-run",
          title: "My Post",
          bodyMarkdown: "# Test",
          bodyHtml: "<h1>Test</h1>",
          authorName: "Kevin",
          targetSite: "kevinlourd.com",
        });

      expect(res.status).toBe(201);
      expect(res.body.post.slug).toBe("my-post-2");
    });

    it("rejects without API key", async () => {
      const res = await request(app)
        .post("/posts")
        .send({
          appId: "test-app",
          runId: "test-run",
          title: "Test",
          bodyMarkdown: "# Test",
          bodyHtml: "<h1>Test</h1>",
          authorName: "Kevin",
          targetSite: "test.com",
        });

      expect(res.status).toBe(401);
    });

    it("rejects missing required fields", async () => {
      const res = await request(app)
        .post("/posts")
        .set(authHeaders)
        .send({ appId: "test-app" });

      expect(res.status).toBe(400);
    });
  });

  // --- POST /posts/:id/publish ---

  describe("POST /posts/:id/publish", () => {
    it("publishes a draft post", async () => {
      const post = await insertTestPost({
        title: "Draft Post",
        slug: "draft-post",
        status: "draft",
      });

      const res = await request(app)
        .post(`/posts/${post.id}/publish`)
        .set(authHeaders)
        .send({ appId: "test-app", runId: "test-run" });

      expect(res.status).toBe(200);
      expect(res.body.post.status).toBe("published");
      expect(res.body.post.publishedAt).not.toBeNull();
    });

    it("returns 400 if already published", async () => {
      const post = await insertTestPost({
        title: "Published Post",
        slug: "published-post",
        status: "published",
        publishedAt: new Date(),
      });

      const res = await request(app)
        .post(`/posts/${post.id}/publish`)
        .set(authHeaders)
        .send({ appId: "test-app", runId: "test-run" });

      expect(res.status).toBe(400);
    });

    it("returns 404 for nonexistent post", async () => {
      const res = await request(app)
        .post("/posts/00000000-0000-0000-0000-000000000000/publish")
        .set(authHeaders)
        .send({ appId: "test-app", runId: "test-run" });

      expect(res.status).toBe(404);
    });
  });

  // --- PATCH /posts/:id ---

  describe("PATCH /posts/:id", () => {
    it("updates post fields", async () => {
      const post = await insertTestPost({
        title: "Original Title",
        slug: "original-title",
      });

      const res = await request(app)
        .patch(`/posts/${post.id}`)
        .set(authHeaders)
        .send({
          appId: "test-app",
          runId: "test-run",
          title: "Updated Title",
          summary: "New summary",
        });

      expect(res.status).toBe(200);
      expect(res.body.post.title).toBe("Updated Title");
      expect(res.body.post.summary).toBe("New summary");
    });

    it("returns 404 for nonexistent post", async () => {
      const res = await request(app)
        .patch("/posts/00000000-0000-0000-0000-000000000000")
        .set(authHeaders)
        .send({ appId: "test-app", runId: "test-run", title: "Updated" });

      expect(res.status).toBe(404);
    });

    it("rejects without API key", async () => {
      const res = await request(app)
        .patch("/posts/00000000-0000-0000-0000-000000000000")
        .send({ appId: "test-app", runId: "test-run", title: "Updated" });

      expect(res.status).toBe(401);
    });
  });

  // --- DELETE /posts/:id ---

  describe("DELETE /posts/:id", () => {
    it("archives a post (soft delete)", async () => {
      const post = await insertTestPost({
        title: "To Delete",
        slug: "to-delete",
      });

      const res = await request(app)
        .delete(`/posts/${post.id}`)
        .set(authHeaders)
        .send({ appId: "test-app", runId: "test-run" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it's archived, not actually deleted
      const listRes = await request(app)
        .get("/posts")
        .set(authHeaders)
        .query({ appId: "test-app", status: "archived" });

      expect(listRes.body.posts).toHaveLength(1);
      expect(listRes.body.posts[0].id).toBe(post.id);
    });

    it("returns 404 for nonexistent post", async () => {
      const res = await request(app)
        .delete("/posts/00000000-0000-0000-0000-000000000000")
        .set(authHeaders)
        .send({ appId: "test-app", runId: "test-run" });

      expect(res.status).toBe(404);
    });

    it("rejects without API key", async () => {
      const res = await request(app)
        .delete("/posts/00000000-0000-0000-0000-000000000000")
        .send({ appId: "test-app", runId: "test-run" });

      expect(res.status).toBe(401);
    });
  });

  // --- GET /posts ---

  describe("GET /posts", () => {
    it("lists posts filtered by appId", async () => {
      await insertTestPost({ title: "Post 1", slug: "post-1", appId: "app-1" });
      await insertTestPost({ title: "Post 2", slug: "post-2", appId: "app-1" });
      await insertTestPost({ title: "Post 3", slug: "post-3", appId: "app-2" });

      const res = await request(app)
        .get("/posts")
        .set(authHeaders)
        .query({ appId: "app-1" });

      expect(res.status).toBe(200);
      expect(res.body.posts).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it("filters by status", async () => {
      await insertTestPost({ title: "Draft", slug: "draft", status: "draft" });
      await insertTestPost({
        title: "Published",
        slug: "published",
        status: "published",
        publishedAt: new Date(),
      });

      const res = await request(app)
        .get("/posts")
        .set(authHeaders)
        .query({ appId: "test-app", status: "published" });

      expect(res.status).toBe(200);
      expect(res.body.posts).toHaveLength(1);
      expect(res.body.posts[0].title).toBe("Published");
    });

    it("returns 400 without appId", async () => {
      const res = await request(app)
        .get("/posts")
        .set(authHeaders);

      expect(res.status).toBe(400);
    });

    it("rejects without API key", async () => {
      const res = await request(app)
        .get("/posts")
        .query({ appId: "test-app" });

      expect(res.status).toBe(401);
    });
  });

  // --- GET /posts/public ---

  describe("GET /posts/public", () => {
    it("returns only published posts for a site", async () => {
      await insertTestPost({
        title: "Draft",
        slug: "draft",
        status: "draft",
        targetSite: "kevinlourd.com",
      });
      await insertTestPost({
        title: "Published",
        slug: "published",
        status: "published",
        publishedAt: new Date(),
        targetSite: "kevinlourd.com",
      });

      const res = await request(app)
        .get("/posts/public")
        .query({ targetSite: "kevinlourd.com" });

      expect(res.status).toBe(200);
      expect(res.body.posts).toHaveLength(1);
      expect(res.body.posts[0].title).toBe("Published");
    });

    it("strips internal fields from response", async () => {
      await insertTestPost({
        title: "Published",
        slug: "published",
        status: "published",
        publishedAt: new Date(),
        targetSite: "kevinlourd.com",
        orgId: "secret-org",
      });

      const res = await request(app)
        .get("/posts/public")
        .query({ targetSite: "kevinlourd.com" });

      expect(res.status).toBe(200);
      const post = res.body.posts[0];
      expect(post.orgId).toBeUndefined();
      expect(post.appId).toBeUndefined();
      expect(post.runId).toBeUndefined();
      expect(post.previewToken).toBeUndefined();
      expect(post.sourceType).toBeUndefined();
      expect(post.sourceMessageId).toBeUndefined();
      expect(post.campaignId).toBeUndefined();
      expect(post.userId).toBeUndefined();
    });

    it("returns 400 without targetSite", async () => {
      const res = await request(app).get("/posts/public");
      expect(res.status).toBe(400);
    });
  });

  // --- GET /posts/public/:slug ---

  describe("GET /posts/public/:slug", () => {
    it("returns a single published post by slug", async () => {
      await insertTestPost({
        title: "My Post",
        slug: "my-post",
        status: "published",
        publishedAt: new Date(),
        targetSite: "kevinlourd.com",
      });

      const res = await request(app)
        .get("/posts/public/my-post")
        .query({ targetSite: "kevinlourd.com" });

      expect(res.status).toBe(200);
      expect(res.body.post.title).toBe("My Post");
      expect(res.body.post.slug).toBe("my-post");
    });

    it("returns 404 for draft posts", async () => {
      await insertTestPost({
        title: "Draft",
        slug: "draft-post",
        status: "draft",
        targetSite: "kevinlourd.com",
      });

      const res = await request(app)
        .get("/posts/public/draft-post")
        .query({ targetSite: "kevinlourd.com" });

      expect(res.status).toBe(404);
    });

    it("returns 400 without targetSite", async () => {
      const res = await request(app).get("/posts/public/my-post");
      expect(res.status).toBe(400);
    });
  });

  // --- GET /posts/preview/:id ---

  describe("GET /posts/preview/:id", () => {
    it("returns post with valid preview token", async () => {
      const post = await insertTestPost({
        title: "Preview Post",
        slug: "preview-post",
        status: "draft",
        previewToken: "valid-token",
      });

      const res = await request(app)
        .get(`/posts/preview/${post.id}`)
        .query({ token: "valid-token" });

      expect(res.status).toBe(200);
      expect(res.body.post.title).toBe("Preview Post");
    });

    it("returns 401 with invalid preview token", async () => {
      const post = await insertTestPost({
        title: "Preview Post",
        slug: "preview-post-2",
        status: "draft",
        previewToken: "valid-token",
      });

      const res = await request(app)
        .get(`/posts/preview/${post.id}`)
        .query({ token: "invalid-token" });

      expect(res.status).toBe(401);
    });

    it("returns 401 without token", async () => {
      const post = await insertTestPost({
        title: "Preview Post",
        slug: "preview-post-3",
        status: "draft",
      });

      const res = await request(app)
        .get(`/posts/preview/${post.id}`);

      expect(res.status).toBe(401);
    });

    it("returns 404 for nonexistent post", async () => {
      const res = await request(app)
        .get("/posts/preview/00000000-0000-0000-0000-000000000000")
        .query({ token: "any-token" });

      expect(res.status).toBe(404);
    });

    it("strips internal fields from preview response", async () => {
      const post = await insertTestPost({
        title: "Preview Post",
        slug: "preview-strip",
        status: "draft",
        previewToken: "valid-token",
        orgId: "secret-org",
      });

      const res = await request(app)
        .get(`/posts/preview/${post.id}`)
        .query({ token: "valid-token" });

      expect(res.status).toBe(200);
      expect(res.body.post.orgId).toBeUndefined();
      expect(res.body.post.appId).toBeUndefined();
      expect(res.body.post.previewToken).toBeUndefined();
    });
  });
});
