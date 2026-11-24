import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { type OrderLine, representativeItemId, summarizeOrder, sumNutrient } from "./order-log";

function line(overrides: Partial<OrderLine> & Pick<OrderLine, "id">): OrderLine {
  return {
    name: "치킨 덮밥", quantity: 1,
    kcal: 650, kcalSource: "provider", proteinG: 32, proteinSource: "provider",
    ...overrides,
  };
}

const chicken = line({ id: "b0000000-0000-4000-8000-000000000002", quantity: 2 });
const lessRice = line({ id: "c0000000-0000-4000-8000-000000000003", name: "치킨 덮밥 (밥 적게)", kcal: 540, proteinG: 30 });
const cola = line({ id: "a0000000-0000-4000-8000-000000000001", name: "콜라", kcal: 140, proteinG: 0 });

describe("representativeItemId", () => {
  test("is the smallest item id, whatever the order of the lines", () => {
    assert.equal(representativeItemId([chicken, lessRice, cola]), cola.id);
    assert.equal(representativeItemId([cola, lessRice, chicken]), cola.id);
  });

  test("is null for an empty order", () => {
    assert.equal(representativeItemId([]), null);
  });
});

describe("summarizeOrder", () => {
  test("totals per-unit values × quantity; lines keep per-unit values", () => {
    const summary = summarizeOrder([chicken, lessRice, cola]);
    assert.ok(summary);
    assert.equal(summary.linkItemId, cola.id);
    assert.deepEqual(summary.lines.map(({ name, kcal, quantity }) => [name, kcal, quantity]), [
      ["치킨 덮밥", 650, 2], ["치킨 덮밥 (밥 적게)", 540, 1], ["콜라", 140, 1],
    ]);
    assert.deepEqual(summary.kcal, { value: 650 * 2 + 540 + 140, source: "provider", missing: 0 }); // 1,980
    assert.deepEqual(summary.protein, { value: 32 * 2 + 30 + 0, source: "provider", missing: 0 }); // 94
  });

  test("0 is a known value, not a missing one", () => {
    const summary = summarizeOrder([cola]);
    assert.ok(summary);
    assert.deepEqual(summary.protein, { value: 0, source: "provider", missing: 0 });
  });

  test("is null for an order without items", () => {
    assert.equal(summarizeOrder([]), null);
  });
});

describe("sumNutrient follows the team's menu merge rule", () => {
  const kcal = (item: OrderLine) => ({ value: item.kcal, source: item.kcalSource });

  test("one shared source stays that source", () => {
    assert.deepEqual(sumNutrient([chicken, cola], kcal), { value: 1440, source: "provider", missing: 0 });
  });

  test("mixed known sources become 'calculated'", () => {
    assert.deepEqual(sumNutrient([chicken, line({ id: "d", kcal: 300, kcalSource: "calculated" })], kcal),
      { value: 1600, source: "calculated", missing: 0 });
    assert.deepEqual(sumNutrient([line({ id: "d", kcal: 300, kcalSource: "calculated" }), chicken], kcal),
      { value: 1600, source: "calculated", missing: 0 });
  });

  test("an estimated or user value makes the total 'estimated'", () => {
    assert.equal(sumNutrient([chicken, line({ id: "d", kcal: 300, kcalSource: "estimated" })], kcal).source, "estimated");
    assert.equal(sumNutrient([chicken, line({ id: "d", kcal: 300, kcalSource: "user" })], kcal).source, "estimated");
    assert.equal(sumNutrient([line({ id: "d", kcal: 300, kcalSource: "estimated" }), chicken], kcal).source, "estimated");
  });

  test("one unknown line makes the whole total unknown", () => {
    const unknown = line({ id: "e", kcal: null, kcalSource: "unavailable", quantity: 3 });
    assert.deepEqual(sumNutrient([chicken, unknown], kcal), { value: null, source: "unavailable", missing: 1 });
    assert.deepEqual(sumNutrient([unknown, unknown], kcal), { value: null, source: "unavailable", missing: 2 });
  });

  test("an empty order has no total", () => {
    assert.deepEqual(sumNutrient([], kcal), { value: null, source: "unavailable", missing: 0 });
  });
});
