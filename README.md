# blog-posting-service

Stores and serves blog posts. Called by the Claude Agent Service (via DAG) to create drafts, and by kevinlourd.com (and future sites) to display published posts.

## Setup

```bash
npm install
```

## Environment Variables

- `BLOG_POSTING_SERVICE_DATABASE_URL` — Neon Postgres connection string
- `BLOG_POSTING_SERVICE_API_KEY` — API key for internal endpoints
- `PORT` — Server port (default: 3000)

## Development

```bash
npm run dev
```

## Database

```bash
npm run db:generate  # Generate migrations
npm run db:migrate   # Run migrations
npm run db:push      # Push schema directly
npm run db:studio    # Open Drizzle Studio
```

## Tests

```bash
npm test                # Run all tests
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only
```

## Build

```bash
npm run build  # Compiles TypeScript + generates openapi.json
npm start      # Run production build
```
