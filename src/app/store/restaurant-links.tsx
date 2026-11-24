import { ButtonLink } from "@/components/button-link";
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
    <nav aria-label="식당 선택" className="flex flex-wrap gap-2">
      {account.restaurants.map((restaurant) => (
        <ButtonLink href={storePath(path, restaurant.id)} key={restaurant.id}
 variant={selectedId === restaurant.id ? "secondary" : "outline"} aria-current={selectedId === restaurant.id ? "page" : undefined}>
          {restaurant.name}
        </ButtonLink>
      ))}
    </nav>
  );
}
