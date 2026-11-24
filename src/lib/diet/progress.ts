/**
 * Dashboard ring state for one nutrient (FR-08..10). Pure; the rules are listed in
 * "6단계 상세" of the Part B plan:
 * - under: intake ≤ target (exactly the target is "met", still the under colour)
 * - over:  intake > target
 * No tolerance band and no dependence on the goal mode.
 */

export type RingStatus = "under" | "met" | "over";

export type Ring =
  | {
      kind: "ring";
      status: RingStatus;
      /** Real percentage, rounded (can exceed 100). */
      percent: number;
      /** How much of the circle to draw, 0..1 (capped at a full circle). */
      fill: number;
      /** target − intake when under, else 0. */
      remaining: number;
      /** intake − target when over, else 0. */
      excess: number;
    }
  /** A 0 target can't be drawn as a fraction; show numbers only. */
  | { kind: "zero_target" };

/** Compare at the precision we display (one decimal), so 0.1 + 0.2 counts as 0.3. */
const round1 = (value: number) => Math.round(value * 10) / 10;

export function ringFor(intake: number, target: number): Ring {
  if (target <= 0) return { kind: "zero_target" };
  const shown = round1(intake);
  const status: RingStatus = shown > target ? "over" : shown === target ? "met" : "under";
  return {
    kind: "ring",
    status,
    percent: Math.round((shown / target) * 100),
    fill: Math.min(shown / target, 1),
    remaining: status === "under" ? round1(target - shown) : 0,
    excess: status === "over" ? round1(shown - target) : 0,
  };
}
