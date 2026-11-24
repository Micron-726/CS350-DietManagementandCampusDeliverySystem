"use server";

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { dateInKorea } from "@/lib/korea-date";
import { dietClient, goalTargets, hasCalculatedTarget, loadGoalOn, saveGoalVersion } from "@/lib/diet/data";
import { recalculateTargets, recommendTargets } from "@/lib/diet/goals";
import { type FieldErrors, type ProfileField, parseProfileInput } from "@/lib/diet/validation";

export type ProfileState = {
  /** Bumped on every successful save so the form can show a fresh status message. */
  savedAt: number | null;
  error: string | null;
  fieldErrors: FieldErrors<ProfileField>;
  /** Result of the optional goal recalculation. */
  goalNotice: string | null;
};

const fields: ProfileField[] = ["heightCm", "weightKg", "age", "sex", "activityLevel"];

/**
 * FR-02: save height, weight, age, sex and activity level.
 * If the user ticked "목표도 새 추천값으로 바꾸기", also recalculate today's goal. Only targets whose
 * source is "calculated" change; targets the user typed in are never recalculated.
 */
export async function saveProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const account = await requireAccount("customer");
  const parsed = parseProfileInput(Object.fromEntries(fields.map((field) => [field, form.get(field)])));
  if (!parsed.ok) {
    return { savedAt: null, error: "입력한 값을 확인해 주세요.", fieldErrors: parsed.errors, goalNotice: null };
  }

  const profile = parsed.value;
  const supabase = await dietClient();
  const { error } = await supabase.from("profiles").update({
    height_cm: profile.heightCm,
    weight_kg: profile.weightKg,
    age: profile.age,
    sex: profile.sex,
    activity_level: profile.activityLevel,
  }).eq("id", account.id);
  if (error) {
    console.error("saveProfile failed", error);
    return { savedAt: null, error: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", fieldErrors: {}, goalNotice: null };
  }

  const goalNotice = form.get("recalculate") === "on" ? await recalculateGoal(account.id, profile) : null;

  revalidatePath("/profile");
  revalidatePath("/goals");
  revalidatePath("/");
  return { savedAt: Date.now(), error: null, fieldErrors: {}, goalNotice };
}

async function recalculateGoal(userId: string, profile: Parameters<typeof recommendTargets>[0]): Promise<string> {
  const supabase = await dietClient();
  const today = dateInKorea();
  const { data: goal, error } = await loadGoalOn(supabase, userId, today);
  if (error) return "프로필은 저장했지만 목표를 불러오지 못해 다시 계산하지 않았습니다.";
  if (!goal) return "설정된 목표가 없어 다시 계산하지 않았습니다.";
  if (!hasCalculatedTarget(goal)) return "직접 입력한 목표는 다시 계산하지 않습니다.";

  const recommendation = recommendTargets(profile, goal.goal_mode, goal.adjustment_kcal);
  if (!recommendation.ok) {
    return recommendation.reason === "incomplete_profile"
      ? "프로필이 모두 입력되지 않아 목표를 다시 계산하지 않았습니다."
      : "이 프로필로는 추천 목표를 계산할 수 없어 목표를 그대로 두었습니다. 목표 화면에서 직접 입력할 수 있습니다.";
  }

  const { targets, changed } = recalculateTargets(goalTargets(goal), recommendation.value);
  if (!changed) return "추천 목표가 지금과 같아 바꾸지 않았습니다.";

  const { error: saveError } = await saveGoalVersion(supabase, userId, today, {
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
    return "프로필은 저장했지만 목표를 바꾸지 못했습니다. 목표 화면에서 다시 시도해 주세요.";
  }
  return "오늘부터 새 추천 목표를 적용했습니다.";
}
