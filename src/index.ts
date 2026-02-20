import express from "express";
import cors from "cors";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import healthRoutes from "./routes/health.js";
import postsRoutes from "./routes/posts.js";
import { db } from "./db/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/openapi.json", async (_req, res) => {
  try {
    const specPath = path.resolve(__dirname, "../openapi.json");
    const spec = await readFile(specPath, "utf-8");
    res.json(JSON.parse(spec));
  } catch {
    res.status(404).json({ error: "OpenAPI spec not found. Run: npm run generate:openapi" });
  }
});

app.use(healthRoutes);
app.use(postsRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Only start server if not in test environment
if (process.env.NODE_ENV !== "test") {
  migrate(db, { migrationsFolder: "./drizzle" })
    .then(() => {
      console.log("[Blog Posting Service] Migrations complete");
      app.listen(Number(PORT), "::", () => {
        console.log(`[Blog Posting Service] Service running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error("[Blog Posting Service] Migration failed:", err);
      process.exit(1);
    });
}

export default app;
