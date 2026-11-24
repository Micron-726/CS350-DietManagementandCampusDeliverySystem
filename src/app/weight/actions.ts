"use server";

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { dateInKorea } from "@/lib/korea-date";
import { isUuid } from "@/lib/menu";
import { dietClient, loadProfile, loadWeights, recalculateGoal } from "@/lib/diet/data";
import { koreaTimestamp, shiftDate, timeInKorea } from "@/lib/diet/meals";
import { profileFields } from "@/lib/diet/rows";
import { type FieldErrors, type WeightField, parseWeightInput } from "@/lib/diet/validation";
import { latestRecord } from "@/lib/diet/weights";

/** Records already on the date the user is adding to; the form asks whether to overwrite them. */
export type SameDayConflict = { date: string; records: { weightKg: number; time: string }[] };
export type WeightState = {
  savedAt: number | null;
  error: string | null;
  fieldErrors: FieldErrors<WeightField>;
  conflict?: SameDayConflict | null;
};
export type DeleteState = { error: string | null };
export type ApplyState = { savedAt: number | null; error: string | null; goalNotice: string | null };

const fields: WeightField[] = ["weightKg", "date", "time"];

function parse(form: FormData) {
  return parseWeightInput(
    Object.fromEntries(fields.map((field) => [field, form.get(field)])),
    { date: dateInKorea(), time: timeInKorea() },
  );
}

/** Weight records never change the profile on their own (decision B), so only /weight changes. */
function revalidateWeight() {
  revalidatePath("/weight");
}

const invalid = (fieldErrors: FieldErrors<WeightField>): WeightState => ({ savedAt: null, error: "입력한 값을 확인해 주세요.", fieldErrors });
const failed = (error: string): WeightState => ({ savedAt: null, error, fieldErrors: {} });
const notFound = "기록을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.";

/**
 * FR-16: record a body weight with date and time.
 * If the (Korean) date already has a record, nothing is saved and the records are returned as
 * `conflict`; the form then asks "덮어씌우시겠습니까?". Sending `overwrite=yes` replaces every record
 * of that date with the new one. The new record is inserted first, so a failure never loses data.
 */
export async function addWeight(_prev: WeightState, form: FormData): Promise<WeightState> {
  const account = await requireAccount("customer");
  const parsed = parse(form);
  if (!parsed.ok) return invalid(parsed.errors);
  const { date, time, weightKg } = parsed.value;

  const supabase = await dietClient();
  const { data: sameDay, error: loadError } = await supabase.from("weight_logs")
    .select("id, recorded_at, weight_kg")
    .eq("user_id", account.id)
    .gte("recorded_at", koreaTimestamp(date, "00:00"))
    .lt("recorded_at", koreaTimestamp(shiftDate(date, 1), "00:00"))
    .order("recorded_at");
  if (loadError) return failed("기록을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  if (sameDay.length && form.get("overwrite") !== "yes") {
    return {
      savedAt: null, error: null, fieldErrors: {},
      conflict: { date, records: sameDay.map((row) => ({ weightKg: row.weight_kg, time: timeInKorea(row.recorded_at) })) },
    };
  }

  const { data: inserted, error } = await supabase.from("weight_logs").insert({
    user_id: account.id,
    recorded_at: koreaTimestamp(date, time),
    weight_kg: weightKg,
  }).select("id").single();
  if (error) {
    console.error("addWeight failed", error);
    return failed("기록하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (sameDay.length) {
    const { error: deleteError } = await supabase.from("weight_logs").delete()
      .eq("user_id", account.id).in("id", sameDay.map((row) => row.id)).neq("id", inserted.id);
    if (deleteError) {
      console.error("addWeight overwrite failed", deleteError);
      revalidateWeight();
      return failed("새 기록은 저장했지만 같은 날짜의 이전 기록을 지우지 못했습니다. 목록에서 직접 삭제해 주세요.");
    }
  }
  revalidateWeight();
  return { savedAt: Date.now(), error: null, fieldErrors: {} };
}

/** FR-17: edit a weight record. */
export async function updateWeight(weightId: string, _prev: WeightState, form: FormData): Promise<WeightState> {
  const account = await requireAccount("customer");
  if (!isUuid(weightId)) return failed(notFound);
  const parsed = parse(form);
  if (!parsed.ok) return invalid(parsed.errors);

  const supabase = await dietClient();
  const { data, error } = await supabase.from("weight_logs").update({
    recorded_at: koreaTimestamp(parsed.value.date, parsed.value.time),
    weight_kg: parsed.value.weightKg,
  }).eq("id", weightId).eq("user_id", account.id).select("id");
  if (error) {
    console.error("updateWeight failed", error);
    return failed("수정하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (!data.length) return failed(notFound);
  revalidateWeight();
  return { savedAt: Date.now(), error: null, fieldErrors: {} };
}

/** FR-17: delete a weight record. */
export async function deleteWeight(weightId: string): Promise<DeleteState> {
  const account = await requireAccount("customer");
  if (!isUuid(weightId)) return { error: notFound };
  const supabase = await dietClient();
  const { data, error } = await supabase.from("weight_logs").delete().eq("id", weightId).eq("user_id", account.id).select("id");
  if (error) {
    console.error("deleteWeight failed", error);
    return { error: "삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  if (!data.length) return { error: notFound };
  revalidateWeight();
  return { error: null };
}

/**
 * Decision B: "이 체중을 프로필에 반영" — copy the LATEST record (read from the database, not the
 * form) into profiles.weight_kg. Same as editing the profile, so the optional
 * "목표도 새 추천값으로 바꾸기" choice applies; custom targets are never recalculated.
 */
export async function applyWeightToProfile(_prev: ApplyState, form: FormData): Promise<ApplyState> {
  const account = await requireAccount("customer");
  const supabase = await dietClient();
  const [weights, profile] = await Promise.all([loadWeights(supabase, account.id), loadProfile(supabase, account.id)]);
  if (weights.error || profile.error) {
    return { savedAt: null, error: "정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", goalNotice: null };
  }
  const latest = latestRecord(weights.data.map((row) => ({ recordedAt: row.recorded_at, weightKg: row.weight_kg })));
  if (!latest) return { savedAt: null, error: "반영할 체중 기록이 없습니다.", goalNotice: null };

  const { error } = await supabase.from("profiles").update({ weight_kg: latest.weightKg }).eq("id", account.id);
  if (error) {
    console.error("applyWeightToProfile failed", error);
    return { savedAt: null, error: "프로필에 반영하지 못했습니다. 잠시 후 다시 시도해 주세요.", goalNotice: null };
  }

  const goalNotice = form.get("recalculate") === "on"
    ? (await recalculateGoal(supabase, account.id, dateInKorea(), { ...profileFields(profile.data), weightKg: latest.weightKg })).message
    : null;

  revalidatePath("/weight");
  revalidatePath("/profile");
  revalidatePath("/goals");
  revalidatePath("/diary");
  revalidatePath("/");
  return { savedAt: Date.now(), error: null, goalNotice };
}
