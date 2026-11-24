import type { dietGoals, profiles } from "@/db/schema";

/**
 * Daily calorie/protein targets (FR-03..07). Pure functions, no I/O, so they can be tested
 * without the UI or the database (NFR-21).
 *
 * Calories = Mifflin-St Jeor BMR × activity factor ± goal adjustment.
 * Protein  = body weight × 1.6 g/kg.
 * Targets are rounded to whole kcal / g.
 */

type Profile = typeof profiles.$inferSelect;
type Goal = typeof dietGoals.$inferSelect;

export type Sex = NonNullable<Profile["sex"]>;
export type ActivityLevel = NonNullable<Profile["activityLevel"]>;
export type GoalMode = Goal["goalMode"];
export type TargetSource = Goal["calorieTargetSource"];

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** FR-07: daily adjustment for deficit/surplus. Maintenance is always 0. */
export const ADJUSTMENT_OPTIONS = [100, 200, 300, 400] as const;
export type AdjustmentKcal = 0 | (typeof ADJUSTMENT_OPTIONS)[number];

export const PROTEIN_G_PER_KG = 1.6;

/** Everything the recommendation needs. All fields present (see `completeProfile`). */
export type BodyProfile = {
  heightCm: number;
  weightKg: number;
  age: number;
  sex: Sex;
  activityLevel: ActivityLevel;
};

export type ProfileFields = { [K in keyof BodyProfile]: BodyProfile[K] | null | undefined };

const PROFILE_FIELDS = ["heightCm", "weightKg", "age", "sex", "activityLevel"] as const;

/** Fields the formula needs that are still empty, in form order. */
export function missingProfileFields(profile: ProfileFields): (keyof BodyProfile)[] {
  return PROFILE_FIELDS.filter((field) => profile[field] == null);
}

/** The profile as a `BodyProfile`, or null when any field the formula needs is missing. */
export function completeProfile(profile: ProfileFields): BodyProfile | null {
  const { heightCm, weightKg, age, sex, activityLevel } = profile;
  if (heightCm == null || weightKg == null || age == null || sex == null || activityLevel == null) return null;
  return { heightCm, weightKg, age, sex, activityLevel };
}

/** Mifflin-St Jeor basal metabolic rate, unrounded (kcal/day). */
export function bmrKcal({ heightCm, weightKg, age, sex }: Omit<BodyProfile, "activityLevel">): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
}

/** BMR × activity factor, unrounded (kcal/day). */
export function maintenanceKcal(profile: BodyProfile): number {
  return bmrKcal(profile) * ACTIVITY_FACTORS[profile.activityLevel];
}

/** Whether `adjustmentKcal` is allowed for `mode` (same rule as the `diet_goals_adjustment` check). */
export function isValidAdjustment(mode: GoalMode, adjustmentKcal: number): adjustmentKcal is AdjustmentKcal {
  return mode === "maintenance"
    ? adjustmentKcal === 0
    : (ADJUSTMENT_OPTIONS as readonly number[]).includes(adjustmentKcal);
}

/** Signed change to maintenance calories: minus for deficit, plus for surplus. */
export function signedAdjustment(mode: GoalMode, adjustmentKcal: AdjustmentKcal): number {
  return mode === "deficit" ? -adjustmentKcal : mode === "surplus" ? adjustmentKcal : 0;
}

export type Recommendation = {
  bmrKcal: number;
  maintenanceKcal: number;
  calorieKcal: number;
  proteinG: number;
};

export type RecommendationFailure = "incomplete_profile" | "invalid_adjustment" | "non_positive_calories";
export type RecommendationResult =
  | { ok: true; value: Recommendation }
  | { ok: false; reason: RecommendationFailure };

/**
 * FR-04: recommended daily targets from the profile and the chosen goal mode.
 * Fails instead of returning a target the database would reject (calorie target must be > 0).
 */
export function recommendTargets(
  profile: ProfileFields,
  mode: GoalMode,
  adjustmentKcal: number,
): RecommendationResult {
  const body = completeProfile(profile);
  if (!body) return { ok: false, reason: "incomplete_profile" };
  if (!isValidAdjustment(mode, adjustmentKcal)) return { ok: false, reason: "invalid_adjustment" };

  const maintenance = maintenanceKcal(body);
  const calorieKcal = Math.round(maintenance + signedAdjustment(mode, adjustmentKcal));
  if (calorieKcal <= 0) return { ok: false, reason: "non_positive_calories" };

  return {
    ok: true,
    value: {
      bmrKcal: Math.round(bmrKcal(body)),
      maintenanceKcal: Math.round(maintenance),
      calorieKcal,
      proteinG: Math.round(body.weightKg * PROTEIN_G_PER_KG),
    },
  };
}

export type GoalTargets = {
  calorieTargetKcal: number;
  calorieTargetSource: TargetSource;
  proteinTargetG: number;
  proteinTargetSource: TargetSource;
};

/** FR-05: per target, either the recommendation or a value the user typed in. */
export type TargetChoice = { source: "calculated" } | { source: "custom"; value: number };

export type GoalVersion = GoalTargets & {
  goalMode: GoalMode;
  adjustmentKcal: AdjustmentKcal;
  /** FR-04: what the system recommended, kept even when the user overrides it. null if not computable. */
  recommendedKcal: number | null;
  recommendedProteinG: number | null;
};

export type GoalVersionResult =
  | { ok: true; value: GoalVersion }
  | { ok: false; reason: RecommendationFailure; targets: ("calorie" | "protein")[] };

/**
 * The goal row to save from the goal form (FR-03..07). Fails when a target should use the
 * recommendation but none can be computed; `targets` names the targets that need a typed-in value.
 */
export function buildGoalVersion(
  input: { goalMode: GoalMode; adjustmentKcal: AdjustmentKcal; calorie: TargetChoice; protein: TargetChoice },
  profile: ProfileFields,
): GoalVersionResult {
  const recommendation = recommendTargets(profile, input.goalMode, input.adjustmentKcal);
  const needs = (["calorie", "protein"] as const).filter((target) => input[target].source === "calculated");
  if (!recommendation.ok && needs.length) return { ok: false, reason: recommendation.reason, targets: needs };

  const recommended = recommendation.ok ? recommendation.value : null;
  const pick = (choice: TargetChoice, value: number | undefined) =>
    choice.source === "custom" ? choice.value : value!; // value exists: checked above
  return {
    ok: true,
    value: {
      goalMode: input.goalMode,
      adjustmentKcal: input.adjustmentKcal,
      recommendedKcal: recommended?.calorieKcal ?? null,
      recommendedProteinG: recommended?.proteinG ?? null,
      calorieTargetKcal: pick(input.calorie, recommended?.calorieKcal),
      calorieTargetSource: input.calorie.source,
      proteinTargetG: pick(input.protein, recommended?.proteinG),
      proteinTargetSource: input.protein.source,
    },
  };
}

/**
 * Apply a new recommendation to an existing goal. Only targets whose source is "calculated" are
 * replaced; a target the user typed in ("custom") is never recalculated.
 */
export function recalculateTargets(
  current: GoalTargets,
  recommendation: Pick<Recommendation, "calorieKcal" | "proteinG">,
): { targets: GoalTargets; changed: boolean } {
  const targets: GoalTargets = {
    ...current,
    ...(current.calorieTargetSource === "calculated" && { calorieTargetKcal: recommendation.calorieKcal }),
    ...(current.proteinTargetSource === "calculated" && { proteinTargetG: recommendation.proteinG }),
  };
  const changed = targets.calorieTargetKcal !== current.calorieTargetKcal || targets.proteinTargetG !== current.proteinTargetG;
  return { targets, changed };
}
