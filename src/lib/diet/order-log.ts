import type { orderItems } from "@/db/schema";

/**
 * Turning a confirmed order into ONE food-log entry (FR-15), using the existing schema only.
 *
 * - The entry links to the order through `meal_logs.order_item_id`, set to the order's
 *   representative item (smallest item id). The unique index on that column then allows one
 *   entry per order. The full item list is read back from `order_items` (an immutable snapshot).
 * - Each line shows per-unit calories/protein and the quantity; the entry's own kcal/protein is the
 *   order total, so the dashboard sums stay correct.
 * - Unknown values are skipped in the total and reported as `missing` (shown as
 *   "일부 메뉴 영양 정보 없음").
 */

export type OrderLine = Pick<
  typeof orderItems.$inferSelect,
  "id" | "name" | "quantity" | "kcal" | "kcalSource" | "proteinG" | "proteinSource"
>;
export type NutritionSource = OrderLine["kcalSource"];

export type NutrientTotal = {
  /** Sum of the known values × quantity. null when no line has a value. */
  value: number | null;
  /**
   * - every line known, one source → that source
   * - every line known, mixed sources → "calculated" (the system added them up)
   * - some lines unknown → "estimated" (a partial sum)
   * - no line known → "unavailable"
   */
  source: NutritionSource;
  /** Number of lines whose value is unknown. */
  missing: number;
};

/** The order item the food-log entry links to. Deterministic, so every check picks the same one. */
export function representativeItemId(lines: readonly Pick<OrderLine, "id">[]): string | null {
  return lines.reduce<string | null>((min, { id }) => (min === null || id < min ? id : min), null);
}

export function sumNutrient(
  lines: readonly OrderLine[],
  pick: (line: OrderLine) => { value: number | null; source: NutritionSource },
): NutrientTotal {
  let value: number | null = null;
  let missing = 0;
  const sources = new Set<NutritionSource>();
  for (const line of lines) {
    const nutrient = pick(line);
    if (nutrient.value === null) {
      missing += 1;
      continue;
    }
    value = (value ?? 0) + nutrient.value * line.quantity;
    sources.add(nutrient.source);
  }
  const source: NutritionSource = value === null
    ? "unavailable"
    : missing > 0
      ? "estimated"
      : sources.size === 1 ? [...sources][0] : "calculated";
  return { value, source, missing };
}

export type OrderLogSummary = {
  /** Value for `meal_logs.order_item_id`. */
  linkItemId: string;
  /** Lines as stored: per-unit values + quantity. */
  lines: OrderLine[];
  kcal: NutrientTotal;
  protein: NutrientTotal;
};

/** null for an order without items (can't be logged). */
export function summarizeOrder(lines: readonly OrderLine[]): OrderLogSummary | null {
  const linkItemId = representativeItemId(lines);
  if (linkItemId === null) return null;
  return {
    linkItemId,
    lines: [...lines],
    kcal: sumNutrient(lines, (line) => ({ value: line.kcal, source: line.kcalSource })),
    protein: sumNutrient(lines, (line) => ({ value: line.proteinG, source: line.proteinSource })),
  };
}
