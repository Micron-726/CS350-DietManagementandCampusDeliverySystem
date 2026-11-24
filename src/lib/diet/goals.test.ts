import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ACTIVITY_FACTORS,
  type BodyProfile,
  bmrKcal,
  buildGoalVersion,
  completeProfile,
  isValidAdjustment,
  maintenanceKcal,
  missingProfileFields,
  recalculateTargets,
  recommendTargets,
  type GoalTargets,
} from "./goals";

const man: BodyProfile = { heightCm: 175, weightKg: 70, age: 25, sex: "male", activityLevel: "moderate" };
const woman: BodyProfile = { heightCm: 165, weightKg: 60, age: 30, sex: "female", activityLevel: "sedentary" };

describe("Mifflin-St Jeor", () => {
  test("BMR uses +5 for men and -161 for women", () => {
    assert.equal(bmrKcal(man), 10 * 70 + 6.25 * 175 - 5 * 25 + 5); // 1673.75
    assert.equal(bmrKcal(woman), 10 * 60 + 6.25 * 165 - 5 * 30 - 161); // 1320.25
  });

  test("activity factors match the agreed values", () => {
    assert.deepEqual(ACTIVITY_FACTORS, { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 });
  });

  test("maintenance = BMR × activity factor", () => {
    assert.equal(maintenanceKcal(man), 1673.75 * 1.55);
    for (const [level, factor] of Object.entries(ACTIVITY_FACTORS)) {
      assert.equal(maintenanceKcal({ ...woman, activityLevel: level as BodyProfile["activityLevel"] }), 1320.25 * factor);
    }
  });
});

describe("recommendTargets", () => {
  test("maintenance keeps maintenance calories, rounded once at the end", () => {
    assert.deepEqual(recommendTargets(man, "maintenance", 0), {
      ok: true,
      value: { bmrKcal: 1674, maintenanceKcal: 2594, calorieKcal: 2594, proteinG: 112 },
    });
  });

  test("deficit subtracts and surplus adds the adjustment", () => {
    const deficit = recommendTargets(man, "deficit", 300);
    assert.ok(deficit.ok);
    assert.equal(deficit.value.calorieKcal, Math.round(1673.75 * 1.55 - 300)); // 2294
    const surplus = recommendTargets(woman, "surplus", 200);
    assert.ok(surplus.ok);
    assert.equal(surplus.value.calorieKcal, Math.round(1320.25 * 1.2 + 200)); // 1784
  });

  test("protein is body weight × 1.6 g, independent of the goal mode", () => {
    for (const [mode, adjustment] of [["deficit", 400], ["maintenance", 0], ["surplus", 100]] as const) {
      const result = recommendTargets(woman, mode, adjustment);
      assert.ok(result.ok);
      assert.equal(result.value.proteinG, 96);
    }
    const result = recommendTargets({ ...man, weightKg: 62.4 }, "maintenance", 0);
    assert.ok(result.ok);
    assert.equal(result.value.proteinG, 100); // 99.84 → 100
  });

  test("needs every profile field", () => {
    for (const field of ["heightCm", "weightKg", "age", "sex", "activityLevel"] as const) {
      assert.deepEqual(recommendTargets({ ...man, [field]: null }, "maintenance", 0), { ok: false, reason: "incomplete_profile" });
    }
  });

  test("rejects adjustments the database would reject", () => {
    assert.deepEqual(recommendTargets(man, "maintenance", 100), { ok: false, reason: "invalid_adjustment" });
    assert.deepEqual(recommendTargets(man, "deficit", 0), { ok: false, reason: "invalid_adjustment" });
    assert.deepEqual(recommendTargets(man, "surplus", 150), { ok: false, reason: "invalid_adjustment" });
    assert.deepEqual(recommendTargets(man, "deficit", 500), { ok: false, reason: "invalid_adjustment" });
  });

  test("never recommends zero or negative calories", () => {
    // Smallest values the profile checks allow: BMR is negative here.
    const tiny: BodyProfile = { heightCm: 50, weightKg: 20, age: 120, sex: "female", activityLevel: "sedentary" };
    assert.deepEqual(recommendTargets(tiny, "deficit", 400), { ok: false, reason: "non_positive_calories" });
    assert.deepEqual(recommendTargets(tiny, "maintenance", 0), { ok: false, reason: "non_positive_calories" });
  });
});

test("completeProfile", () => {
  assert.deepEqual(completeProfile(man), man);
  assert.equal(completeProfile({ ...man, age: undefined }), null);
  assert.deepEqual(completeProfile({ ...man, age: 0 }), { ...man, age: 0 }); // 0 is a value, not "missing"
});

test("isValidAdjustment", () => {
  assert.equal(isValidAdjustment("maintenance", 0), true);
  for (const value of [100, 200, 300, 400]) {
    assert.equal(isValidAdjustment("deficit", value), true);
    assert.equal(isValidAdjustment("surplus", value), true);
    assert.equal(isValidAdjustment("maintenance", value), false);
  }
  for (const value of [0, 50, 250, 500, -100]) assert.equal(isValidAdjustment("deficit", value), false);
});

describe("recalculateTargets", () => {
  const recommendation = { calorieKcal: 2100, proteinG: 110 };

  test("replaces calculated targets", () => {
    const current: GoalTargets = { calorieTargetKcal: 2000, calorieTargetSource: "calculated", proteinTargetG: 100, proteinTargetSource: "calculated" };
    assert.deepEqual(recalculateTargets(current, recommendation), {
      targets: { ...current, calorieTargetKcal: 2100, proteinTargetG: 110 },
      changed: true,
    });
  });

  test("never touches custom targets", () => {
    const current: GoalTargets = { calorieTargetKcal: 1800, calorieTargetSource: "custom", proteinTargetG: 150, proteinTargetSource: "custom" };
    assert.deepEqual(recalculateTargets(current, recommendation), { targets: current, changed: false });
  });

  test("handles calorie and protein separately", () => {
    const current: GoalTargets = { calorieTargetKcal: 1800, calorieTargetSource: "custom", proteinTargetG: 100, proteinTargetSource: "calculated" };
    assert.deepEqual(recalculateTargets(current, recommendation), {
      targets: { ...current, proteinTargetG: 110 },
      changed: true,
    });
  });

  test("reports no change when the recommendation is the same", () => {
    const current: GoalTargets = { calorieTargetKcal: 2100, calorieTargetSource: "calculated", proteinTargetG: 110, proteinTargetSource: "calculated" };
    assert.equal(recalculateTargets(current, recommendation).changed, false);
  });
});

test("missingProfileFields lists empty fields in form order", () => {
  assert.deepEqual(missingProfileFields(man), []);
  assert.deepEqual(missingProfileFields({ ...man, activityLevel: null, heightCm: undefined }), ["heightCm", "activityLevel"]);
});

describe("buildGoalVersion", () => {
  const calculated = { source: "calculated" } as const;

  test("uses the recommendation for calculated targets and keeps it as recommended_*", () => {
    assert.deepEqual(buildGoalVersion({ goalMode: "deficit", adjustmentKcal: 300, calorie: calculated, protein: calculated }, man), {
      ok: true,
      value: {
        goalMode: "deficit", adjustmentKcal: 300, recommendedKcal: 2294, recommendedProteinG: 112,
        calorieTargetKcal: 2294, calorieTargetSource: "calculated", proteinTargetG: 112, proteinTargetSource: "calculated",
      },
    });
  });

  test("custom targets win, but the recommendation is still recorded", () => {
    const result = buildGoalVersion({
      goalMode: "maintenance", adjustmentKcal: 0, calorie: { source: "custom", value: 2000 }, protein: calculated,
    }, man);
    assert.ok(result.ok);
    assert.deepEqual(result.value, {
      goalMode: "maintenance", adjustmentKcal: 0, recommendedKcal: 2594, recommendedProteinG: 112,
      calorieTargetKcal: 2000, calorieTargetSource: "custom", proteinTargetG: 112, proteinTargetSource: "calculated",
    });
  });

  test("an incomplete profile works when both targets are custom, without recommended_*", () => {
    const result = buildGoalVersion({
      goalMode: "surplus", adjustmentKcal: 200, calorie: { source: "custom", value: 2500 }, protein: { source: "custom", value: 120 },
    }, { ...man, sex: null });
    assert.ok(result.ok);
    assert.equal(result.value.recommendedKcal, null);
    assert.equal(result.value.recommendedProteinG, null);
    assert.equal(result.value.calorieTargetKcal, 2500);
  });

  test("fails and names the targets that need a value when nothing can be recommended", () => {
    assert.deepEqual(
      buildGoalVersion({ goalMode: "maintenance", adjustmentKcal: 0, calorie: { source: "custom", value: 1800 }, protein: calculated }, { ...man, age: null }),
      { ok: false, reason: "incomplete_profile", targets: ["protein"] },
    );
    const tiny = { heightCm: 50, weightKg: 20, age: 120, sex: "female", activityLevel: "sedentary" } as const;
    assert.deepEqual(
      buildGoalVersion({ goalMode: "deficit", adjustmentKcal: 400, calorie: calculated, protein: calculated }, tiny),
      { ok: false, reason: "non_positive_calories", targets: ["calorie", "protein"] },
    );
  });
});
