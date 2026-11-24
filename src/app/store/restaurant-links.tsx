import Link from "next/link";
import type { Account } from "@/lib/auth";

export function storePath(path: string, restaurantId: string) {
  return `${path}?restaurant=${restaurantId}`;
}

export function RestaurantLinks({ account, selectedId, path }: {
  account: Account;
  selectedId: string;
  path: "/store/menu" | "/store/orders";
}) {
  if (account.restaurants.length < 2) return null;
  return (
    <nav aria-label="식당 선택" className="mb-6 flex flex-wrap gap-2">
      {account.restaurants.map((restaurant) => (
        <Link key={restaurant.id} href={storePath(path, restaurant.id)} aria-current={selectedId === restaurant.id ? "page" : undefined}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm aria-[current=page]:border-emerald-600 aria-[current=page]:font-semibold dark:border-neutral-700"
        >{restaurant.name}</Link>
      ))}
    </nav>
  );
}
