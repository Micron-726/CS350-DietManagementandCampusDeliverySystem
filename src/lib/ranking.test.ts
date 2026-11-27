import { describe, expect, it } from "vitest";
import { type Candidate, haversineM, rankCandidates, rankWithWidening } from "./ranking";

const item = (o: Partial<Candidate> = {}): Candidate => ({
  menuItemId: "m1",
  name: "Item",
  restaurantId: "r1",
  basePriceKrw: 7000,
  baseKcal: 600,
  baseProteinG: 30,
  kcalExact: true,
  proteinExact: true,
  distanceM: 500,
  components: [],
  ...o,
});
const ids = (r: ReturnType<typeof rankCandidates>) => r.map((x) => x.candidate.menuItemId);

describe("haversineM", () => {
  it("is 0 for the same point", () => {
    expect(haversineM({ lat: 36.37, lng: 127.36 }, { lat: 36.37, lng: 127.36 })).toBe(0);
  });
  it("is about 111 km per degree of latitude", () => {
    const d = haversineM({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });
});

describe("rankCandidates", () => {
  it("ranks closer calories higher", () => {
    const a = item({ menuItemId: "a", baseKcal: 600 });
    const b = item({ menuItemId: "b", baseKcal: 900 });
    expect(ids(rankCandidates([b, a], { targetKcal: 600, priority: "balanced" }))).toEqual(["a", "b"]);
  });

  it("allows small deviation inside the tolerance", () => {
    const [r] = rankCandidates([item({ baseKcal: 640 })], { targetKcal: 600, priority: "balanced" });
    expect(r.violations).toEqual([]);
  });

  it("keeps an over-price meal but marks it and ranks it lower", () => {
    const ok = item({ menuItemId: "ok", basePriceKrw: 7000 });
    const pricey = item({ menuItemId: "pricey", basePriceKrw: 9000 });
    const r = rankCandidates([pricey, ok], { targetKcal: 600, maxPriceKrw: 8000, priority: "balanced" });
    expect(ids(r)).toEqual(["ok", "pricey"]);
    expect(r[1].violations).toEqual(["price"]);
  });

  it("ranks one violation above two", () => {
    const one = item({ menuItemId: "one", basePriceKrw: 9000, baseKcal: 600 });
    const two = item({ menuItemId: "two", basePriceKrw: 9000, baseKcal: 1200 });
    const r = rankCandidates([two, one], { targetKcal: 600, maxPriceKrw: 8000, priority: "balanced" });
    expect(ids(r)).toEqual(["one", "two"]);
    expect(r[1].violations).toEqual(["kcal", "price"]);
  });

  it("drops meals with more violations than maxViolations", () => {
    const two = item({ basePriceKrw: 9000, baseKcal: 1200 });
    const r = rankCandidates(
      [two],
      { targetKcal: 600, maxPriceKrw: 8000, priority: "balanced" },
      { maxViolations: 1 },
    );
    expect(r).toHaveLength(0);
  });

  it("excludes unknown location when a distance limit is set", () => {
    const r = rankCandidates([item({ distanceM: null })], {
      targetKcal: 600,
      maxDistanceM: 1000,
      priority: "balanced",
    });
    expect(r).toHaveLength(0);
  });

  it("priority changes the order", () => {
    const a = item({ menuItemId: "a", baseKcal: 600, baseProteinG: 10 });
    const b = item({ menuItemId: "b", baseKcal: 800, baseProteinG: 40 });
    const crit = { targetKcal: 600, targetProteinG: 40 };
    expect(ids(rankCandidates([a, b], { ...crit, priority: "balanced" }))[0]).toBe("b");
    expect(ids(rankCandidates([a, b], { ...crit, priority: "calories" }))[0]).toBe("a");
  });

  it("ranks unknown nutrition below known", () => {
    const known = item({ menuItemId: "k", baseKcal: 700 });
    const unknown = item({ menuItemId: "u", baseKcal: null });
    const r = rankCandidates([unknown, known], { targetKcal: 600, priority: "balanced" });
    expect(ids(r)[0]).toBe("k");
    expect(r[1].violations).toContain("kcal");
  });

  it("picks the portion combination closest to the target", () => {
    const opt = (levelId: string, label: string, kcalDelta: number, isDefault = false) => ({
      componentId: "rice",
      componentName: "Rice",
      levelId,
      label,
      isDefault,
      priceDeltaKrw: 0,
      kcalDelta,
      proteinDeltaG: 0,
    });
    const c = item({
      baseKcal: 400,
      components: [
        {
          componentId: "rice",
          levels: [opt("l1", "Less", -100), opt("l2", "Regular", 0, true), opt("l3", "Extra", 200)],
        },
      ],
    });
    const [r] = rankCandidates([c], { targetKcal: 600, priority: "balanced" });
    expect(r.selection[0].label).toBe("Extra");
    expect(r.totalKcal).toBe(600);
    expect(r.violations).toEqual([]);
  });

  it("matches Team 12's formula", () => {
    const chicken = item({ basePriceKrw: 9500, baseKcal: 520, baseProteinG: 42, distanceM: 400 });
    const [r] = rankCandidates([chicken], {
      targetKcal: 600,
      targetProteinG: 40,
      maxPriceKrw: 10000,
      maxDistanceM: 1000,
      priority: "balanced",
    });
    expect(r.score).toBeCloseTo(0.2983, 3);
  });
});

describe("rankWithWidening", () => {
  it("widens the range until a meal fits all limits", () => {
    const far = item({ distanceM: 1500 });
    const out = rankWithWidening(
      [far],
      { targetKcal: 600, maxDistanceM: 1000, priority: "balanced" },
      { minResults: 1 },
    );
    expect(out.widenFactor).toBe(1.5);
    expect(out.perfectCount).toBe(1);
    expect(out.results[0].violations).toEqual([]);
  });
});