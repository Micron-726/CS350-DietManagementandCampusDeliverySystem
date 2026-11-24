import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseWeightInput } from "./validation";
import { chartPoints, differsFromProfile, latestRecord, rangeStart } from "./weights";

const today = "2026-11-25";
const records = [
  { recordedAt: "2026-11-25T08:00:00+09:00", weightKg: 65 },
  { recordedAt: "2026-11-25T21:30:00+09:00", weightKg: 65.4 }, // twice on one day
  { recordedAt: "2026-10-27T00:10:00+09:00", weightKg: 66 }, // day 30 counted back from today
  { recordedAt: "2026-10-26T23:59:00+09:00", weightKg: 66.2 }, // day 31
  { recordedAt: "2026-06-01T09:00:00+09:00", weightKg: 68 },
];

describe("ranges", () => {
  test("rangeStart counts today as the first day", () => {
    assert.equal(rangeStart("30d", today), "2026-10-27");
    assert.equal(rangeStart("90d", today), "2026-08-28");
    assert.equal(rangeStart("all", today), null);
  });

  test("chartPoints filters by Korean day and sorts oldest first", () => {
    assert.deepEqual(chartPoints(records, "30d", today).map(({ weightKg }) => weightKg), [66, 65, 65.4]);
    assert.deepEqual(chartPoints(records, "90d", today).map(({ weightKg }) => weightKg), [66.2, 66, 65, 65.4]);
    assert.deepEqual(chartPoints(records, "all", today).map(({ weightKg }) => weightKg), [68, 66.2, 66, 65, 65.4]);
  });

  test("a record just after midnight in Korea belongs to that Korean day (UTC is still the day before)", () => {
    const [point] = chartPoints([{ recordedAt: "2026-10-27T00:10:00+09:00", weightKg: 66 }], "30d", today);
    assert.equal(point.time, Date.parse("2026-10-26T15:10:00Z"));
  });
});

test("latestRecord and differsFromProfile", () => {
  const latest = latestRecord(records);
  assert.deepEqual(latest, { recordedAt: "2026-11-25T21:30:00+09:00", weightKg: 65.4 });
  assert.equal(latestRecord([]), null);
  assert.equal(differsFromProfile(latest, 65), true);
  assert.equal(differsFromProfile(latest, null), true);
  assert.equal(differsFromProfile(latest, 65.4), false);
  assert.equal(differsFromProfile(null, 65), false);
});

describe("parseWeightInput", () => {
  const now = { date: today, time: "12:00" };
  const valid = { weightKg: "65.3", date: today, time: "07:30" };

  test("accepts up to one decimal within 20–400 kg", () => {
    assert.deepEqual(parseWeightInput(valid, now), { ok: true, value: { weightKg: 65.3, date: today, time: "07:30" } });
    assert.ok(parseWeightInput({ ...valid, weightKg: "20" }, now).ok);
    assert.ok(parseWeightInput({ ...valid, weightKg: "400" }, now).ok);
  });

  test("rejects blank, longer decimals, other formats and out-of-range values", () => {
    const cases: [string, string][] = [
      ["", "체중을 입력해 주세요."],
      ["65.35", "소수 첫째 자리까지 숫자로 입력해 주세요."],
      ["65kg", "소수 첫째 자리까지 숫자로 입력해 주세요."],
      ["-65", "소수 첫째 자리까지 숫자로 입력해 주세요."],
      ["19.9", "20~400 사이로 입력해 주세요."],
      ["400.1", "20~400 사이로 입력해 주세요."],
    ];
    for (const [weightKg, message] of cases) {
      const result = parseWeightInput({ ...valid, weightKg }, now);
      assert.ok(!result.ok, weightKg);
      assert.equal(result.errors.weightKg, message, weightKg);
    }
  });

  test("no future date or time", () => {
    const tomorrow = parseWeightInput({ ...valid, date: "2026-11-26" }, now);
    assert.ok(!tomorrow.ok);
    assert.ok(tomorrow.errors.date);
    const later = parseWeightInput({ ...valid, time: "12:01" }, now);
    assert.ok(!later.ok);
    assert.ok(later.errors.time);
  });
});
