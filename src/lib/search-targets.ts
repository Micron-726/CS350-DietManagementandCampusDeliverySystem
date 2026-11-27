import type { DayTotals } from "@/lib/diet/meals";
import type { GoalRow } from "@/lib/diet/rows";

export type RemainingTargets = { kcal?: number; protein?: number };

/**
 * What is left of today's goal, used to prefill a meal search (home page → /search).
 * A nutrient that is already met, or has no goal, is left out.
 */
export function remainingTargets(goal: GoalRow | null, totals: DayTotals): RemainingTargets {
  if (!goal) return {};
  const kcal = Math.round((goal.calorie_target_kcal - totals.kcal) / 10) * 10;
  const protein = Math.round(goal.protein_target_g - totals.proteinG);
  return {
    kcal: kcal > 0 ? kcal : undefined,
    protein: protein > 0 ? protein : undefined,
  };
}

/** Query string for /search/results from the remaining targets, or null when nothing is left. */
export function remainingSearchHref(remaining: RemainingTargets): string | null {
  const params = new URLSearchParams();
  if (remaining.kcal) params.set("kcal", String(remaining.kcal));
  if (remaining.protein) params.set("protein", String(remaining.protein));
  return params.size ? `/search/results?${params}` : null;
}
