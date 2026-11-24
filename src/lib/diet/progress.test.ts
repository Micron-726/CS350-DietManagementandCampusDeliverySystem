import assert from "node:assert/strict";
import { test } from "node:test";
import { ringFor } from "./progress";

test("nothing eaten yet is 0% under", () => {
  assert.deepEqual(ringFor(0, 2000), { kind: "ring", status: "under", percent: 0, fill: 0, remaining: 2000, excess: 0 });
});

test("under target shows the share and what is left", () => {
  assert.deepEqual(ringFor(1200, 2000), { kind: "ring", status: "under", percent: 60, fill: 0.6, remaining: 800, excess: 0 });
});

test("exactly the target is 'met' with a full ring", () => {
  assert.deepEqual(ringFor(2000, 2000), { kind: "ring", status: "met", percent: 100, fill: 1, remaining: 0, excess: 0 });
});

test("over target fills the ring, keeps the real percentage and the excess", () => {
  assert.deepEqual(ringFor(2300, 2000), { kind: "ring", status: "over", percent: 115, fill: 1, remaining: 0, excess: 300 });
});

test("compares at one decimal, so float sums don't flip the state", () => {
  const ring = ringFor(0.1 + 0.2, 0.3);
  assert.equal(ring.kind === "ring" && ring.status, "met");
  const barelyOver = ringFor(100.06, 100); // shown as 100.1
  assert.equal(barelyOver.kind === "ring" && barelyOver.status, "over");
  const roundsDown = ringFor(100.04, 100); // shown as 100
  assert.equal(roundsDown.kind === "ring" && roundsDown.status, "met");
});

test("a 0 target (allowed for protein) has no ring", () => {
  assert.deepEqual(ringFor(0, 0), { kind: "zero_target" });
  assert.deepEqual(ringFor(30, 0), { kind: "zero_target" });
});
