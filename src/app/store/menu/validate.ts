import { componentTypeEnum, nutritionSourceEnum } from "@/db/schema";
import { isUuid } from "@/lib/menu";

export class MenuInputError extends Error {}

function invalid(message: string): never {
  throw new MenuInputError(message);
}

function text(value: unknown, max: number, required = false) {
  if (typeof value !== "string") return invalid("메뉴 입력값을 확인해 주세요.");
  const trimmed = value.trim();
  if (trimmed.length > max || (required && !trimmed)) return invalid("메뉴, 재료, 옵션 이름을 확인해 주세요.");
  return trimmed;
}

function numeric(value: unknown, min: number, max: number, integer = false) {
  const input = text(value, 25, true);
  const parsed = Number(input);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max || (integer && !Number.isInteger(parsed))) {
    return invalid("가격과 영양 정보의 숫자 범위를 확인해 주세요.");
  }
  return parsed;
}

function choice<T extends string>(choices: readonly T[], value: unknown): T {
  const found = choices.find((option) => option === value);
  return found ?? invalid("영양 출처 또는 재료 종류를 확인해 주세요.");
}

function nutrition(value: unknown, label: unknown, min: number, max: number) {
  const source = choice(nutritionSourceEnum.enumValues, label);
  if (text(value, 25) === "") return { value: null, source: "unavailable" as const };
  if (source === "unavailable") return invalid("영양 정보가 있다면 출처를 선택해 주세요.");
  return { value: numeric(value, min, max), source };
}

function optionalId(value: unknown) {
  if (value === undefined) return undefined;
  return isUuid(value) ? value : invalid("메뉴 편집 화면을 다시 열어 주세요.");
}

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid("재료와 옵션을 확인해 주세요.");
  return value as Record<string, unknown>;
}

export function parseMenu(form: FormData) {
  const kcal = nutrition(form.get("kcal"), form.get("kcalSource"), 0, 100000);
  const protein = nutrition(form.get("protein"), form.get("proteinSource"), 0, 10000);
  const price = text(form.get("price"), 25);
  const menu = {
    name: text(form.get("name"), 160, true),
    category: text(form.get("category"), 80) || null,
    description: text(form.get("description"), 2000) || null,
    basePriceKrw: price ? numeric(price, 0, 10000000, true) : null,
    baseKcal: kcal.value, kcalSource: kcal.source,
    baseProteinG: protein.value, proteinSource: protein.source,
    isAvailable: form.get("available") === "on",
  };

  let raw: unknown;
  try {
    raw = JSON.parse(text(form.get("components"), 180000, true));
  } catch {
    return invalid("재료와 옵션을 확인해 주세요.");
  }
  if (!Array.isArray(raw) || raw.length > 100) return invalid("재료 목록을 확인해 주세요.");
  const components = raw.map((value: unknown, sortOrder) => {
    const component = record(value);
    if (!Array.isArray(component.levels) || component.levels.length === 0 || component.levels.length > 100) {
      return invalid("각 재료에 한 개 이상의 옵션을 추가해 주세요.");
    }
    const levels = component.levels.map((entry: unknown) => {
      const level = record(entry);
      const isDefault = level.isDefault === true;
      const kcal = isDefault ? { value: 0, source: "calculated" as const } : nutrition(level.kcal, level.kcalSource, -100000, 100000);
      const protein = isDefault ? { value: 0, source: "calculated" as const } : nutrition(level.protein, level.proteinSource, -10000, 10000);
      return {
        id: optionalId(level.id), label: text(level.label, 80, true), isDefault,
        priceDeltaKrw: isDefault ? 0 : numeric(level.price, -10000000, 10000000, true),
        kcalDelta: kcal.value, kcalSource: kcal.source,
        proteinDeltaG: protein.value, proteinSource: protein.source,
      };
    });
    if (levels.filter((level) => level.isDefault).length !== 1) return invalid("재료마다 기본 옵션을 한 개 선택해 주세요.");
    return {
      id: optionalId(component.id), name: text(component.name, 100, true),
      type: choice(componentTypeEnum.enumValues, component.type), sortOrder, levels,
    };
  });

  if (
    (menu.basePriceKrw !== null && menu.basePriceKrw + components.reduce((sum, c) => sum + Math.min(...c.levels.map((l) => l.priceDeltaKrw)), 0) < 0) ||
    (menu.baseKcal !== null && menu.baseKcal + components.reduce((sum, c) => sum + Math.min(...c.levels.map((l) => l.kcalDelta ?? 0)), 0) < 0) ||
    (menu.baseProteinG !== null && menu.baseProteinG + components.reduce((sum, c) => sum + Math.min(...c.levels.map((l) => l.proteinDeltaG ?? 0)), 0) < 0)
  ) return invalid("옵션을 적용한 가격과 영양 총량은 0 이상이어야 합니다.");

  return { menu, components };
}
