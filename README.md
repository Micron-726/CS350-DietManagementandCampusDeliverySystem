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

Log in on `/login` (student or store). Students sign up on `/signup` with an `@kaist.ac.kr`
email. See [Accounts](#accounts) for the demo accounts and the helpers to get the current user.

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

## Accounts

Two account types, stored in `profiles.role`:

| Role | Who | How the account is made | First page |
|---|---|---|---|
| `customer` | KAIST student | Self sign-up on `/signup`, `@kaist.ac.kr` only. KAIST verification is fake: the "인증" button always succeeds and no mail is sent | `/` |
| `restaurant` | Campus store | No sign-up. The store mails a request (`/signup/store`), an admin creates the account (below) | `/store` |

### Demo accounts (local stack)

The local seed files create these accounts on `npm run db:reset`.

| Email | Password | Role |
|---|---|---|
| `student@kaist.ac.kr` | `student` | customer |
| `store@gmail.com` | `store` | restaurant, owns **W2 Bowl House** |
| `byeollidalli@example.com` | `demo-store` | restaurant, owns **별리달리** |

For your own test accounts, sign up with any `<name>@kaist.ac.kr` address. Other domains are
rejected, by the app and by the database.

### Getting the current user (server code)

Use `@/lib/auth` instead of reading the Supabase session yourself. Server-only.

```ts
import { getCurrentAccount, requireAccount } from "@/lib/auth";

// exported as `Account`
type Account = {
  id: string;                         // auth.users.id = profiles.id
  email: string;
  displayName: string | null;
  role: "customer" | "restaurant";
  restaurantId: string | null;        // restaurant owned by a store account, else null
};

await getCurrentAccount();            // Account | null (signed out)
await requireAccount();               // any signed-in account; signed out → redirect /login
await requireAccount("customer");     // student only; a store account → redirect /store
await requireAccount("restaurant");   // store only;   a student      → redirect /
```

Both are cached per request (React `cache`), so calling them in several components costs one
DB lookup.

**In a page.** Session reads must sit inside `<Suspense>`, after `await connection()`:

```tsx
import { Suspense } from "react";
import { connection } from "next/server";
import { requireAccount } from "@/lib/auth";

export default function Page() {
  return (
    <Suspense fallback={<p>불러오는 중…</p>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await connection();
  const account = await requireAccount("customer");
  return <p>{account.email}</p>;
}
```

**In a Server Action.** Check again inside every action. A check in the page does not protect
the action, because actions can be called directly.

```ts
"use server";
import { requireAccount } from "@/lib/auth";

export async function updateMenu(formData: FormData) {
  const store = await requireAccount("restaurant");
  if (!store.restaurantId) throw new Error("No restaurant linked to this account");
  // Only touch rows where restaurant_id = store.restaurantId
}
```

- Store pages live under `/store/*` and start with `requireAccount("restaurant")`. Scope every
  store query to `account.restaurantId`.
- Personal data (profiles, goals, logs) is still read with supabase-js, where RLS limits rows to
  the signed-in user. `account.id` is the same id as `auth.uid()`.

### Rules to keep

- **Users can't change their own `role`.** `authenticated` has UPDATE on a fixed list of
  `profiles` columns (`*_account.sql` migration). **If you add a user-editable column to
  `profiles`, grant UPDATE on it in a new custom migration**, or supabase-js gets
  `permission denied for table profiles`.
- A customer's email must stay `@kaist.ac.kr` (`on_auth_user_created` and
  `on_auth_user_email_change` triggers).
- Keep `restaurants.owner_id` when you change `restaurants`.

### Creating a store account (admin)

In the SQL editor (Supabase Studio or `psql`):

```sql
select public.admin_create_account(
  'store@example.com',   -- login email (any domain)
  'password',            -- 6+ characters for real accounts
  'restaurant',
  'Store name',          -- display name
  '<restaurants.id>'     -- restaurant to link, or null
);
```

The function is not callable from supabase-js, so clients can't create store accounts.

### Account pages

| Path | What |
|---|---|
| `/login` | Choose student / store, then `/login/student` or `/login/store` |
| `/signup` | Student sign-up |
| `/signup/store` | How a store requests an account |
| `/account` | Account info, log out, delete account (deletes all personal data) |
| `/store` | Store home |
| `/store/menu` | Add and edit the store’s menus, nutrition, and portion options |
| `/store/orders` | Review orders, accept or reject them, and update delivery status |
| `/restaurants` | Browse the campus catalog and place demo orders with eligible stores |
| `/orders` | Review your customer order history |

`/login*`, `/signup*` and `/auth*` are open to signed-out users; everything else redirects to
`/login` (`src/lib/supabase/proxy.ts`).

## Restaurant and order demo

Sign in as the demo student on `/login/student`, then open `/restaurants` and choose a menu.
Pick a simulated payment result at checkout. From a separate browser session, sign in to
`/login/store` as the matching store and use `/store/orders`. Accepted orders progress from
preparing to dispatch and delivery. Payment approvals and declines are simulations.

The local [별리달리 seed](supabase/seeds/byeolli-dalli.sql) contains the supplied menu and prices.
Each estimate uses reference foods and assumed serving weights documented in that file. Items
with insufficient details show unknown nutrition. Seeded portion weights are fixed assumptions.

## Data access

- **Personal data** (profiles, goals, meal/weight logs): `supabase-js` from `@/lib/supabase/*`.
  Row-level security limits each user to their own rows.
- **Catalog and server-only data** (providers, restaurants, menus, orders): Drizzle `db` from
  `@/db`, server code only. The server places demo orders, records payment and delivery events,
  and confirms orders when the linked store accepts them.

## Next.js notes

This is Next.js 16 with `cacheComponents` and `partialPrefetching` on (`next.config.ts`). APIs
differ from older versions; the docs for the installed version are in
`node_modules/next/dist/docs/`.

- Read request data (`cookies()`, `searchParams`, DB queries) inside a `<Suspense>` boundary,
  otherwise the build fails.
- Server components that show per-user data call `await connection()` (from `next/server`)
  first. Without it, supabase-js reads the clock during prefetch and Next reports
  ``encountered the unstable value `Date.now()` ``.
