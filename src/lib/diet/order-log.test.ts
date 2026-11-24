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

describe("sumNutrient sources", () => {
  const kcal = (item: OrderLine) => ({ value: item.kcal, source: item.kcalSource });

  test("mixed known sources become 'calculated'", () => {
    const total = sumNutrient([chicken, line({ id: "d", kcal: 300, kcalSource: "estimated" })], kcal);
    assert.deepEqual(total, { value: 1600, source: "calculated", missing: 0 });
  });

  test("a partial sum is 'estimated' and counts the missing lines", () => {
    const unknown = line({ id: "e", kcal: null, kcalSource: "unavailable", quantity: 3 });
    assert.deepEqual(sumNutrient([chicken, unknown], kcal), { value: 1300, source: "estimated", missing: 1 });
  });

  test("no known value is 'unavailable' with a null total", () => {
    const unknown = line({ id: "f", kcal: null, kcalSource: "unavailable" });
    assert.deepEqual(sumNutrient([unknown, unknown], kcal), { value: null, source: "unavailable", missing: 2 });
  });
});
