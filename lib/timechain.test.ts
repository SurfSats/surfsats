import assert from "node:assert/strict";
import { test } from "node:test";
import { feeTone } from "./timechain.ts";

test("feeTone is floor at 1 sat and quiet when the network is calm", () => {
  assert.equal(feeTone(1), "floor");
  assert.equal(feeTone(0), "floor");
  assert.equal(feeTone(null), "floor");
  assert.equal(feeTone(2), "calm");
  assert.equal(feeTone(8), "calm");
});

test("feeTone only heats when fees actually rise", () => {
  assert.equal(feeTone(9), "building");
  assert.equal(feeTone(40), "heavy");
});
