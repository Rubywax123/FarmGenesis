# FarmForecast

Financial forecasting app for farming projects: model planting blocks, yield ramp-up, harvest curves, costs, and loan financing, then explore results on a dashboard readable by a loan officer. `SPEC.md` is the source of truth.

## Run & Operate

- `pnpm dev` — run the Next.js dev server (port 3000)
- `pnpm build` — strict typecheck (engine + app) then `next build`
- `pnpm start` — production server (`next start -H 0.0.0.0`, port from `PORT`, fallback 3000)
- `pnpm test` — Vitest engine acceptance tests (21 tests, no DB needed)
- `pnpm run db:migrate` — `prisma migrate dev` (local schema changes)
- `pnpm run seed` — idempotent seed (fixed-ID upserts; safe to re-run, never overwrites user data)
- Required env: `DATABASE_URL` — Postgres connection string (Replit Secrets in production, `.env` locally)

## Deployment (autoscale)

- Build: `pnpm build`
- Run: `npx prisma migrate deploy && pnpm start`
- The app is a single Next.js server at the repo root serving both pages and `/api/*` routes on `process.env.PORT`. There is no separate API server.

## Stack

- Next.js 15 (App Router), React 19, TypeScript 5.9 (strict)
- PostgreSQL + Prisma ORM (migrations committed under `prisma/migrations/`)
- Tailwind CSS 4 + shadcn/ui-style components, Recharts, Zod
- Vitest for the engine acceptance tests
- pnpm (single package, no workspace sub-packages)

## Where things live

- `src/engine/` — pure TS calculation engine + seed data + acceptance tests (no UI/DB/Next imports allowed)
- `src/app/` — Next.js pages and API routes
- `src/components/` — design system (`ui/`, `layout/`) and feature components
- `src/lib/` — Prisma client, Zod schemas, formatting helpers
- `prisma/` — schema, migrations, idempotent seed script

## Architecture decisions

- Scenario **inputs** are stored in the DB (`Scenario.input` as JSON); **results are never stored** — they are computed in the browser by the engine on every view.
- Seeding upserts by fixed IDs with empty `update` blocks, so deploys never duplicate the Blueberry project or overwrite user edits.
- The original Replit Agent scaffold (Express `artifacts/api-server`, `artifacts/mockup-sandbox`, `lib/*` Drizzle/Orval packages) was removed; it was never used by the app.

## Gotchas

- Use pnpm only — the `preinstall` script blocks npm/yarn.
- `pnpm build` runs the strict engine typecheck first; engine code must stay dependency-free.
