import "server-only";
import { db } from "@/db";
import { menuComponents, menuItems, portionLevels, providers } from "@/db/schema";

export const MENU_WITH_PORTIONS = {
  components: {
    orderBy: () => [menuComponents.sortOrder, menuComponents.id],
    with: { levels: { orderBy: () => [portionLevels.level] } },
  },
} as const;

type Provider = typeof providers.$inferSelect;

export function supportsDemoOrdering(provider: Provider) {
  return provider.code === "demo_delivery" && provider.isActive && provider.supportsOrdering && provider.supportsDelivery;
}

export function loadMenuItem(restaurantId: string, itemId: string) {
  return db.query.menuItems.findFirst({
    where: (item, { and, eq }) => and(eq(item.restaurantId, restaurantId), eq(menuItems.id, itemId)),
    with: MENU_WITH_PORTIONS,
  });
}
