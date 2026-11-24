import "server-only";
import { createHash } from "node:crypto";
import { inArray } from "drizzle-orm";
import type { db } from "@/db";
import { menuItems, type PortionSnapshot } from "@/db/schema";
import { selectionKey, type BagSelection, type BagQuote, type QuotedLine } from "@/lib/bag";
import { dateInKorea } from "@/lib/korea-date";
import { menuTotals } from "@/lib/menu";
import { MENU_WITH_PORTIONS, supportsDemoOrdering } from "@/lib/menu-data";

export function loadBagMenus(query: typeof db.query, ids: string[]) {
  return query.menuItems.findMany({
    where: inArray(menuItems.id, ids),
    with: { ...MENU_WITH_PORTIONS, restaurant: { with: { provider: true } } },
  });
}

type BagMenu = Awaited<ReturnType<typeof loadBagMenus>>[number];
type BagTotals = Omit<ReturnType<typeof menuTotals>, "price"> & { price: number };
type VerifiedLine = { item: BagMenu; totals: BagTotals; portions: PortionSnapshot[] };

export function evaluateBag(selections: BagSelection[], menus: BagMenu[]) {
  const today = dateInKorea();
  const validNutrient = (amount: number | null) => amount === null || (Number.isFinite(amount) && amount >= 0);
  const byId = new Map(menus.map((item) => [item.id, item]));

  return selections.map((selection) => {
    const item = byId.get(selection.itemId);
    const display: QuotedLine = {
      key: selectionKey(selection), name: item?.name ?? "메뉴 정보 없음",
      restaurantId: item?.restaurant.id ?? null, restaurantName: item?.restaurant.name ?? null,
      portions: [], unitPrice: null,
    };
    if (!item?.isAvailable || (item.serviceDate && item.serviceDate !== today) || !item.restaurant.isActive ||
        !item.restaurant.acceptingOrders || !supportsDemoOrdering(item.restaurant.provider)) {
      return { display: { ...display, error: "현재 주문할 수 없는 메뉴입니다." } };
    }

    const components = item.components.filter((component) => component.levels.length > 0);
    const selected = new Set(selection.levelIds);
    const matches = components.flatMap((component) => component.levels
      .filter((level) => selected.has(level.id)).map((level) => ({ component, level })));
    if (matches.length !== selected.size || matches.length !== components.length ||
        new Set(matches.map(({ component }) => component.id)).size !== components.length) {
      return { display: { ...display, error: "양 옵션이 변경되었습니다. 메뉴에서 다시 선택해 주세요." } };
    }

    const totals = menuTotals(item, matches.map(({ level }) => level));
    if (totals.price === null || !Number.isInteger(totals.price) || totals.price < 0 || totals.price > 2147483647 ||
        !validNutrient(totals.kcal.value) || !validNutrient(totals.protein.value)) {
      return { display: { ...display, error: "선택한 메뉴의 가격 또는 영양 정보를 확인할 수 없습니다." } };
    }
    const portions: PortionSnapshot[] = matches.map(({ component, level }) => ({
      componentId: component.id, portionLevelId: level.id, componentType: component.type, componentName: component.name,
      level: level.level, label: level.label, priceDeltaKrw: level.priceDeltaKrw, kcalDelta: level.kcalDelta, proteinDeltaG: level.proteinDeltaG,
    }));
    return {
      display: { ...display, unitPrice: totals.price, portions: portions.map(({ componentName, label }) => `${componentName} (${label})`) },
      verified: { item, totals: { ...totals, price: totals.price }, portions } satisfies VerifiedLine,
    };
  });
}

export function quoteFor(lines: ReturnType<typeof evaluateBag>): BagQuote {
  const revision = lines.every((line) => line.verified) ? createHash("sha256").update(JSON.stringify(lines.map(({ display, verified }) => [
    display, verified?.item.updatedAt.getTime(), verified?.totals,
  ]))).digest("hex") : null;
  return { lines: lines.map(({ display }) => display), revision };
}
