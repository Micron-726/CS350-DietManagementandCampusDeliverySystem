import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database, Tables, TablesInsert } from "@/lib/supabase/database.types";
import type { GoalTargets } from "./goals";

/**
 * Data access for personal diet data. Everything goes through supabase-js with the user's session,
 * so row-level security limits every query to the signed-in user's own rows (NFR-05), even if a
 * filter were forgotten. Call `requireAccount("customer")` before using these.
 */

export type DietClient = SupabaseClient<Database>;
export type ProfileRow = Pick<Tables<"profiles">, "height_cm" | "weight_kg" | "age" | "sex" | "activity_level">;
export type GoalRow = Tables<"diet_goals">;

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

type GoalVersion = Omit<TablesInsert<"diet_goals">, "id" | "user_id" | "effective_from" | "created_at" | "updated_at">;

/** Save the goal that applies from `date` on. Saving twice on the same day replaces that day's version. */
export async function saveGoalVersion(supabase: DietClient, userId: string, date: string, goal: GoalVersion) {
  return supabase.from("diet_goals")
    .upsert({ ...goal, user_id: userId, effective_from: date }, { onConflict: "user_id,effective_from" });
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
