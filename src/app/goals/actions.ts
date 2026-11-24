"use server";

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { dateInKorea } from "@/lib/korea-date";
import { dietClient, loadProfile, recalculateGoal, saveGoalVersion } from "@/lib/diet/data";
import { buildGoalVersion } from "@/lib/diet/goals";
import { profileFields } from "@/lib/diet/rows";
import { type FieldErrors, type GoalField, parseGoalInput } from "@/lib/diet/validation";

export type GoalState = {
  savedAt: number | null;
  error: string | null;
  fieldErrors: FieldErrors<GoalField>;
};

const fields: GoalField[] = ["goalMode", "adjustmentKcal", "calorieSource", "customCalorieKcal", "proteinSource", "customProteinG"];

function revalidateGoalPages() {
  revalidatePath("/goals");
  revalidatePath("/profile");
  revalidatePath("/");
}

/** FR-03..07: save the goal form as the version that applies from today. */
export async function saveGoal(_prev: GoalState, form: FormData): Promise<GoalState> {
  const account = await requireAccount("customer");
  const parsed = parseGoalInput(Object.fromEntries(fields.map((field) => [field, form.get(field)])));
  if (!parsed.ok) return { savedAt: null, error: "입력한 값을 확인해 주세요.", fieldErrors: parsed.errors };

  const supabase = await dietClient();
  const profile = await loadProfile(supabase, account.id);
  if (profile.error) {
    return { savedAt: null, error: "신체 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", fieldErrors: {} };
  }

  const goal = buildGoalVersion(parsed.value, profileFields(profile.data));
  if (!goal.ok) {
    const message = goal.reason === "incomplete_profile"
      ? "신체 정보가 모두 입력되지 않아 추천값을 쓸 수 없습니다. 직접 입력해 주세요."
      : "이 신체 정보로는 추천값을 계산할 수 없습니다. 직접 입력해 주세요.";
    const fieldErrors: FieldErrors<GoalField> = {};
    if (goal.targets.includes("calorie")) fieldErrors.calorieSource = message;
    if (goal.targets.includes("protein")) fieldErrors.proteinSource = message;
    return { savedAt: null, error: message, fieldErrors };
  }

  const value = goal.value;
  const { error } = await saveGoalVersion(supabase, account.id, dateInKorea(), {
    goal_mode: value.goalMode,
    adjustment_kcal: value.adjustmentKcal,
    recommended_kcal: value.recommendedKcal,
    recommended_protein_g: value.recommendedProteinG,
    calorie_target_kcal: value.calorieTargetKcal,
    calorie_target_source: value.calorieTargetSource,
    protein_target_g: value.proteinTargetG,
    protein_target_source: value.proteinTargetSource,
  });
  if (error) {
    console.error("saveGoal failed", error);
    return { savedAt: null, error: "목표를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", fieldErrors: {} };
  }

  revalidateGoalPages();
  return { savedAt: Date.now(), error: null, fieldErrors: {} };
}

export type ApplyState = { message: string | null; changed: boolean };

/** Decision C: "새 추천값 적용" — recalculate the calculated targets from the saved profile. */
export async function applyRecommendation(): Promise<ApplyState> {
  const account = await requireAccount("customer");
  const supabase = await dietClient();
  const profile = await loadProfile(supabase, account.id);
  if (profile.error) return { message: "신체 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", changed: false };

  const result = await recalculateGoal(supabase, account.id, dateInKorea(), profileFields(profile.data));
  if (result.changed) revalidateGoalPages();
  return result;
}
