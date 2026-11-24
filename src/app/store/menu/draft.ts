import type { MenuComponentType, MenuItem, NutritionSource } from "@/lib/menu";

export type LevelDraft = {
  key: string;
  id?: string;
  label: string;
  isDefault: boolean;
  price: string;
  kcal: string;
  kcalSource: NutritionSource;
  protein: string;
  proteinSource: NutritionSource;
};

export type ComponentDraft = {
  key: string;
  id?: string;
  name: string;
  type: MenuComponentType;
  levels: LevelDraft[];
};

export function emptyLevel(key: string, isDefault: boolean): LevelDraft {
  return {
    key, isDefault, label: isDefault ? "기본" : "", price: "0",
    kcal: "", kcalSource: "provider", protein: "", proteinSource: "provider",
  };
}

export function menuDraft(item?: MenuItem): ComponentDraft[] {
  return item?.components.map((component) => ({
    key: component.id, id: component.id, name: component.name, type: component.type,
    levels: component.levels.map((level) => ({
      key: level.id, id: level.id, label: level.label, isDefault: level.isDefault,
      price: String(level.priceDeltaKrw), kcal: String(level.kcalDelta ?? ""),
      kcalSource: level.kcalSource, protein: String(level.proteinDeltaG ?? ""),
      proteinSource: level.proteinSource,
    })),
  })) ?? [];
}
