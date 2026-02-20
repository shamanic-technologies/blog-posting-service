import { beforeAll, afterAll } from "vitest";

process.env.BLOG_POSTING_SERVICE_DATABASE_URL =
  process.env.BLOG_POSTING_SERVICE_DATABASE_URL || "postgresql://test:test@localhost/test";
process.env.BLOG_POSTING_SERVICE_API_KEY = "test-api-key";
process.env.NODE_ENV = "test";

beforeAll(() => console.log("Test suite starting..."));
afterAll(() => console.log("Test suite complete."));
