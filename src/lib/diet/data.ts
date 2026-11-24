import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database, TablesInsert } from "@/lib/supabase/database.types";
import { type ProfileFields, recalculateTargets, recommendTargets } from "./goals";
import { goalTargets, hasCalculatedTarget } from "./rows";

export type { GoalRow, ProfileRow } from "./rows";
export { goalTargets, hasCalculatedTarget } from "./rows";

/**
 * Data access for personal diet data. Everything goes through supabase-js with the user's session,
 * so row-level security limits every query to the signed-in user's own rows (NFR-05), even if a
 * filter were forgotten. Call `requireAccount("customer")` before using these.
 */

export type DietClient = SupabaseClient<Database>;

/** The shared server client, typed with the generated database types. */
export async function dietClient(): Promise<DietClient> {
  return (await createClient()) as unknown as DietClient;
}

export async function loadProfile(supabase: DietClient, userId: string) {
  return supabase.from("profiles")
    .select("height_cm, weight_kg, age, sex, activity_level")
    .eq("id", userId)
    .single();
}

/** FR-11: the goal for `date` is the version with the latest effective_from on or before it. */
export async function loadGoalOn(supabase: DietClient, userId: string, date: string) {
  return supabase.from("diet_goals")
    .select("*")
    .eq("user_id", userId)
    .lte("effective_from", date)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
}

type GoalVersionRow = Omit<TablesInsert<"diet_goals">, "id" | "user_id" | "effective_from" | "created_at" | "updated_at">;

/** Save the goal that applies from `date` on. Saving twice on the same day replaces that day's version. */
export async function saveGoalVersion(supabase: DietClient, userId: string, date: string, goal: GoalVersionRow) {
  return supabase.from("diet_goals")
    .upsert({ ...goal, user_id: userId, effective_from: date }, { onConflict: "user_id,effective_from" });
}

export type RecalculateResult = { changed: boolean; message: string };

/**
 * Decision C/D: put the current recommendation into the goal that applies on `date`, as a new
 * version from `date` on. Only "calculated" targets change; custom targets are never recalculated.
 */
export async function recalculateGoal(
  supabase: DietClient,
  userId: string,
  date: string,
  profile: ProfileFields,
): Promise<RecalculateResult> {
  const { data: goal, error } = await loadGoalOn(supabase, userId, date);
  if (error) return { changed: false, message: "목표를 불러오지 못해 다시 계산하지 않았습니다." };
  if (!goal) return { changed: false, message: "설정된 목표가 없어 다시 계산하지 않았습니다." };
  if (!hasCalculatedTarget(goal)) return { changed: false, message: "직접 입력한 목표는 다시 계산하지 않습니다." };

  const recommendation = recommendTargets(profile, goal.goal_mode, goal.adjustment_kcal);
  if (!recommendation.ok) {
    return {
      changed: false,
      message: recommendation.reason === "incomplete_profile"
        ? "신체 정보가 모두 입력되지 않아 목표를 다시 계산하지 않았습니다."
        : "이 신체 정보로는 추천 목표를 계산할 수 없어 목표를 그대로 두었습니다. 목표 화면에서 직접 입력할 수 있습니다.",
    };
  }

  const { targets, changed } = recalculateTargets(goalTargets(goal), recommendation.value);
  if (!changed) return { changed: false, message: "추천 목표가 지금과 같아 바꾸지 않았습니다." };

  const { error: saveError } = await saveGoalVersion(supabase, userId, date, {
    goal_mode: goal.goal_mode,
    adjustment_kcal: goal.adjustment_kcal,
    recommended_kcal: recommendation.value.calorieKcal,
    recommended_protein_g: recommendation.value.proteinG,
    calorie_target_kcal: targets.calorieTargetKcal,
    calorie_target_source: targets.calorieTargetSource,
    protein_target_g: targets.proteinTargetG,
    protein_target_source: targets.proteinTargetSource,
  });
  if (saveError) {
    console.error("recalculateGoal failed", saveError);
    return { changed: false, message: "목표를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  return { changed: true, message: "오늘부터 새 추천 목표를 적용했습니다." };
}
