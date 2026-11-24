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

type ProfileFields = { [K in keyof BodyProfile]: BodyProfile[K] | null | undefined };

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

export type RecommendationResult =
  | { ok: true; value: Recommendation }
  | { ok: false; reason: "incomplete_profile" | "invalid_adjustment" | "non_positive_calories" };

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
