import { type GoalMode, type GoalTargets, type ProfileFields, recalculateTargets, recommendTargets } from "./goals";
import { kcalNumber } from "./labels";

/** The goal fields a recalculation needs. */
export type GoalContext = { goalMode: GoalMode; adjustmentKcal: number; targets: GoalTargets };

/**
 * Decision C/D: what would change if the goal were recalculated from `profile`, as
 * "칼로리 2,594 → 2,294 kcal, 단백질 104 → 96 g". null when nothing would change (no goal, only
 * custom targets, no recommendation possible, or same numbers).
 */
export function recalculationChange(goal: GoalContext | null, profile: ProfileFields): string | null {
  if (!goal) return null;
  const recommendation = recommendTargets(profile, goal.goalMode, goal.adjustmentKcal);
  if (!recommendation.ok) return null;
  const { targets, changed } = recalculateTargets(goal.targets, recommendation.value);
  if (!changed) return null;

  const parts: string[] = [];
  if (targets.calorieTargetKcal !== goal.targets.calorieTargetKcal) {
    parts.push(`칼로리 ${kcalNumber.format(goal.targets.calorieTargetKcal)} → ${kcalNumber.format(targets.calorieTargetKcal)} kcal`);
  }
  if (targets.proteinTargetG !== goal.targets.proteinTargetG) {
    parts.push(`단백질 ${kcalNumber.format(goal.targets.proteinTargetG)} → ${kcalNumber.format(targets.proteinTargetG)} g`);
  }
  return parts.join(", ");
}
