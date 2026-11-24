import type { Tables } from "@/lib/supabase/database.types";
import type { GoalTargets, ProfileFields } from "./goals";

/** Row ↔ calculation-input mappers. Types only, so client components can use them too. */

export type ProfileRow = Pick<Tables<"profiles">, "height_cm" | "weight_kg" | "age" | "sex" | "activity_level">;
export type GoalRow = Tables<"diet_goals">;

export function profileFields(row: ProfileRow): ProfileFields {
  return { heightCm: row.height_cm, weightKg: row.weight_kg, age: row.age, sex: row.sex, activityLevel: row.activity_level };
}

export function goalTargets(goal: GoalRow): GoalTargets {
  return {
    calorieTargetKcal: goal.calorie_target_kcal,
    calorieTargetSource: goal.calorie_target_source,
    proteinTargetG: goal.protein_target_g,
    proteinTargetSource: goal.protein_target_source,
  };
}

export function hasCalculatedTarget(goal: Pick<GoalRow, "calorie_target_source" | "protein_target_source">) {
  return goal.calorie_target_source === "calculated" || goal.protein_target_source === "calculated";
}
