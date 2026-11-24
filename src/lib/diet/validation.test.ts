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
  test("maintenance ignores any adjustment the form sent", () => {
    assert.deepEqual(parseGoalInput({ goalMode: "maintenance", adjustmentKcal: "300" }), {
      ok: true,
      value: { goalMode: "maintenance", adjustmentKcal: 0, customCalorieKcal: null, customProteinG: null },
    });
  });

  test("deficit and surplus need one of the allowed adjustments", () => {
    assert.deepEqual(parseGoalInput({ goalMode: "deficit", adjustmentKcal: "400" }), {
      ok: true,
      value: { goalMode: "deficit", adjustmentKcal: 400, customCalorieKcal: null, customProteinG: null },
    });
    for (const bad of ["", "0", "150", "500", "abc"]) {
      const result = parseGoalInput({ goalMode: "surplus", adjustmentKcal: bad });
      assert.ok(!result.ok, bad);
      assert.ok(result.errors.adjustmentKcal, bad);
    }
  });

  test("goal mode is required", () => {
    for (const bad of [undefined, "", "bulk"]) {
      const result = parseGoalInput({ goalMode: bad });
      assert.ok(!result.ok);
      assert.ok(result.errors.goalMode);
    }
  });

  test("custom targets are optional whole numbers within sane bounds", () => {
    assert.deepEqual(parseGoalInput({ goalMode: "maintenance", customCalorieKcal: "1800", customProteinG: "0" }), {
      ok: true,
      value: { goalMode: "maintenance", adjustmentKcal: 0, customCalorieKcal: 1800, customProteinG: 0 },
    });
    const result = parseGoalInput({ goalMode: "maintenance", customCalorieKcal: "0", customProteinG: "120.5" });
    assert.ok(!result.ok);
    assert.deepEqual(Object.keys(result.errors).sort(), ["customCalorieKcal", "customProteinG"]);
    assert.ok(!parseGoalInput({ goalMode: "maintenance", customCalorieKcal: "10001" }).ok);
  });
});
