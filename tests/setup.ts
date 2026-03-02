import { beforeAll, afterAll } from "vitest";
import { migrate } from "drizzle-orm/postgres-js/migrator";

process.env.BLOG_POSTING_SERVICE_DATABASE_URL =
  process.env.BLOG_POSTING_SERVICE_DATABASE_URL || "postgresql://test:test@localhost/test";
process.env.BLOG_POSTING_SERVICE_API_KEY = "test-api-key";
process.env.NODE_ENV = "test";

beforeAll(async () => {
  console.log("Test suite starting...");
  const { db, sql } = await import("../src/db/index.js");
  // Reset migration state so all migrations run fresh
  await sql`DROP TABLE IF EXISTS blog_posts CASCADE`;
  await sql`DROP TABLE IF EXISTS drizzle.__drizzle_migrations CASCADE`;
  await migrate(db, { migrationsFolder: "./drizzle" });
});
afterAll(() => console.log("Test suite complete."));
