"use server";

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { dateInKorea } from "@/lib/korea-date";
import { isUuid } from "@/lib/menu";
import { dietClient } from "@/lib/diet/data";
import { editedSource, enteredSource, koreaTimestamp, timeInKorea } from "@/lib/diet/meals";
import { type FieldErrors, type MealField, parseMealInput } from "@/lib/diet/validation";

export type MealState = { savedAt: number | null; error: string | null; fieldErrors: FieldErrors<MealField> };
export type DeleteState = { error: string | null };

const fields: MealField[] = ["name", "date", "time", "mealType", "kcal", "proteinG"];

function parse(form: FormData) {
  return parseMealInput(
    Object.fromEntries(fields.map((field) => [field, form.get(field)])),
    { date: dateInKorea(), time: timeInKorea() },
  );
}

function revalidateDiary() {
  revalidatePath("/diary");
  revalidatePath("/");
  revalidatePath("/orders"); // an order's "식사 기록에 추가" state depends on its entry
}

const invalid = (fieldErrors: FieldErrors<MealField>): MealState => ({ savedAt: null, error: "입력한 값을 확인해 주세요.", fieldErrors });
const failed = (error: string): MealState => ({ savedAt: null, error, fieldErrors: {} });

/** FR-12/13: add a food entry typed in by the user. */
export async function addMeal(_prev: MealState, form: FormData): Promise<MealState> {
  const account = await requireAccount("customer");
  const parsed = parse(form);
  if (!parsed.ok) return invalid(parsed.errors);

  const meal = parsed.value;
  const supabase = await dietClient();
  const { error } = await supabase.from("meal_logs").insert({
    user_id: account.id,
    log_date: meal.date,
    eaten_at: koreaTimestamp(meal.date, meal.time),
    meal_type: meal.mealType,
    name: meal.name,
    kcal: meal.kcal,
    kcal_source: enteredSource(meal.kcal),
    protein_g: meal.proteinG,
    protein_source: enteredSource(meal.proteinG),
    source: "manual",
  });
  if (error) {
    console.error("addMeal failed", error);
    return failed("기록하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  revalidateDiary();
  return { savedAt: Date.now(), error: null, fieldErrors: {} };
}

/** FR-14: edit an entry. A nutrition value the user changes becomes "user" (OR-04). */
export async function updateMeal(mealId: string, _prev: MealState, form: FormData): Promise<MealState> {
  const account = await requireAccount("customer");
  if (!isUuid(mealId)) return failed("기록을 찾을 수 없습니다.");
  const parsed = parse(form);
  if (!parsed.ok) return invalid(parsed.errors);

  const supabase = await dietClient();
  const { data: before, error: loadError } = await supabase.from("meal_logs")
    .select("kcal, kcal_source, protein_g, protein_source")
    .eq("id", mealId).eq("user_id", account.id).maybeSingle();
  if (loadError) return failed("기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  if (!before) return failed("기록을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.");

  const meal = parsed.value;
  const { data: updated, error } = await supabase.from("meal_logs").update({
    log_date: meal.date,
    eaten_at: koreaTimestamp(meal.date, meal.time),
    meal_type: meal.mealType,
    name: meal.name,
    kcal: meal.kcal,
    kcal_source: editedSource({ value: before.kcal, source: before.kcal_source }, meal.kcal),
    protein_g: meal.proteinG,
    protein_source: editedSource({ value: before.protein_g, source: before.protein_source }, meal.proteinG),
  }).eq("id", mealId).eq("user_id", account.id).select("id");
  if (error) {
    console.error("updateMeal failed", error);
    return failed("수정하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (!updated.length) return failed("기록을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.");
  revalidateDiary();
  return { savedAt: Date.now(), error: null, fieldErrors: {} };
}

/** FR-14: delete an entry. */
export async function deleteMeal(mealId: string): Promise<DeleteState> {
  const account = await requireAccount("customer");
  if (!isUuid(mealId)) return { error: "기록을 찾을 수 없습니다." };
  const supabase = await dietClient();
  const { data, error } = await supabase.from("meal_logs").delete().eq("id", mealId).eq("user_id", account.id).select("id");
  if (error) {
    console.error("deleteMeal failed", error);
    return { error: "삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  if (!data.length) return { error: "기록을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다." };
  revalidateDiary();
  return { error: null };
}
