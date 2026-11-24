import type { menuComponents, menuItems, portionLevels } from "@/db/schema";

export type NutritionSource = (typeof menuItems.$inferSelect)["kcalSource"];
export type MenuComponentType = (typeof menuComponents.$inferSelect)["type"];
export type MenuLevel = typeof portionLevels.$inferSelect;
export type MenuComponent = typeof menuComponents.$inferSelect & { levels: MenuLevel[] };
export type MenuItem = typeof menuItems.$inferSelect & { components: MenuComponent[] };

export const nutritionLabels: Record<NutritionSource, string> = {
  provider: "가게 제공",
  calculated: "계산값",
  estimated: "추정값",
  user: "사용자 입력",
  unavailable: "정보 없음",
};

export const menuComponentLabels: Record<MenuComponentType, string> = {
  rice: "밥", meat: "고기", sauce: "소스", dessert: "디저트", tofu: "두부",
  topping: "토핑", egg: "달걀", bread: "빵", other: "기타",
};

export const won = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" });
export function showPrice(value: number | null) {
  return value === null ? "가격 정보 없음" : won.format(value);
}

const number = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

export function showNutrition(value: number | null, unit: string, source: NutritionSource) {
  return value === null ? nutritionLabels.unavailable : `${number.format(value)} ${unit} · ${nutritionLabels[source]}`;
}

export function defaultLevel(component: MenuComponent) {
  return component.levels.find((level) => level.isDefault) ?? component.levels[0];
}

function totalNutrient(base: number | null, source: NutritionSource, deltas: {
  value: number | null;
  source: NutritionSource;
  isDefault: boolean;
}[]) {
  let value = base;
  if (value === null || source === "unavailable") return { value: null, source: "unavailable" as const };
  for (const delta of deltas) {
    if (delta.isDefault && (delta.value === 0 || delta.value === null)) continue;
    if (delta.value === null || delta.source === "unavailable") return { value: null, source: "unavailable" as const };
    value += delta.value;
    if (source === "estimated" || delta.source === "estimated" || delta.source === "user") {
      source = "estimated";
    } else if (delta.source === "calculated" || source !== delta.source) {
      source = "calculated";
    }
  }
  return { value, source };
}

export function menuTotals(item: MenuItem, levels: MenuLevel[]) {
  return {
    price: item.basePriceKrw === null ? null : item.basePriceKrw + levels.reduce((sum, level) => sum + level.priceDeltaKrw, 0),
    kcal: totalNutrient(item.baseKcal, item.kcalSource, levels.map((level) => ({
      value: level.kcalDelta, source: level.kcalSource, isDefault: level.isDefault,
    }))),
    protein: totalNutrient(item.baseProteinG, item.proteinSource, levels.map((level) => ({
      value: level.proteinDeltaG, source: level.proteinSource, isDefault: level.isDefault,
    }))),
  };
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
}
