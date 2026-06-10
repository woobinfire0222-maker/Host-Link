# Host Link (호스트 링크)

사이트 호스팅과 디스코드 봇 호스팅을 한 곳에서 제공하는 종합 호스팅 플랫폼.

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
- Bot hosting: Python 3 child_process + SSE log streaming

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/db/src/schema/sites.ts` — sites table schema
- `lib/db/src/schema/bots.ts` — bots table schema
- `artifacts/site-builder/src/` — React frontend
- `artifacts/site-builder/src/pages/bots.tsx` — bot list page
- `artifacts/site-builder/src/pages/bot-detail.tsx` — bot detail: editor + terminal
- `artifacts/api-server/src/routes/sites.ts` — site CRUD + AI generation routes
- `artifacts/api-server/src/routes/bots.ts` — bot CRUD + start/stop + SSE logs
- `artifacts/api-server/src/lib/bot-manager.ts` — Python process manager singleton
- `artifacts/api-server/src/lib/openai.ts` — OpenAI client + HTML generation
- `bot-data/<botId>/` — bot file storage on disk

## Architecture decisions

- HTML content stored directly in PostgreSQL (text column) — no object storage needed for MVP
- User sites served at `/s/<sitename>` via the same Express API server (not a separate service)
- The API server's `artifact.toml` declares both `/api` and `/s` paths so the proxy routes both correctly
- Site names must be lowercase letters, numbers, and hyphens only (max 50 chars)
- AI generation uses `gpt-5.1` model to produce complete, self-contained HTML pages
- Bot files stored in `bot-data/<botId>/` on disk (not in DB)
- Bot processes managed by singleton `BotManager` — `child_process.spawn("python3", ...)`
- SSE (Server-Sent Events) for real-time terminal log streaming to the browser
- Bot routes NOT in OpenAPI spec (SSE + file ops are outside codegen scope)
- `requirements.txt` in bot dir auto-installed via pip3 before bot start
- Running bots are restored after API server restart (via DB status field)

## Product

- **Dashboard**: View all published sites + quick links to site/bot hosting
- **Create (Upload)**: Upload or paste HTML → set a unique site name → live instantly at `/s/<name>`
- **Create (AI)**: Describe your site in plain text → AI generates full HTML → deployed instantly
- **Site Detail**: Preview site in iframe, copy link, view source, delete
- **Bot List**: View all bots with running status, create/delete bots
- **Bot Detail**: VS Code-like editor (file tree + textarea), dark terminal with SSE log stream, Start/Stop controls

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always re-run codegen after changing `lib/api-spec/openapi.yaml`
- The `/s` path must be in the API server's `artifact.toml` paths array for the proxy to forward site requests
- `validateName()` is called before DB uniqueness checks — returns null if valid, error string if invalid
- `htmlContent` is omitted from list/stats responses (too large) but included in `GET /sites/:name`
- Bot routes use manual Express handlers (not OpenAPI-generated) — add directly to `artifacts/api-server/src/routes/bots.ts`
- DB push via `drizzle-kit push` requires a TTY — use raw SQL (`node -e`) if running non-interactively
- `pnpm run typecheck:libs` must be run after adding new exports to `lib/db/src/schema/index.ts`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
