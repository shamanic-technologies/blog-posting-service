import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.BLOG_POSTING_SERVICE_DATABASE_URL;

if (!connectionString) {
  throw new Error("BLOG_POSTING_SERVICE_DATABASE_URL is not set");
}

export const sql = postgres(connectionString);
export const db = drizzle(sql, { schema });
