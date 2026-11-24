import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { dayTotals, editedSource, enteredSource, isIsoDate, isTime, koreaTimestamp, resolveDiaryDate, shiftDate, timeInKorea } from "./meals";
import { parseMealInput } from "./validation";

describe("dates and times", () => {
  test("isIsoDate accepts only real calendar dates", () => {
    for (const ok of ["2026-11-25", "2024-02-29", "2026-12-31"]) assert.equal(isIsoDate(ok), true, ok);
    for (const bad of ["2026-02-29", "2026-13-01", "2026-11-31", "2026-1-5", "20261125", "", null, 20261125]) {
      assert.equal(isIsoDate(bad), false, String(bad));
    }
  });

  test("isTime accepts 24-hour HH:MM", () => {
    for (const ok of ["00:00", "09:05", "23:59"]) assert.equal(isTime(ok), true, ok);
    for (const bad of ["24:00", "9:05", "12:60", "12:00:00", ""]) assert.equal(isTime(bad), false, bad);
  });

  test("shiftDate crosses month and year ends", () => {
    assert.equal(shiftDate("2026-11-30", 1), "2026-12-01");
    assert.equal(shiftDate("2026-12-31", 1), "2027-01-01");
    assert.equal(shiftDate("2026-03-01", -1), "2026-02-28");
  });

  test("resolveDiaryDate falls back to today for missing, invalid or future dates", () => {
    const today = "2026-11-25";
    assert.equal(resolveDiaryDate("2026-11-20", today), "2026-11-20");
    assert.equal(resolveDiaryDate(today, today), today);
    for (const bad of [undefined, "", "yesterday", "2026-11-26", ["2026-11-20"]]) assert.equal(resolveDiaryDate(bad, today), today);
  });

  test("koreaTimestamp and timeInKorea use +09:00", () => {
    const stamp = koreaTimestamp("2026-11-25", "00:30");
    assert.equal(stamp, "2026-11-25T00:30:00+09:00");
    assert.equal(new Date(stamp).toISOString(), "2026-11-24T15:30:00.000Z"); // still the 24th in UTC
    assert.equal(timeInKorea(stamp), "00:30");
    assert.equal(timeInKorea("2026-11-25T14:59:00Z"), "23:59");
  });
});

test("dayTotals sums known values and counts unknown ones (dashboard rule)", () => {
  assert.deepEqual(dayTotals([
    { kcal: 650, proteinG: 32.5 },
    { kcal: null, proteinG: 10 },
    { kcal: 140, proteinG: null },
  ]), { kcal: 790, proteinG: 42.5, kcalMissing: 1, proteinMissing: 1, count: 3 });
  assert.deepEqual(dayTotals([]), { kcal: 0, proteinG: 0, kcalMissing: 0, proteinMissing: 0, count: 0 });
});

describe("nutrition sources (OR-03/04)", () => {
  test("a new entry is 'user', or 'unavailable' when blank", () => {
    assert.equal(enteredSource(500), "user");
    assert.equal(enteredSource(0), "user");
    assert.equal(enteredSource(null), "unavailable");
  });

  test("editing keeps the source only when the value is unchanged", () => {
    assert.equal(editedSource({ value: 650, source: "provider" }, 650), "provider");
    assert.equal(editedSource({ value: 650, source: "provider" }, 600), "user");
    assert.equal(editedSource({ value: 650, source: "provider" }, null), "unavailable");
    assert.equal(editedSource({ value: null, source: "unavailable" }, 300), "user");
    assert.equal(editedSource({ value: null, source: "unavailable" }, null), "unavailable");
  });
});

describe("parseMealInput", () => {
  const now = { date: "2026-11-25", time: "12:30" };
  const valid = { name: " 치킨 덮밥 ", date: "2026-11-25", time: "12:00", mealType: "lunch", kcal: "650", proteinG: "32.5" };

  test("accepts a full entry and trims the name", () => {
    assert.deepEqual(parseMealInput(valid, now), {
      ok: true,
      value: { name: "치킨 덮밥", date: "2026-11-25", time: "12:00", mealType: "lunch", kcal: 650, proteinG: 32.5 },
    });
  });

  test("calories, protein and meal type may be blank (FR-13)", () => {
    const result = parseMealInput({ ...valid, mealType: "", kcal: "", proteinG: " " }, now);
    assert.ok(result.ok);
    assert.deepEqual([result.value.mealType, result.value.kcal, result.value.proteinG], [null, null, null]);
  });

  test("name is required and limited to 100 characters", () => {
    for (const name of ["", "   ", undefined]) {
      const result = parseMealInput({ ...valid, name }, now);
      assert.ok(!result.ok);
      assert.equal(result.errors.name, "음식 이름을 입력해 주세요.");
    }
    assert.ok(parseMealInput({ ...valid, name: "가".repeat(100) }, now).ok);
    assert.ok(!parseMealInput({ ...valid, name: "가".repeat(101) }, now).ok);
  });

  test("no future dates, and no future times today", () => {
    const tomorrow = parseMealInput({ ...valid, date: "2026-11-26" }, now);
    assert.ok(!tomorrow.ok);
    assert.equal(tomorrow.errors.date, "오늘 이후 날짜에는 기록할 수 없습니다.");
    const later = parseMealInput({ ...valid, time: "12:31" }, now);
    assert.ok(!later.ok);
    assert.ok(later.errors.time);
    assert.ok(parseMealInput({ ...valid, time: "12:30" }, now).ok);
    assert.ok(parseMealInput({ ...valid, date: "2026-11-24", time: "23:59" }, now).ok);
  });

  test("rejects malformed dates, times and meal types", () => {
    const result = parseMealInput({ ...valid, date: "2026-02-30", time: "25:00", mealType: "brunch" }, now);
    assert.ok(!result.ok);
    assert.deepEqual(Object.keys(result.errors).sort(), ["date", "mealType", "time"]);
  });

  test("nutrition values are non-negative decimals within per-entry bounds", () => {
    assert.ok(parseMealInput({ ...valid, kcal: "0", proteinG: "0" }, now).ok);
    const result = parseMealInput({ ...valid, kcal: "10000.5", proteinG: "-1" }, now);
    assert.ok(!result.ok);
    assert.deepEqual(Object.keys(result.errors).sort(), ["kcal", "proteinG"]);
  });
});
