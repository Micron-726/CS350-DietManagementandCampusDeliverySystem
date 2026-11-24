import type { mealLogs } from "@/db/schema";

/**
 * Food log helpers (FR-12..14, FR-38). Pure functions; dates are calendar days in Korea
 * ("YYYY-MM-DD") and times are "HH:MM" in Korea, matching `dateInKorea()`.
 */

type MealLog = typeof mealLogs.$inferSelect;
export type NutritionSource = MealLog["kcalSource"];
export type MealType = NonNullable<MealLog["mealType"]>;

export const MEAL_TYPES: readonly MealType[] = ["breakfast", "lunch", "dinner", "snack"];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** A real calendar date in "YYYY-MM-DD" form (rejects 2026-02-30). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function isTime(value: unknown): value is string {
  return typeof value === "string" && TIME.test(value);
}

/** "2026-11-25" + 1 → "2026-11-26". */
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** The day to show: the requested date if it is valid and not in the future, otherwise today. */
export function resolveDiaryDate(requested: unknown, today: string): string {
  return isIsoDate(requested) && requested <= today ? requested : today;
}

/** Korean wall-clock date + time → ISO timestamp with the +09:00 offset (stored as timestamptz). */
export function koreaTimestamp(date: string, time: string): string {
  return `${date}T${time}:00+09:00`;
}

const timeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
/** "HH:MM" in Korea for an instant (default: now). */
export function timeInKorea(instant: Date | string = new Date()): string {
  return timeFormat.format(new Date(instant));
}

export type DayTotals = {
  kcal: number;
  proteinG: number;
  /** Entries whose value is unknown and therefore not in the sum. */
  kcalMissing: number;
  proteinMissing: number;
  count: number;
};

/**
 * Day totals for the dashboard. Unlike a single menu's nutrition (where one unknown part makes the
 * whole value unknown), a day is many separate entries: known values are summed and the entries
 * with unknown values are counted so the screen can say so.
 */
export function dayTotals(logs: readonly { kcal: number | null; proteinG: number | null }[]): DayTotals {
  const totals: DayTotals = { kcal: 0, proteinG: 0, kcalMissing: 0, proteinMissing: 0, count: logs.length };
  for (const { kcal, proteinG } of logs) {
    if (kcal === null) totals.kcalMissing += 1;
    else totals.kcal += kcal;
    if (proteinG === null) totals.proteinMissing += 1;
    else totals.proteinG += proteinG;
  }
  return totals;
}

/**
 * Source of a nutrition value after the user edits an entry (OR-03/04): blank → "unavailable";
 * unchanged → keep the old source (e.g. "provider" from an order); changed → "user".
 */
export function editedSource(before: { value: number | null; source: NutritionSource }, after: number | null): NutritionSource {
  if (after === null) return "unavailable";
  if (before.value !== null && before.value === after) return before.source;
  return "user";
}

/** Source for a value typed into a new entry. */
export function enteredSource(value: number | null): NutritionSource {
  return value === null ? "unavailable" : "user";
}
