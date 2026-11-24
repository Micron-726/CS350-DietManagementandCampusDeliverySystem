"use server";

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { dateInKorea } from "@/lib/korea-date";
import { dietClient, recalculateGoal } from "@/lib/diet/data";
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

  const goalNotice = form.get("recalculate") === "on"
    ? (await recalculateGoal(supabase, account.id, dateInKorea(), profile)).message
    : null;

  revalidatePath("/profile");
  revalidatePath("/goals");
  revalidatePath("/");
  return { savedAt: Date.now(), error: null, fieldErrors: {}, goalNotice };
}
