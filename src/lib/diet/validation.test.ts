import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseGoalInput, parseProfileInput } from "./validation";

describe("parseProfileInput", () => {
  test("accepts a full profile from form strings", () => {
    assert.deepEqual(
      parseProfileInput({ heightCm: "172.5", weightKg: " 68 ", age: "21", sex: "female", activityLevel: "light" }),
      { ok: true, value: { heightCm: 172.5, weightKg: 68, age: 21, sex: "female", activityLevel: "light" } },
    );
  });

  test("blank fields become null", () => {
    assert.deepEqual(parseProfileInput({ heightCm: "", weightKg: "  ", sex: "" }), {
      ok: true,
      value: { heightCm: null, weightKg: null, age: null, sex: null, activityLevel: null },
    });
  });

  test("uses the same ranges as the database checks", () => {
    assert.ok(parseProfileInput({ heightCm: "50", weightKg: "400", age: "120" }).ok);
    assert.ok(parseProfileInput({ heightCm: "300", weightKg: "20", age: "10" }).ok);
    const result = parseProfileInput({ heightCm: "49.9", weightKg: "400.1", age: "9" });
    assert.ok(!result.ok);
    assert.deepEqual(Object.keys(result.errors).sort(), ["age", "heightCm", "weightKg"]);
    assert.equal(result.errors.heightCm, "50~300 사이로 입력해 주세요.");
  });

  test("rejects anything that isn't a plain number", () => {
    for (const bad of ["abc", "-70", "+70", "7e1", "70kg", "1,700", "70.", ".5", "0x46", "Infinity"]) {
      const result = parseProfileInput({ weightKg: bad });
      assert.ok(!result.ok, bad);
      assert.ok(result.errors.weightKg, bad);
    }
    const notString = parseProfileInput({ weightKg: 70 });
    assert.ok(!notString.ok);
  });

  test("age must be a whole number", () => {
    const result = parseProfileInput({ age: "20.5" });
    assert.ok(!result.ok);
    assert.equal(result.errors.age, "정수로 입력해 주세요.");
  });

  test("sex and activity level must be one of the enum values", () => {
    const result = parseProfileInput({ sex: "other", activityLevel: "extreme" });
    assert.ok(!result.ok);
    assert.deepEqual(Object.keys(result.errors).sort(), ["activityLevel", "sex"]);
    assert.ok(parseProfileInput({ activityLevel: "very_active" }).ok);
  });
});

describe("parseGoalInput", () => {
  const calculated = { calorieSource: "calculated", proteinSource: "calculated" };

  test("maintenance ignores any adjustment the form sent", () => {
    assert.deepEqual(parseGoalInput({ goalMode: "maintenance", adjustmentKcal: "300", ...calculated }), {
      ok: true,
      value: { goalMode: "maintenance", adjustmentKcal: 0, calorie: { source: "calculated" }, protein: { source: "calculated" } },
    });
  });

  test("deficit and surplus need one of the allowed adjustments", () => {
    assert.deepEqual(parseGoalInput({ goalMode: "deficit", adjustmentKcal: "400", ...calculated }), {
      ok: true,
      value: { goalMode: "deficit", adjustmentKcal: 400, calorie: { source: "calculated" }, protein: { source: "calculated" } },
    });
    for (const bad of ["", "0", "150", "500", "abc"]) {
      const result = parseGoalInput({ goalMode: "surplus", adjustmentKcal: bad, ...calculated });
      assert.ok(!result.ok, bad);
      assert.ok(result.errors.adjustmentKcal, bad);
    }
  });

  test("goal mode is required", () => {
    for (const bad of [undefined, "", "bulk"]) {
      const result = parseGoalInput({ goalMode: bad, ...calculated });
      assert.ok(!result.ok);
      assert.ok(result.errors.goalMode);
    }
  });

  test("each target is either calculated or a typed-in whole number", () => {
    assert.deepEqual(parseGoalInput({
      goalMode: "maintenance", calorieSource: "custom", customCalorieKcal: "1800", proteinSource: "custom", customProteinG: "0",
    }), {
      ok: true,
      value: { goalMode: "maintenance", adjustmentKcal: 0, calorie: { source: "custom", value: 1800 }, protein: { source: "custom", value: 0 } },
    });
  });

  test("calorie and protein can use different sources", () => {
    const result = parseGoalInput({ goalMode: "maintenance", calorieSource: "custom", customCalorieKcal: "2000", proteinSource: "calculated" });
    assert.ok(result.ok);
    assert.deepEqual([result.value.calorie, result.value.protein], [{ source: "custom", value: 2000 }, { source: "calculated" }]);
  });

  test("a calculated target ignores the number box, even if it holds garbage", () => {
    const result = parseGoalInput({ goalMode: "maintenance", ...calculated, customCalorieKcal: "abc", customProteinG: "-5" });
    assert.ok(result.ok);
  });

  test("a custom target needs a value within sane bounds", () => {
    const blank = parseGoalInput({ goalMode: "maintenance", calorieSource: "custom", customCalorieKcal: " ", proteinSource: "calculated" });
    assert.ok(!blank.ok);
    assert.equal(blank.errors.customCalorieKcal, "직접 입력할 값을 적어 주세요.");
    const result = parseGoalInput({
      goalMode: "maintenance", calorieSource: "custom", customCalorieKcal: "0", proteinSource: "custom", customProteinG: "120.5",
    });
    assert.ok(!result.ok);
    assert.deepEqual(Object.keys(result.errors).sort(), ["customCalorieKcal", "customProteinG"]);
    assert.ok(!parseGoalInput({ goalMode: "maintenance", calorieSource: "custom", customCalorieKcal: "10001", proteinSource: "calculated" }).ok);
  });

  test("the source must be one of the two choices", () => {
    const result = parseGoalInput({ goalMode: "maintenance", calorieSource: "auto", proteinSource: undefined });
    assert.ok(!result.ok);
    assert.deepEqual(Object.keys(result.errors).sort(), ["calorieSource", "proteinSource"]);
  });
});
