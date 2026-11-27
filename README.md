# Diet Management and Campus Delivery System

Team 12 (CS350) demo app. Next.js 16 + Supabase (Auth, Postgres + PostGIS) + Drizzle ORM.
The database schema follows the Team 12 SRS (2026-10-07). Requirement IDs (FR-xx, NFR-xx, …)
are referenced in comments in `src/db/schema.ts`.

## Integration build (`integration` branch)

This branch puts every part together so each of us can check that our part works with the
others. **It is a test build, not the final version.** Feedback goes to the owner of each part;
fixes are made on your own branch and merged again later.

| Part | Branch | Owner | Pages |
|---|---|---|---|
| A. Accounts | `account` | Micron-726 | `/login`, `/signup`, `/signup/store`, `/account` |
| C+D. Restaurants, orders, store | `codex/restaurant-orders` | Ariaspect | `/restaurants`, `/bag`, `/orders`, `/store`, `/store/menu`, `/store/orders` |
| B. Personal diet | `feature/personal-diet` | leven | `/` (rings), `/profile`, `/goals`, `/diary`, `/weight` |
| E. Search and ranking | `feature/search-ranking` | Hamza | `/search`, `/search/results` |

### Run it

You need Node.js and **Docker Desktop** (running). The build uses a **local** database: the shared
hosted project does not have these migrations yet, so don't point it at the shared DB.

```bash
git fetch origin
git switch integration          # first time: git switch -c integration origin/integration
npm install
npm run db:start                # local Supabase in Docker (first run downloads images)
```

Create `.env.local` with the **Local stack** block from `.env.example`. The three values come from
`npx supabase status`:

| Variable | Value from `npx supabase status` |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `API_URL` (http://127.0.0.1:54321) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `PUBLISHABLE_KEY` (`sb_publishable_…`) |
| `DATABASE_URL` | `DB_URL` (postgresql://postgres:postgres@127.0.0.1:54322/postgres) |

```bash
npm run db:reset                # all migrations + demo restaurants, menus and accounts
npm run cafeteria:sync          # optional: today's KAIST cafeteria menus from kaist.ac.kr
npm run dev                     # http://localhost:3000
```

`npm run db:reset` wipes the local data. Run it again any time to start over (then
`cafeteria:sync` again for today's cafeteria menus).

### Log in

| Email | Password | Use it for |
|---|---|---|
| `student@kaist.ac.kr` | `student` | Student: diet, search, ordering |
| `store@gmail.com` | `store` | Store that owns **W2 Bowl House** (takes demo orders) |
| `byeollidalli@example.com` | `demo-store` | Store that owns **별리달리** (takes demo orders) |
| `kaist-cafeteria@example.com` | `demo-cafeteria` | The five KAIST cafeterias (browse only) |

To act as a student and a store at the same time, use a second browser or a private window.

### Things to try

**Student** (`/login` → 학생 로그인)

1. **Goals.** On the home page, open 신체 정보 and fill in your body data, then 목표 and save a goal
   (FR-02..07). The two rings on the home page show today's calories and protein against it
   (IR-01, FR-08..10).
2. **Food log.** 식단 기록 → add, edit and delete a meal, and move between days (FR-11..14).
   Leave calories or protein empty to see how unknown values are shown.
3. **Weight.** 체중 → add a few records and check the line chart (FR-16..18).
4. **Search.** On the home page, 남은 목표에 맞는 메뉴 → 이대로 찾기 searches with what is left of
   today's goal. Or open 메뉴 찾기 and try the SRS example: 700 kcal, 30 g protein, ₩13,000
   (FR-19..27). Move a portion slider on a result card: calories, protein and price update
   (FR-28..31). 내 위치 사용 + a max distance limits by distance (IR-08).
5. **Order.** From a result (메뉴 보고 주문하기) or 교내 식당 → W2 Bowl House or 별리달리 → pick a
   menu and portions → 장바구니 → 모의 주문하기. Try the 거절 payment result too (FR-32..36).

**Store** (second browser → `/login` → 가게 로그인 as `store@gmail.com`)

6. 주문 관리 → accept the student's order and move it through preparing and delivery.
   메뉴 관리 → edit a menu, its nutrition and portion options.

**Student again**

7. 내 주문 → the accepted order shows its order number and **식사 기록에 추가** (FR-15). Add it,
   then check that 식단 기록 and the home rings include it.
8. 내 계정 → log out, or delete the account (all personal data is removed).

### Tests

```bash
npm test                        # all three suites below
npm run ranking:test            # ranking (vitest, 13 tests)
npm run diet:test               # diet calculations and validation (node:test, 75 tests)
npm run cafeteria:test          # cafeteria menu parsing (node:test, 3 tests)
```

`npx tsc --noEmit`, `npx eslint .` and `npx next build` pass on this branch.

### What changed while merging

Each part's features are as they were on its branch. The changes below were needed for the parts
to build and work together.

**Merge order.** `account` → `codex/restaurant-orders` → `feature/personal-diet` were already
stacked on each other, so they came in without conflicts. `feature/search-ranking` branched from
`main` and was merged on top.

**Fixes**

| Problem | Where it came from | Fix |
|---|---|---|
| The build failed: the results map imports `leaflet` and `react-leaflet`, which were not in `package.json` | `feature/search-ranking` | Added `leaflet`, `react-leaflet`, `@types/leaflet` |
| `package.json` conflict: two test setups (vitest vs. `node:test`); plain `vitest run` also picks up the `node:test` files and fails | `feature/search-ranking` ↔ `feature/personal-diet` | Added `ranking:test`; `npm test` runs all three suites |
| Type error: `menu_items.base_price_krw` became nullable (cafeteria menus without a published price), but ranking expects a number | `codex/restaurant-orders` ↔ `feature/search-ranking` | `src/lib/search.ts` skips menus without a price. `ranking.ts` is unchanged |

**Connecting the parts**

- Search was not linked anywhere. Added **메뉴 찾기** to the student menu, and the empty image slot
  on the home page became the search entry, filled with what is left of today's goal (IR-02).
- `/search` and `/search/results` now use the app's shadcn components and Korean text. The field
  names, ranking, slider totals and map logic are unchanged. Added: a link from each result to
  its menu page for ordering, an empty state, "조건 바꾸기" that keeps the query, and student-only
  access.
- Search only looks at active restaurants and today's cafeteria menus, the same rule as the home
  page. Before, menus from past days would also show up.
- Added the shadcn `toggle-group` component for the search priority.

### Not done yet

- App-wide "not medical advice" notice (OR-01) and help pages (SRS 2.6). For now the notice is only
  on the goal and search pages.
- Applying the migrations to the shared hosted project (after merging to `main`).

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
| `npm test` | Ranking, diet and cafeteria tests |
| `npm run cafeteria:sync` | Load today's KAIST cafeteria menus into the database in `.env.local` |

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
| `kaist-cafeteria@example.com` | `demo-cafeteria` | restaurant, manages all five **KAIST 학식** locations |

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
  restaurantId: string | null;        // default restaurant selection, else null
  restaurants: { id: string; name: string; address: string | null; campusArea: string | null }[];
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

- Store pages live under `/store/*` and start with `requireAccount("restaurant")`. Resolve the selected
  restaurant with `selectOwnedRestaurant`, then scope queries to that location. Store actions also check
  the restaurant’s owner in the database.
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

### Pages

| Path | What |
|---|---|
| `/` | Student home: today's calorie/protein rings, search entry, today's menus |
| `/profile`, `/goals` | Body data, and daily calorie/protein goals |
| `/diary` | Food log for any day, with that day's rings |
| `/weight` | Weight records and line chart |
| `/search`, `/search/results` | Meal search by calories, protein, price and distance; ranked results with portion sliders and a map |
| `/login` | Choose student / store, then `/login/student` or `/login/store` |
| `/signup` | Student sign-up |
| `/signup/store` | How a store requests an account |
| `/account` | Account info, log out, delete account (deletes all personal data) |
| `/store` | Store home |
| `/store/menu` | Add and edit the store’s menus, nutrition, and portion options |
| `/store/orders` | Review orders, accept or reject them, and update delivery status |
| `/restaurants` | Browse the campus catalog and add meals from eligible stores to your bag |
| `/bag` | Review selections and quantities, then check out together |
| `/orders` | Review your customer order history |

`/login*`, `/signup*` and `/auth*` are open to signed-out users; everything else redirects to
`/login` (`src/lib/supabase/proxy.ts`).

## Restaurant and order demo

Sign in as the demo student on `/login/student`, then open `/restaurants` and add meals to your bag.
Review quantities and choose a simulated payment result in `/bag`. One checkout creates an order per store.
From a separate browser session, sign in to
`/login/store` as the matching store and use `/store/orders`. Accepted orders progress from
preparing to dispatch and delivery. Payment approvals and declines are simulations.

The local [별리달리 seed](supabase/seeds/byeolli-dalli.sql) contains the supplied menu and prices.
Each estimate uses reference foods and assumed serving weights documented in that file. Items
with insufficient details show unknown nutrition. Seeded portion weights are fixed assumptions.

## KAIST cafeteria menus

The [official KAIST menu page](https://www.kaist.ac.kr/kr/html/campus/053001.html) publishes rotating
menus for 카이마루 북측식당, 서맛골, 동맛골 학생식당, 동맛골 교직원식당, and 교수회관. The app shows
entries for today in Korea. Each offering keeps the source link, menu date, and published price and
nutrients when available. The same date can be synced again without creating duplicate menu entries.
Edits from the store account are kept for that offering. Cafeteria listings are for browsing.

### Run locally

With the local stack configured in `.env.local`, run `npm run cafeteria:sync`. For a specific date,
running `npm run cafeteria:sync -- 2026-11-24` loads that day. `npm run cafeteria:test` checks parsing.
On an existing local database, apply the migrations first with `npm run db:migrate`. The demo account
is created by `npm run db:reset` when setting up a fresh local database. On an existing database, you
can create it with `npm run cafeteria:account` and the account credentials from the demo table above.

### Enable the daily job on the shared project

1. Merge the workflow to the default branch and apply the Supabase migrations using the shared project procedure above.
2. With an admin `DATABASE_URL` and private `CAFETERIA_ACCOUNT_EMAIL` and `CAFETERIA_ACCOUNT_PASSWORD`
   environment variables, run `npm run cafeteria:account` once to provision the store login and link its five locations.
3. In the shared database, create a login for the scheduler with the `kaist_cafeteria_sync` role. In `psql`, set its password interactively with `\password kaist_cafeteria_worker`.

   ```sql
   create role kaist_cafeteria_worker login in role kaist_cafeteria_sync;
   ```

4. Add the job login’s connection string as the GitHub Actions secret `CAFETERIA_DATABASE_URL`.
   For the Supabase shared pooler, use `kaist_cafeteria_worker.<project-ref>` as the username and require SSL.
   The workflow runs daily at 06:17 Korea time. Run **Sync KAIST cafeteria menus** manually in Actions for the first import.

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
