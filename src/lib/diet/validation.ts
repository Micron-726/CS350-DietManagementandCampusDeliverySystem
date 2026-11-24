import {
  ACTIVITY_FACTORS,
  type ActivityLevel,
  type AdjustmentKcal,
  type GoalMode,
  isValidAdjustment,
  type Sex,
  type TargetChoice,
} from "./goals";

/**
 * Input validation for the profile and goal forms (NFR-07). Runs on the server before anything is
 * stored. Ranges match the database check constraints, so a value that passes here is accepted
 * by the database too. Messages are user-facing (NFR-17).
 */

export type FieldErrors<K extends string> = Partial<Record<K, string>>;
export type Parsed<T, K extends string> = { ok: true; value: T } | { ok: false; errors: FieldErrors<K> };

/** Same bounds as profiles_*_range checks. */
export const PROFILE_LIMITS = {
  heightCm: { min: 50, max: 300 },
  weightKg: { min: 20, max: 400 },
  age: { min: 10, max: 120 },
} as const;

/** Sanity bounds for targets the user types in (FR-05). The database only requires kcal > 0. */
export const CUSTOM_TARGET_LIMITS = {
  calorieKcal: { min: 1, max: 10000 },
  proteinG: { min: 0, max: 1000 },
} as const;

const SEXES: readonly Sex[] = ["male", "female"];
const ACTIVITY_LEVELS = Object.keys(ACTIVITY_FACTORS) as ActivityLevel[];
const GOAL_MODES: readonly GoalMode[] = ["deficit", "maintenance", "surplus"];

const DECIMAL = /^\d+(\.\d+)?$/;
const INTEGER = /^\d+$/;

type NumberRule = { min: number; max: number; integer?: boolean };

/** Blank → null. Otherwise a plain decimal ("170", "62.5") within the range. No signs, no exponents. */
function parseNumber(raw: unknown, rule: NumberRule): { value: number | null } | { error: string } {
  const text = typeof raw === "string" ? raw.trim() : raw == null ? "" : null;
  if (text === null) return { error: "숫자를 입력해 주세요." };
  if (text === "") return { value: null };
  if (!(rule.integer ? INTEGER : DECIMAL).test(text)) {
    return { error: rule.integer ? "정수로 입력해 주세요." : "숫자로 입력해 주세요." };
  }
  const value = Number(text);
  if (value < rule.min || value > rule.max) return { error: `${rule.min}~${rule.max} 사이로 입력해 주세요.` };
  return { value };
}

function parseChoice<T extends string>(raw: unknown, choices: readonly T[]): { value: T | null } | { error: string } {
  if (raw == null || raw === "") return { value: null };
  return typeof raw === "string" && (choices as readonly string[]).includes(raw)
    ? { value: raw as T }
    : { error: "목록에서 선택해 주세요." };
}

/* ───────────────────────────── Profile (FR-02) ───────────────────────────── */

export type ProfileInput = {
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
  sex: Sex | null;
  activityLevel: ActivityLevel | null;
};
export type ProfileField = keyof ProfileInput;

/** Every field may be left blank (stored as null); a blank profile just can't get a recommendation. */
export function parseProfileInput(raw: Partial<Record<ProfileField, unknown>>): Parsed<ProfileInput, ProfileField> {
  const results = {
    heightCm: parseNumber(raw.heightCm, PROFILE_LIMITS.heightCm),
    weightKg: parseNumber(raw.weightKg, PROFILE_LIMITS.weightKg),
    age: parseNumber(raw.age, { ...PROFILE_LIMITS.age, integer: true }),
    sex: parseChoice(raw.sex, SEXES),
    activityLevel: parseChoice(raw.activityLevel, ACTIVITY_LEVELS),
  };
  return collect<ProfileInput, ProfileField>(results);
}

/* ───────────────────────────── Goal (FR-03..07) ───────────────────────────── */

export type GoalInput = {
  goalMode: GoalMode;
  adjustmentKcal: AdjustmentKcal;
  calorie: TargetChoice;
  protein: TargetChoice;
};
/** Form field names. `*Source` is "calculated" (use the recommendation) or "custom". */
export type GoalField = "goalMode" | "adjustmentKcal" | "calorieSource" | "customCalorieKcal" | "proteinSource" | "customProteinG";

/** A custom target needs a value; a calculated one ignores whatever is in the number box. */
function parseTarget(
  source: unknown,
  value: unknown,
  rule: NumberRule,
): { value: TargetChoice } | { sourceError: string } | { valueError: string } {
  if (source === "calculated") return { value: { source: "calculated" } };
  if (source !== "custom") return { sourceError: "추천값 사용 또는 직접 입력을 선택해 주세요." };
  const parsed = parseNumber(value, rule);
  if ("error" in parsed) return { valueError: parsed.error };
  if (parsed.value === null) return { valueError: "직접 입력할 값을 적어 주세요." };
  return { value: { source: "custom", value: parsed.value } };
}

export function parseGoalInput(raw: Partial<Record<GoalField, unknown>>): Parsed<GoalInput, GoalField> {
  const errors: FieldErrors<GoalField> = {};

  const mode = parseChoice(raw.goalMode, GOAL_MODES);
  const goalMode = "value" in mode ? mode.value : null;
  if (!goalMode) errors.goalMode = "error" in mode ? mode.error : "목표 유형을 선택해 주세요.";

  // Maintenance has no adjustment; ignore whatever the form sent.
  let adjustmentKcal: AdjustmentKcal = 0;
  if (goalMode && goalMode !== "maintenance") {
    const adjustment = parseNumber(raw.adjustmentKcal, { min: 0, max: 400, integer: true });
    const value = "value" in adjustment ? adjustment.value : null;
    if (value !== null && isValidAdjustment(goalMode, value)) adjustmentKcal = value;
    else errors.adjustmentKcal = "조정량은 100, 200, 300, 400 kcal 중에서 선택해 주세요.";
  }

  const calorie = parseTarget(raw.calorieSource, raw.customCalorieKcal, { ...CUSTOM_TARGET_LIMITS.calorieKcal, integer: true });
  if ("sourceError" in calorie) errors.calorieSource = calorie.sourceError;
  if ("valueError" in calorie) errors.customCalorieKcal = calorie.valueError;
  const protein = parseTarget(raw.proteinSource, raw.customProteinG, { ...CUSTOM_TARGET_LIMITS.proteinG, integer: true });
  if ("sourceError" in protein) errors.proteinSource = protein.sourceError;
  if ("valueError" in protein) errors.customProteinG = protein.valueError;

  if (!goalMode || !("value" in calorie) || !("value" in protein) || Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { goalMode, adjustmentKcal, calorie: calorie.value, protein: protein.value } };
}

/* ───────────────────────────── helpers ───────────────────────────── */

function collect<T, K extends string & keyof T>(
  results: Record<K, { value: unknown } | { error: string }>,
): Parsed<T, K> {
  const errors: FieldErrors<K> = {};
  const value = {} as Record<K, unknown>;
  for (const key of Object.keys(results) as K[]) {
    const result = results[key];
    if ("error" in result) errors[key] = result.error;
    else value[key] = result.value;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: value as T };
}
