# SiteDrop

HTML 파일을 업로드하거나 AI로 생성하면 즉시 고유 링크로 접속 가능한 사이트 호스팅 플랫폼.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `OPENAI_API_KEY`, `OPENAI_API_BASE` — for AI site generation

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + TanStack Query + shadcn/ui (at `/`)
- API: Express 5 (at `/api`)
- Site serving: Express wildcard `/s/:name` route (at `/s`)
- DB: PostgreSQL + Drizzle ORM
- AI: OpenAI via Replit AI Integrations (chat completions, gpt-5.1)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/db/src/schema/sites.ts` — sites table schema
- `artifacts/site-builder/src/` — React frontend
- `artifacts/api-server/src/routes/sites.ts` — site CRUD + AI generation routes
- `artifacts/api-server/src/lib/openai.ts` — OpenAI client + HTML generation

## Architecture decisions

- HTML content stored directly in PostgreSQL (text column) — no object storage needed for MVP
- User sites served at `/s/<sitename>` via the same Express API server (not a separate service)
- The API server's `artifact.toml` declares both `/api` and `/s` paths so the proxy routes both correctly
- Site names must be lowercase letters, numbers, and hyphens only (max 50 chars)
- AI generation uses `gpt-5.1` model to produce complete, self-contained HTML pages

## Product

- **Dashboard**: View all published sites, copy live links, see platform stats
- **Create (Upload)**: Upload or paste HTML → set a unique site name → live instantly at `/s/<name>`
- **Create (AI)**: Describe your site in plain text → AI generates full HTML → deployed instantly
- **Site Detail**: Preview site in iframe, copy link, view source, delete

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always re-run codegen after changing `lib/api-spec/openapi.yaml`
- The `/s` path must be in the API server's `artifact.toml` paths array for the proxy to forward site requests
- `validateName()` is called before DB uniqueness checks — returns null if valid, error string if invalid
- `htmlContent` is omitted from list/stats responses (too large) but included in `GET /sites/:name`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
