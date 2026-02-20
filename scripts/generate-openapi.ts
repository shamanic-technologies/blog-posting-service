import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "../src/schemas.js";
import * as fs from "fs";

const generator = new OpenApiGeneratorV3(registry.definitions);

const document = generator.generateDocument({
  openapi: "3.0.0",
  info: {
    title: "Blog Posting Service",
    description: "Stores and serves blog posts for websites",
    version: "1.0.0",
  },
  servers: [
    { url: process.env.BLOG_POSTING_SERVICE_URL || "http://localhost:3000" },
  ],
});

fs.writeFileSync("openapi.json", JSON.stringify(document, null, 2));
console.log("[Blog Posting Service] OpenAPI spec generated at openapi.json");
