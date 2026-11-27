export type Priority = "balanced" | "calories" | "protein" | "price" | "distance";
export type Violation = "kcal" | "protein" | "price" | "distance";

export type SearchCriteria = {
  targetKcal?: number;
  targetProteinG?: number;
  maxPriceKrw?: number;
  maxDistanceM?: number;
  // how far from the kcal/protein target is still OK (0.1 = 10%)
  tolerance?: number;
  // "balanced" uses Team 12's formula as it is
  priority: Priority;
};

export type PortionOption = {
  componentId: string;
  componentName: string;
  levelId: string;
  label: string;
  isDefault: boolean;
  priceDeltaKrw: number;
  kcalDelta: number | null;
  proteinDeltaG: number | null;
};

export type ComponentOptions = { componentId: string; levels: PortionOption[] };

export type Candidate = {
  menuItemId: string;
  name: string;
  restaurantId: string;
  basePriceKrw: number;
  baseKcal: number | null;
  baseProteinG: number | null;
  // true when the restaurant itself gave the number (not an estimate)
  kcalExact: boolean;
  proteinExact: boolean;
  // null means we don't know where the restaurant is
  distanceM: number | null;
  components: ComponentOptions[];
};

export type RankedResult = {
  candidate: Candidate;
  selection: PortionOption[];
  totalPriceKrw: number;
  totalKcal: number | null;
  totalProteinG: number | null;
  // Team 12's score S, a lower score is a better match
  score: number;
  // the limits this meal breaks, empty list means it fits everything
  violations: Violation[];
  exact: boolean;
};

// stop trying portion combinations after this many, so it stays fast
export const MAX_COMBINATIONS = 200;
export const DEFAULT_TOLERANCE = 0.1;

// Distance between two GPS points in meters (haversine formula)
export function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const defaultLevel = (c: ComponentOptions) =>
  c.levels.find((l) => l.isDefault) ?? c.levels[0];

// Builds every way to pick one level per component (e.g. rice Less/Regular/Extra).
// If there are too many combinations, it only tries the default meal
// and the versions where a single component is changed.
export function enumerateCombos(
  components: ComponentOptions[],
  max = MAX_COMBINATIONS,
): PortionOption[][] {
  const comps = components.filter((c) => c.levels.length > 0);
  if (comps.length === 0) return [[]];

  const total = comps.reduce((n, c) => n * c.levels.length, 1);
  if (total <= max) {
    return comps.reduce<PortionOption[][]>(
      (acc, c) => acc.flatMap((combo) => c.levels.map((l) => [...combo, l])),
      [[]],
    );
  }

  const base = comps.map(defaultLevel);
  const combos = [base];
  comps.forEach((c, i) => {
    for (const l of c.levels) {
      if (l === base[i]) continue;
      const copy = [...base];
      copy[i] = l;
      combos.push(copy);
    }
  });
  return combos.slice(0, max);
}

// Base meal + the chosen portion changes.
// If any value is unknown, the total stays unknown too.
function totals(c: Candidate, sel: PortionOption[]) {
  let price = c.basePriceKrw;
  let kcal = c.baseKcal;
  let protein = c.baseProteinG;
  for (const o of sel) {
    price += o.priceDeltaKrw;
    kcal = kcal === null || o.kcalDelta === null ? null : kcal + o.kcalDelta;
    protein = protein === null || o.proteinDeltaG === null ? null : protein + o.proteinDeltaG;
  }
  return { price, kcal, protein };
}

type Totals = { kcal: number | null; protein: number | null; price: number };

// Checks which of the user's limits this meal breaks
export function violationsFor(
  criteria: SearchCriteria,
  t: Totals,
  distanceM: number | null,
): Violation[] {
  const tol = criteria.tolerance ?? DEFAULT_TOLERANCE;
  const out: Violation[] = [];
  const off = (v: number | null, target: number) =>
    v === null || Math.abs(v - target) / target > tol;

  if (criteria.targetKcal && off(t.kcal, criteria.targetKcal)) out.push("kcal");
  if (criteria.targetProteinG && off(t.protein, criteria.targetProteinG)) out.push("protein");
  if (criteria.maxPriceKrw !== undefined && t.price > criteria.maxPriceKrw) out.push("price");
  if (criteria.maxDistanceM !== undefined && (distanceM === null || distanceM > criteria.maxDistanceM))
    out.push("distance");
  return out;
}

// Team 12's formula:
// S = 0.4*|C-C*|/C* + 0.3*|R-R*|/R* + 0.2*p/Pmax + 0.1*d/Dmax
// Lower S is better. If the user left a field empty, that part is skipped.

type Dim = "kcal" | "protein" | "price" | "distance";
const BASE_WEIGHTS: Record<Dim, number> = { kcal: 0.4, protein: 0.3, price: 0.2, distance: 0.1 };
// extra idea of ours, not in Team 12's formula: the chosen priority counts 2.5x more
const PRIORITY_BOOST = 2.5;
const PRIORITY_DIM: Record<Exclude<Priority, "balanced">, Dim> = {
  calories: "kcal",
  protein: "protein",
  price: "price",
  distance: "distance",
};

export function weightsFor(c: SearchCriteria): Partial<Record<Dim, number>> {
  const w: Partial<Record<Dim, number>> = {};
  if (c.targetKcal) w.kcal = BASE_WEIGHTS.kcal;
  if (c.targetProteinG) w.protein = BASE_WEIGHTS.protein;
  if (c.maxPriceKrw) w.price = BASE_WEIGHTS.price;
  if (c.maxDistanceM) w.distance = BASE_WEIGHTS.distance;

  if (c.priority !== "balanced") {
    const d = PRIORITY_DIM[c.priority];
    if (w[d] !== undefined) w[d] = w[d]! * PRIORITY_BOOST;
  }
  // no need to normalize, we only compare scores with each other
  return w;
}

// How far a value is from its target, as a fraction (0 = exact).
// Unknown value counts as the worst case (1).
const deviation = (value: number | null, target: number) =>
  value === null ? 1 : Math.abs(value - target) / target;

export function scoreOption(
  criteria: SearchCriteria,
  v: { kcal: number | null; protein: number | null; price: number; distanceM: number | null },
): number {
  const w = weightsFor(criteria);
  let s = 0;
  if (w.kcal !== undefined) s += w.kcal * deviation(v.kcal, criteria.targetKcal!);
  if (w.protein !== undefined) s += w.protein * deviation(v.protein, criteria.targetProteinG!);
  if (w.price !== undefined) s += w.price * (v.price / criteria.maxPriceKrw!);
  if (w.distance !== undefined)
    s += w.distance * (v.distanceM === null ? 1 : v.distanceM / criteria.maxDistanceM!);
  return s;
}

// Is result a better than result b?
// Fewer broken limits wins, then lower score, then cheaper price.
const isBetter = (a: RankedResult, b: RankedResult) =>
  a.violations.length !== b.violations.length
    ? a.violations.length < b.violations.length
    : a.score !== b.score
      ? a.score < b.score
      : a.totalPriceKrw < b.totalPriceKrw;

export type RankOptions = { limit?: number; maxViolations?: number };

// For each meal, finds its best portion choice, then sorts all meals:
// meals that break no limits first, then one limit, then two.
// Inside each group, the lowest score comes first.
export function rankCandidates(
  candidates: Candidate[],
  criteria: SearchCriteria,
  opts: RankOptions = {},
): RankedResult[] {
  const { limit, maxViolations = 2 } = opts;
  const results: RankedResult[] = [];

  for (const c of candidates) {
    // if there is a distance limit, we can't use restaurants with no location (FR-22)
    if (criteria.maxDistanceM !== undefined && c.distanceM === null) continue;

    let best: RankedResult | null = null;
    for (const sel of enumerateCombos(c.components)) {
      const t = totals(c, sel);
      const result: RankedResult = {
        candidate: c,
        selection: sel,
        totalPriceKrw: t.price,
        totalKcal: t.kcal,
        totalProteinG: t.protein,
        score: scoreOption(criteria, {
          kcal: t.kcal,
          protein: t.protein,
          price: t.price,
          distanceM: c.distanceM,
        }),
        violations: violationsFor(criteria, t, c.distanceM),
        exact: c.kcalExact && c.proteinExact,
      };
      if (!best || isBetter(result, best)) best = result;
    }
    if (best && best.violations.length <= maxViolations) results.push(best);
  }

  results.sort((a, b) => (isBetter(a, b) ? -1 : isBetter(b, a) ? 1 : 0));
  return limit ? results.slice(0, limit) : results;
}

// Team 12 asked to start narrow and widen step by step.
// Each round multiplies price, distance and the kcal/protein tolerance
// by the next step (x1, x1.5, x2, x3) until enough meals fit every limit.
export function rankWithWidening(
  candidates: Candidate[],
  criteria: SearchCriteria,
  opts: RankOptions & { minResults?: number; steps?: number[] } = {},
) {
  const { minResults = 5, steps = [1, 1.5, 2, 3], ...rankOpts } = opts;
  const baseTol = criteria.tolerance ?? DEFAULT_TOLERANCE;
  let last = {
    results: [] as RankedResult[],
    widenFactor: steps[0],
    criteria,
    perfectCount: 0,
  };

  for (const f of steps) {
    const widened: SearchCriteria = {
      ...criteria,
      tolerance: baseTol * f,
      maxDistanceM: criteria.maxDistanceM ? criteria.maxDistanceM * f : undefined,
      maxPriceKrw: criteria.maxPriceKrw ? criteria.maxPriceKrw * f : undefined,
    };
    const results = rankCandidates(candidates, widened, rankOpts);
    const perfectCount = results.filter((r) => r.violations.length === 0).length;
    last = { results, widenFactor: f, criteria: widened, perfectCount };
    if (perfectCount >= minResults) break;
  }
  return last;
}