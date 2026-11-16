# Diet Management and Campus Delivery System

Team 12 (CS350) demo app. Next.js 16 + Supabase (Auth, Postgres + PostGIS) + Drizzle ORM.
The database schema follows the Team 12 SRS (2026-10-07). Requirement IDs (FR-xx, NFR-xx, …)
are referenced in comments in `src/db/schema.ts`.

## Setup

The team shares one hosted Supabase project (Tokyo, `mgsnustjmswvuhanhofw`). To work on the app
you only need Node.js:

```bash
npm install
cp .env.example .env.local  # fill in the publishable key and the DB password (ask a teammate)
npm run dev                 # http://localhost:3000
```

Sign up on `/login` with any email and password.

### Local stack (for schema changes)

Test migrations on a local database before they reach the shared one. Requires Docker.

```bash
npm run db:start            # start local Supabase; prints URLs and keys
# in .env.local, switch to the "Local stack" block from .env.example
npm run db:reset            # apply migrations + load demo data (supabase/seed.sql)
```

### Applying migrations to the shared project

One person at a time, after the migration is merged to `main`. The DB password isn't needed:
the CLI uses your Supabase login, so you need to be a member of the project's organization.

```bash
npx supabase login
npx supabase link --project-ref mgsnustjmswvuhanhofw   # once per clone
npx supabase db push --remote --dry-run                # preview
npx supabase db push --remote
```

Never run `db reset --remote`, and don't change tables in the hosted dashboard. Every schema
change goes through a migration.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server on http://localhost:3000 |
| `npx next build` | Production build (also type-checks) |
| `npx next start` | Serve the production build |
| `npx eslint .` | Lint |
| `npx tsc --noEmit` | Type-check only |

### Database

| Command | What it does |
|---|---|
| `npm run db:start` | Start the local Supabase stack (`supabase start`) |
| `npx supabase status` | Show local URLs and keys |
| `npx supabase stop` | Stop the stack (data is kept) |
| `npm run db:reset` | **Wipe the local DB**, re-apply all migrations, load `supabase/seed.sql` |
| `npm run db:generate` | Write a new migration from `src/db/schema.ts` (`drizzle-kit generate`) |
| `npx drizzle-kit generate --custom --name=<name>` | Empty migration for hand-written SQL (extensions, triggers, functions) |
| `npm run db:migrate` | Apply pending migrations without wiping data (`supabase migration up`) |
| `npx supabase migration list` | Which migrations are applied locally |
| `npx drizzle-kit check` | Check the migration files are consistent |
| `npm run db:types` | Regenerate `src/lib/supabase/database.types.ts` for supabase-js |
| `npm run db:studio` | Open Drizzle Studio (data browser) |

## Local services

Available after `npm run db:start`. `npx supabase status` prints the same list.

| Service | URL | Use |
|---|---|---|
| Next.js app | http://localhost:3000 | The app |
| Supabase Studio | http://127.0.0.1:54323 | Dashboard for the local stack (see below) |
| Drizzle Studio | https://local.drizzle.studio | Data browser, after `npm run db:studio` |
| Mailpit | http://127.0.0.1:54324 | Inbox for emails sent by local Auth (password reset, etc.) |
| Supabase API | http://127.0.0.1:54321 | Auth (`/auth/v1`), REST (`/rest/v1`), GraphQL (`/graphql/v1`), Storage |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` | Direct DB connection (`psql`, Drizzle) |

### Supabase Studio pages

- **Database → Schema Visualizer**: diagram of all tables and their relationships
- **Table Editor**: browse and edit rows
- **SQL Editor**: run SQL against the local DB
- **Authentication → Users**: local accounts; create or delete test users
- **Authentication → Policies**: row-level security policies per table
- **Database → Triggers / Functions / Extensions**: `set_updated_at`, `on_auth_user_created`, PostGIS, moddatetime
- **Logs**: API, Postgres and Auth logs

Supabase Studio, Drizzle Studio and `psql` connect as an admin, so **row-level security does not
apply there**: you see every user's rows and edits go straight to the database. To check what a
user can see, use the app or supabase-js.

## Changing the database schema

`src/db/schema.ts` is the source of truth. Don't edit generated migrations.

1. Edit `src/db/schema.ts`.
2. `npm run db:generate` to write the migration into `supabase/migrations/`.
3. `npm run db:migrate` to apply it locally.
4. `npm run db:types` to update the supabase-js types.
5. Commit the schema, the new migration and `supabase/migrations/meta/*`.

- SQL that Drizzle can't express (extensions, triggers, functions) goes in a custom migration:
  `npx drizzle-kit generate --custom --name=<name>`.
- A new table with an `updated_at` column also needs a `set_updated_at` trigger
  (see `supabase/migrations/*_triggers.sql`).
- New tables are **not reachable from supabase-js** until granted (`auto_expose_new_tables = false`,
  same as the hosted project). Add `grant ... to authenticated` in a custom migration, following
  `supabase/migrations/*_grants.sql`. Without it you get `permission denied for table ...`.
- If `db:generate` asks whether a column was renamed or replaced, answer in the terminal; it
  needs an interactive shell.

## Data access

- **Personal data** (profiles, goals, meal/weight logs): `supabase-js` from `@/lib/supabase/*`.
  Row-level security limits each user to their own rows.
- **Catalog and server-only data** (providers, restaurants, menus, orders): Drizzle `db` from
  `@/db`, server code only. Orders are created and updated by the server after the provider
  responds, never by the client.

## Next.js notes

This is Next.js 16 with `cacheComponents` and `partialPrefetching` on (`next.config.ts`). APIs
differ from older versions; the docs for the installed version are in
`node_modules/next/dist/docs/`.

- Read request data (`cookies()`, `searchParams`, DB queries) inside a `<Suspense>` boundary,
  otherwise the build fails.
- Server components that show per-user data call `await connection()` (from `next/server`)
  first. Without it, supabase-js reads the clock during prefetch and Next reports
  ``encountered the unstable value `Date.now()` ``.
