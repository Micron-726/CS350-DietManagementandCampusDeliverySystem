import type { orderItems } from "@/db/schema";

/**
 * Turning a confirmed order into ONE food-log entry (FR-15), using the existing schema only.
 *
 * - The entry links to the order through `meal_logs.order_item_id`, set to the order's
 *   representative item (smallest item id). The unique index on that column then allows one
 *   entry per order. The full item list is read back from `order_items` (an immutable snapshot).
 * - Each line shows per-unit calories/protein and the quantity; the entry's own kcal/protein is the
 *   order total, so the dashboard sums stay correct.
 * - Totals follow the team's menu rule (`totalNutrient` in `src/lib/menu.ts`): if any line's value
 *   is unknown, the whole total is unknown. The checkout already stores order totals the same way.
 */

export type OrderLine = Pick<
  typeof orderItems.$inferSelect,
  "id" | "name" | "quantity" | "kcal" | "kcalSource" | "proteinG" | "proteinSource"
>;
export type NutritionSource = OrderLine["kcalSource"];

export type NutrientTotal = {
  /** Sum of value × quantity. null as soon as one line is unknown. */
  value: number | null;
  /**
   * Same merge as `totalNutrient` in `src/lib/menu.ts`:
   * - any line unknown → "unavailable"
   * - an "estimated" or "user" value involved → "estimated"
   * - otherwise one source → that source; mixed or "calculated" → "calculated"
   */
  source: NutritionSource;
  /** Number of lines whose value is unknown (shown per line as "정보 없음"). */
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
  const nutrients = lines.map(pick);
  const missing = nutrients.filter(({ value, source }) => value === null || source === "unavailable").length;
  if (missing > 0 || nutrients.length === 0) return { value: null, source: "unavailable", missing };

  let value = 0;
  let source: NutritionSource = nutrients[0].source;
  for (const [index, nutrient] of nutrients.entries()) {
    value += nutrient.value! * lines[index].quantity; // not null: checked above
    if (index === 0) continue;
    if (source === "estimated" || nutrient.source === "estimated" || nutrient.source === "user") source = "estimated";
    else if (nutrient.source === "calculated" || source !== nutrient.source) source = "calculated";
  }
  return { value, source, missing: 0 };
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

/* ───────────── order → food-log entry (FR-15) ───────────── */

/** FR-15/FR-34: only an order the provider confirmed (or that was then completed) can be logged. */
export const LOGGABLE_ORDER_STATUSES = ["confirmed", "completed"] as const;
export function isLoggableStatus(status: string): boolean {
  return (LOGGABLE_ORDER_STATUSES as readonly string[]).includes(status);
}

export type OrderForLog = {
  restaurantName: string;
  status: string;
  confirmedAt: Date | null;
  createdAt: Date;
  items: readonly OrderLine[];
};

export type OrderLogEntry = {
  name: string;
  /** When the provider confirmed the order (decision 3); falls back to the order time. */
  eatenAt: Date;
  linkItemId: string;
  kcal: NutrientTotal;
  protein: NutrientTotal;
};

/** Values for the single food-log entry of an order, or why it can't be logged. */
export function orderLogEntry(order: OrderForLog):
  | { ok: true; value: OrderLogEntry }
  | { ok: false; reason: "not_confirmed" | "no_items" } {
  if (!isLoggableStatus(order.status)) return { ok: false, reason: "not_confirmed" };
  const summary = summarizeOrder(order.items);
  if (!summary) return { ok: false, reason: "no_items" };
  return {
    ok: true,
    value: {
      name: `${order.restaurantName} 주문`,
      eatenAt: order.confirmedAt ?? order.createdAt,
      linkItemId: summary.linkItemId,
      kcal: summary.kcal,
      protein: summary.protein,
    },
  };
}
