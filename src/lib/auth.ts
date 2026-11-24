import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, restaurants } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in account. Use these helpers instead of reading the Supabase session yourself.
 *
 *   const account = await getCurrentAccount();          // null when signed out
 *   const account = await requireAccount();             // any signed-in account
 *   const store   = await requireAccount("restaurant"); // store pages / store server actions
 *
 * Call them from Server Components (inside a <Suspense> boundary, after `await connection()`),
 * Server Actions and Route Handlers. Re-check in every Server Action: a page check doesn't
 * protect the action.
 */
export type AccountRole = (typeof profiles.role.enumValues)[number];

type OwnedRestaurant = Pick<typeof restaurants.$inferSelect, "id" | "name" | "address" | "campusArea">;

export type Account = {
  id: string; // auth.users.id = profiles.id
  email: string;
  displayName: string | null;
  role: AccountRole;
  /** Default selection for store accounts, null for customers and unlinked accounts. */
  restaurantId: string | null;
  restaurants: OwnedRestaurant[];
};

/** First page for each account type. */
export const HOME_BY_ROLE: Record<AccountRole, string> = {
  customer: "/",
  restaurant: "/store",
};

/** Looked up once per request (React cache). */
export const getCurrentAccount = cache(async (): Promise<Account | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const rows = await db
    .select({
      displayName: profiles.displayName,
      role: profiles.role,
      restaurant: {
        id: restaurants.id, name: restaurants.name, address: restaurants.address, campusArea: restaurants.campusArea,
      },
    })
    .from(profiles)
    .leftJoin(restaurants, eq(restaurants.ownerId, profiles.id))
    .where(eq(profiles.id, claims.sub))
    .orderBy(asc(restaurants.name), asc(restaurants.id));
  const [row] = rows;
  // A valid token whose user was deleted (e.g. after leaving) has no profile.
  if (!row) return null;

  const owned = row.role === "restaurant" ? rows.flatMap(({ restaurant }) => restaurant ? [restaurant] : []) : [];
  return {
    id: claims.sub,
    email: claims.email ?? "",
    displayName: row.displayName,
    role: row.role,
    restaurantId: owned[0]?.id ?? null,
    restaurants: owned,
  };
});

/**
 * Signed out → /login. Wrong account type → that account's own first page.
 * Returns the account otherwise.
 */
export async function requireAccount(role?: AccountRole): Promise<Account> {
  const account = await getCurrentAccount();
  if (!account) redirect("/login");
  if (role && account.role !== role) redirect(HOME_BY_ROLE[account.role]);
  return account;
}

/** Resolve a store selection only from the account's owned locations. */
export function selectOwnedRestaurant(account: Account, requested: string | string[] | undefined) {
  const id = requested ?? account.restaurantId;
  return account.restaurants.find((restaurant) => restaurant.id === id);
}
