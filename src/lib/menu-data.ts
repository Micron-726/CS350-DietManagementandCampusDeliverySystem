import "server-only";
import { eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { menuComponents, menuItems, portionLevels, providers } from "@/db/schema";
import { dateInKorea } from "@/lib/korea-date";

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

export function menuServedOn(date = dateInKorea()) {
  return or(isNull(menuItems.serviceDate), eq(menuItems.serviceDate, date));
}

export const menuPeriodOrder = sql`case ${menuItems.category} when '조식' then 0 when '중식' then 1 when '석식' then 2 else 3 end`;
