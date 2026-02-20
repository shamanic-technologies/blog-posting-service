import { z } from "zod";
import {
  OpenAPIRegistry,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// --- Shared schemas ---

export const ErrorResponseSchema = z
  .object({
    error: z.string(),
  })
  .openapi("ErrorResponse");

export const ValidationErrorResponseSchema = z
  .object({
    error: z.string(),
    details: z
      .object({
        formErrors: z.array(z.string()),
        fieldErrors: z.record(z.string(), z.array(z.string())),
      })
      .optional(),
  })
  .openapi("ValidationErrorResponse");

export const HealthResponseSchema = z
  .object({
    status: z.string(),
    service: z.string(),
  })
  .openapi("HealthResponse");

// --- Blog Post schemas ---

export const BlogPostSchema = z
  .object({
    id: z.string().uuid(),
    appId: z.string(),
    orgId: z.string().nullable(),
    userId: z.string().nullable(),
    campaignId: z.string().nullable(),
    runId: z.string().nullable(),
    title: z.string(),
    slug: z.string(),
    summary: z.string().nullable(),
    bodyMarkdown: z.string(),
    bodyHtml: z.string(),
    coverImageUrl: z.string().nullable(),
    authorName: z.string(),
    authorAvatarUrl: z.string().nullable(),
    targetSite: z.string(),
    status: z.string(),
    publishedAt: z.string().datetime().nullable(),
    previewToken: z.string().nullable(),
    metaDescription: z.string().nullable(),
    ogImageUrl: z.string().nullable(),
    tags: z.array(z.string()).nullable(),
    sourceType: z.string().nullable(),
    sourceMessageId: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("BlogPost");

export const PublicBlogPostSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    slug: z.string(),
    summary: z.string().nullable(),
    bodyMarkdown: z.string(),
    bodyHtml: z.string(),
    coverImageUrl: z.string().nullable(),
    authorName: z.string(),
    authorAvatarUrl: z.string().nullable(),
    targetSite: z.string(),
    status: z.string(),
    publishedAt: z.string().datetime().nullable(),
    metaDescription: z.string().nullable(),
    ogImageUrl: z.string().nullable(),
    tags: z.array(z.string()).nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("PublicBlogPost");

// --- Request body schemas ---

export const CreatePostBodySchema = z
  .object({
    appId: z.string(),
    runId: z.string(),
    orgId: z.string().optional(),
    userId: z.string().optional(),
    campaignId: z.string().optional(),
    title: z.string(),
    slug: z.string().optional(),
    summary: z.string().optional(),
    bodyMarkdown: z.string(),
    bodyHtml: z.string(),
    coverImageUrl: z.string().optional(),
    authorName: z.string(),
    authorAvatarUrl: z.string().optional(),
    targetSite: z.string(),
    status: z.enum(["draft", "published"]).optional(),
    tags: z.array(z.string()).optional(),
    metaDescription: z.string().optional(),
    ogImageUrl: z.string().optional(),
    sourceType: z.string().optional(),
    sourceMessageId: z.string().optional(),
  })
  .openapi("CreatePostBody");

export const PublishPostBodySchema = z
  .object({
    appId: z.string(),
    runId: z.string(),
  })
  .openapi("PublishPostBody");

export const UpdatePostBodySchema = z
  .object({
    appId: z.string(),
    runId: z.string(),
    title: z.string().optional(),
    slug: z.string().optional(),
    summary: z.string().optional(),
    bodyMarkdown: z.string().optional(),
    bodyHtml: z.string().optional(),
    coverImageUrl: z.string().optional(),
    authorName: z.string().optional(),
    authorAvatarUrl: z.string().optional(),
    targetSite: z.string().optional(),
    status: z.enum(["draft", "published", "archived"]).optional(),
    tags: z.array(z.string()).optional(),
    metaDescription: z.string().optional(),
    ogImageUrl: z.string().optional(),
    sourceType: z.string().optional(),
    sourceMessageId: z.string().optional(),
  })
  .openapi("UpdatePostBody");

export const DeletePostBodySchema = z
  .object({
    appId: z.string(),
    runId: z.string(),
  })
  .openapi("DeletePostBody");

// --- Response schemas ---

export const PostResponseSchema = z
  .object({
    post: BlogPostSchema,
  })
  .openapi("PostResponse");

export const PublicPostResponseSchema = z
  .object({
    post: PublicBlogPostSchema,
  })
  .openapi("PublicPostResponse");

export const PostListResponseSchema = z
  .object({
    posts: z.array(BlogPostSchema),
    total: z.number(),
  })
  .openapi("PostListResponse");

export const PublicPostListResponseSchema = z
  .object({
    posts: z.array(PublicBlogPostSchema),
  })
  .openapi("PublicPostListResponse");

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
  })
  .openapi("SuccessResponse");

// --- Path parameters ---

const PostIdParam = registry.registerParameter(
  "PostId",
  z.string().uuid().openapi({
    param: { name: "id", in: "path" },
    description: "Blog post UUID",
  })
);

const SlugParam = registry.registerParameter(
  "Slug",
  z.string().openapi({
    param: { name: "slug", in: "path" },
    description: "Blog post slug",
  })
);

// --- Register paths ---

registry.registerPath({
  method: "get",
  path: "/health",
  operationId: "getHealth",
  summary: "Health check",
  responses: {
    200: {
      description: "Service is healthy",
      content: { "application/json": { schema: HealthResponseSchema } },
    },
  },
});

// --- Internal endpoints (x-api-key required) ---

registry.registerPath({
  method: "post",
  path: "/posts",
  operationId: "createPost",
  summary: "Create a blog post (default status: draft)",
  security: [{ ApiKeyAuth: [] }],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: CreatePostBodySchema } },
    },
  },
  responses: {
    201: {
      description: "Created blog post",
      content: { "application/json": { schema: PostResponseSchema } },
    },
    400: {
      description: "Invalid request body",
      content: { "application/json": { schema: ValidationErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/posts/{id}/publish",
  operationId: "publishPost",
  summary: "Change draft to published",
  security: [{ ApiKeyAuth: [] }],
  request: {
    params: z.object({ id: PostIdParam }),
    body: {
      required: true,
      content: { "application/json": { schema: PublishPostBodySchema } },
    },
  },
  responses: {
    200: {
      description: "Published blog post",
      content: { "application/json": { schema: PostResponseSchema } },
    },
    400: {
      description: "Post already published",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "Post not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/posts/{id}",
  operationId: "updatePost",
  summary: "Update a post",
  security: [{ ApiKeyAuth: [] }],
  request: {
    params: z.object({ id: PostIdParam }),
    body: {
      required: true,
      content: { "application/json": { schema: UpdatePostBodySchema } },
    },
  },
  responses: {
    200: {
      description: "Updated blog post",
      content: { "application/json": { schema: PostResponseSchema } },
    },
    400: {
      description: "Invalid request body",
      content: { "application/json": { schema: ValidationErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "Post not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/posts/{id}",
  operationId: "deletePost",
  summary: "Archive a post (soft delete)",
  security: [{ ApiKeyAuth: [] }],
  request: {
    params: z.object({ id: PostIdParam }),
    body: {
      required: true,
      content: { "application/json": { schema: DeletePostBodySchema } },
    },
  },
  responses: {
    200: {
      description: "Post archived",
      content: { "application/json": { schema: SuccessResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "Post not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/posts",
  operationId: "listPosts",
  summary: "List posts (internal, filtered)",
  security: [{ ApiKeyAuth: [] }],
  request: {
    query: z.object({
      appId: z.string(),
      orgId: z.string().optional(),
      status: z.string().optional(),
      targetSite: z.string().optional(),
      campaignId: z.string().optional(),
      limit: z.coerce.number().optional(),
      offset: z.coerce.number().optional(),
    }),
  },
  responses: {
    200: {
      description: "List of posts",
      content: { "application/json": { schema: PostListResponseSchema } },
    },
    400: {
      description: "Missing required query parameter",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// --- Public endpoints (no auth) ---

registry.registerPath({
  method: "get",
  path: "/posts/public",
  operationId: "listPublicPosts",
  summary: "Published posts for a site",
  request: {
    query: z.object({
      targetSite: z.string(),
      limit: z.coerce.number().optional(),
      offset: z.coerce.number().optional(),
    }),
  },
  responses: {
    200: {
      description: "List of published posts",
      content: { "application/json": { schema: PublicPostListResponseSchema } },
    },
    400: {
      description: "Missing required query parameter",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/posts/public/{slug}",
  operationId: "getPublicPost",
  summary: "Single published post by slug",
  request: {
    params: z.object({ slug: SlugParam }),
    query: z.object({
      targetSite: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Published blog post",
      content: { "application/json": { schema: PublicPostResponseSchema } },
    },
    400: {
      description: "Missing required query parameter",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "Post not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/posts/preview/{id}",
  operationId: "previewPost",
  summary: "Draft preview with token",
  request: {
    params: z.object({ id: PostIdParam }),
    query: z.object({
      token: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Blog post preview",
      content: { "application/json": { schema: PublicPostResponseSchema } },
    },
    401: {
      description: "Invalid preview token",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    404: {
      description: "Post not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerComponent("securitySchemes", "ApiKeyAuth", {
  type: "apiKey",
  in: "header",
  name: "X-API-Key",
});
