import "server-only";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { menuComponents, menuItems, portionLevels, providers, restaurants } from "@/db/schema";
import { menuServedOn } from "@/lib/menu-data";
import {
  type Candidate,
  type ComponentOptions,
  type SearchCriteria,
  haversineM,
  rankWithWidening,
} from "@/lib/ranking";

export type UserLocation = { lat: number; lng: number };

export type RestaurantInfo = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
};

// Loads all available meals from the database and turns them into
// Candidate objects that the ranking code can work with.
export async function loadCandidates(location?: UserLocation) {
  const rows = await db
    .select({ item: menuItems, restaurant: restaurants })
    .from(menuItems)
    .innerJoin(restaurants, eq(menuItems.restaurantId, restaurants.id))
    .innerJoin(providers, eq(restaurants.providerId, providers.id))
    .where(and(
      eq(menuItems.isAvailable, true),
      // integration: menu prices became nullable (unpublished prices); such items can't be ranked
      isNotNull(menuItems.basePriceKrw),
      // integration: same filters as the home page — open restaurants, and for the rotating
      // cafeteria menus only today's offering
      eq(restaurants.isActive, true),
      eq(providers.isActive, true),
      menuServedOn(),
    ));

  const itemIds = rows.map((r) => r.item.id);
  const componentRows = itemIds.length
    ? await db.select().from(menuComponents).where(inArray(menuComponents.menuItemId, itemIds))
    : [];

  const componentIds = componentRows.map((c) => c.id);
  const levelRows = componentIds.length
    ? await db.select().from(portionLevels).where(inArray(portionLevels.componentId, componentIds))
    : [];

  // group the levels by component, and the components by menu item
  const componentsByItem = new Map<string, ComponentOptions[]>();
  for (const comp of componentRows) {
    const levels = levelRows
      .filter((l) => l.componentId === comp.id)
      .sort((a, b) => a.level - b.level)
      .map((l) => ({
        componentId: comp.id,
        componentName: comp.name,
        levelId: l.id,
        label: l.label,
        isDefault: l.isDefault,
        priceDeltaKrw: l.priceDeltaKrw,
        kcalDelta: l.kcalDelta,
        proteinDeltaG: l.proteinDeltaG,
      }));
    const list = componentsByItem.get(comp.menuItemId) ?? [];
    list.push({ componentId: comp.id, levels });
    componentsByItem.set(comp.menuItemId, list);
  }

  const restaurantInfo: Record<string, RestaurantInfo> = {};
  const candidates: Candidate[] = rows.map(({ item, restaurant }) => {
    restaurantInfo[restaurant.id] = {
      id: restaurant.id,
      name: restaurant.name,
      lat: restaurant.lat,
      lng: restaurant.lng,
    };

    const hasCoords = restaurant.lat !== null && restaurant.lng !== null;
    const distanceM =
      location && hasCoords
        ? haversineM(location, { lat: restaurant.lat!, lng: restaurant.lng! })
        : null;

    return {
      menuItemId: item.id,
      name: item.name,
      restaurantId: restaurant.id,
      basePriceKrw: item.basePriceKrw!, // non-null: filtered in the query above
      baseKcal: item.baseKcal,
      baseProteinG: item.baseProteinG,
      kcalExact: item.kcalSource === "provider",
      proteinExact: item.proteinSource === "provider",
      distanceM,
      components: componentsByItem.get(item.id) ?? [],
    };
  });

  return { candidates, restaurantInfo };
}

// Main function for the search page: load meals, then rank them.
export async function searchMeals(criteria: SearchCriteria, location?: UserLocation) {
  const { candidates, restaurantInfo } = await loadCandidates(location);

  // without a user location we can't measure distance, so ignore the distance limit
  const effective: SearchCriteria = location
    ? criteria
    : { ...criteria, maxDistanceM: undefined };

  // stop widening once 3 meals fit every limit
  const ranked = rankWithWidening(candidates, effective, { limit: 20, minResults: 3 });
  return { ...ranked, restaurantInfo };
}