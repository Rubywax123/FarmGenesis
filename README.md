# FarmForecast

Financial forecasting for farming projects. Model planting blocks, yield ramp-up, harvest curves, operating costs, and loan financing for a farming venture, then explore the results on a dashboard built for people with zero spreadsheet context (e.g. a loan officer).

The full product specification lives in [`SPEC.md`](./SPEC.md) — it is the source of truth.

## Tech stack

- **Next.js 15** (App Router) — frontend + API routes
- **TypeScript** (strict) with a pure-TypeScript calculation engine in `src/engine/` (no UI/DB/framework imports)
- **Prisma ORM + PostgreSQL** — persistence for projects and scenario inputs (results are always computed in the browser, never stored)
- **Tailwind CSS + shadcn/ui-style components** — design system
- **Recharts** — dashboard and compare charts
- **Zod** — shared validation between forms and API
- **Vitest** — engine acceptance tests
- **pnpm** — package manager (required; npm/yarn are blocked by a preinstall check)

## Local setup (fresh clone)

Prerequisites: Node.js 20+, pnpm, and a reachable PostgreSQL database.

1. **Install dependencies** (also runs `prisma generate`):

   ```bash
   pnpm install
   ```

2. **Configure secrets.** Copy `.env.example` to `.env` and set your connection string:

   ```bash
   cp .env.example .env
   # then edit .env:
   # DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
   ```

   `.env` is git-ignored — never commit real credentials.

3. **Apply database migrations** (committed under `prisma/migrations/`):

   ```bash
   pnpm run db:migrate   # prisma migrate dev
   ```

4. **Seed the database** with the "Zimbabwe Blueberry Base Case" project:

   ```bash
   pnpm run seed
   ```

   Seeding is idempotent: it upserts by fixed IDs, so re-running never duplicates the Blueberry project and never overwrites edits you have made to existing records.

5. **Start the dev server**:

   ```bash
   pnpm dev
   ```

   The app runs at [http://localhost:3000](http://localhost:3000).

## Running tests

The calculation engine is covered by Vitest acceptance tests (SPEC Section 10) that check it reproduces the reference Excel model within ±0.1%:

```bash
pnpm test          # single run (21 tests)
pnpm run test:watch
```

The tests are pure engine tests — no database or dev server needed.

Other useful scripts:

```bash
pnpm run typecheck   # strict TS check for both engine and app
pnpm run build       # typecheck + next build (production build)
```

## Replit deployment

This repo was scaffolded by Replit Agent and deploys as a Replit **autoscale** app. The deployment is configured in `.replit`:

- **Build command:** `pnpm build` — runs the strict typechecks then `next build`.
- **Run command:** `npx prisma migrate deploy && pnpm start`
  - `prisma migrate deploy` applies any pending committed migrations (never generates new ones).
  - `pnpm start` runs `next start -H 0.0.0.0`, binding to all interfaces. Next.js reads the port from the `PORT` environment variable (Replit sets it; it falls back to 3000 locally).
  - Seeding (`pnpm run seed`) is idempotent and can be run at any time — including on deploys — without duplicating the Blueberry project or overwriting user data.

### Required secrets

Set these in **Replit Secrets** (locally they come from `.env`):

| Secret | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string used by Prisma |

No other secrets are needed. All configuration comes from environment variables only.

## Project structure

```
src/engine/          Pure TS calculation engine + seed data + acceptance tests
src/app/             Next.js App Router pages and API routes
src/components/      Design system (ui/, layout/) and feature components
src/lib/             Prisma client, Zod schemas, formatting helpers
prisma/              Schema, committed migrations, idempotent seed script
```
