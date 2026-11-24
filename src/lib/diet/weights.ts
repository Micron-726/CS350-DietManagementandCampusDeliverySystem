import { shiftDate } from "./meals";

/**
 * Weight log helpers (FR-16..18). Pure. A record is a timestamp + kg; several per day are allowed
 * and each is plotted as its own point.
 */

export type WeightPoint = { recordedAt: string; weightKg: number };

export const WEIGHT_RANGES = ["30d", "90d", "all"] as const;
export type WeightRange = (typeof WEIGHT_RANGES)[number];
export const DEFAULT_WEIGHT_RANGE: WeightRange = "90d";

const RANGE_DAYS: Record<Exclude<WeightRange, "all">, number> = { "30d": 30, "90d": 90 };

/** First Korean calendar day inside the range ending today (inclusive), or null for "all". */
export function rangeStart(range: WeightRange, today: string): string | null {
  return range === "all" ? null : shiftDate(today, -(RANGE_DAYS[range] - 1));
}

const koreaDay = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" });

/** Points for the chart: inside the range, oldest first, with a numeric time axis. */
export function chartPoints(records: readonly WeightPoint[], range: WeightRange, today: string) {
  const start = rangeStart(range, today);
  return records
    .filter(({ recordedAt }) => start === null || koreaDay.format(new Date(recordedAt)) >= start)
    .map(({ recordedAt, weightKg }) => ({ time: new Date(recordedAt).getTime(), weightKg }))
    .sort((a, b) => a.time - b.time);
}

/** The most recent record, or null. */
export function latestRecord<T extends WeightPoint>(records: readonly T[]): T | null {
  return records.reduce<T | null>(
    (latest, record) => (!latest || new Date(record.recordedAt) > new Date(latest.recordedAt) ? record : latest),
    null,
  );
}

/** Decision B: offer "이 체중을 프로필에 반영" only when the latest record differs from the profile. */
export function differsFromProfile(latest: WeightPoint | null, profileWeightKg: number | null): latest is WeightPoint {
  return latest !== null && latest.weightKg !== profileWeightKg;
}
