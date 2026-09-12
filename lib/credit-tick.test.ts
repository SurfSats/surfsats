import assert from "node:assert/strict";
import { test } from "node:test";
import { formatCredits } from "./arcade.ts";
import {
  CREDIT_TICK_MS,
  INVOICE_FADE_MS,
  creditAt,
  creditTickMotion,
} from "./credit-tick.ts";

test("credits stay two digits 00–99", () => {
  assert.equal(formatCredits(0), "00");
  assert.equal(formatCredits(3), "03");
  assert.equal(formatCredits(12), "12");
});

test("tick interpolates 00→03 and snaps at the ends", () => {
  assert.equal(creditAt({ from: 0, to: 3, t: 0 }), 0);
  assert.equal(creditAt({ from: 0, to: 3, t: 1 }), 3);
  const mid = creditAt({ from: 0, to: 3, t: 0.5 });
  assert.equal(mid >= 0 && mid <= 3, true);
});

test("credit tick is 300–500ms, no bounce, no loop", () => {
  const motion = creditTickMotion({ reducedMotion: false });
  assert.equal(motion.kind, "count");
  if (motion.kind !== "count") return;
  assert.equal(CREDIT_TICK_MS >= 300, true);
  assert.equal(CREDIT_TICK_MS <= 500, true);
  assert.equal(motion.duration, CREDIT_TICK_MS);
  assert.equal(motion.loop, false);
  assert.equal(motion.ease.toLowerCase().includes("bounce"), false);
});

test("reduced motion snaps the number", () => {
  const motion = creditTickMotion({ reducedMotion: true });
  assert.equal(motion.kind, "instant");
});

test("invoice sheet fade is 200ms", () => {
  assert.equal(INVOICE_FADE_MS, 200);
});
