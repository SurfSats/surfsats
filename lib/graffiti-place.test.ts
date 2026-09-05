import assert from "node:assert/strict";
import { test } from "node:test";
import { clampPlacement } from "./graffiti.ts";

test("clampPlacement keeps tags on the empty brick face", () => {
  assert.deepEqual(clampPlacement(50, 40), { top: 50, left: 40 });
  assert.equal(clampPlacement(-10, -4).top, 6);
  assert.equal(clampPlacement(-10, -4).left, 3);
  assert.equal(clampPlacement(200, 200).left, 88);
  assert.equal(clampPlacement(200, 200).top, 84);
});
