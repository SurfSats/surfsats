import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HUD_WAKE_EASE,
  HUD_WAKE_MS,
  HUD_WAKE_Y,
  hudWakeMotion,
} from "./hud-wake.ts";

test("HUD wakes once: opacity 0→1, small y, ~400ms, no bounce, no stagger", () => {
  const motion = hudWakeMotion({ narrow: false, reducedMotion: false });
  assert.equal(motion.kind, "wake");
  if (motion.kind !== "wake") return;
  assert.equal(HUD_WAKE_MS >= 380, true);
  assert.equal(HUD_WAKE_MS <= 420, true);
  assert.equal(motion.duration, HUD_WAKE_MS);
  assert.equal(HUD_WAKE_Y, 8);
  assert.equal(motion.y, HUD_WAKE_Y);
  assert.equal(motion.ease, HUD_WAKE_EASE);
  assert.equal(motion.loop, false);
  assert.equal("stagger" in motion, false);
  assert.deepEqual(motion.opacity, [0, 1]);
  assert.equal(motion.ease.toLowerCase().includes("bounce"), false);
  assert.equal(motion.ease.toLowerCase().includes("elastic"), false);
  assert.equal(motion.ease.toLowerCase().includes("spring"), false);
});

test("390 / portrait skips y so the clock and rail are not sheared", () => {
  const motion = hudWakeMotion({ narrow: true, reducedMotion: false });
  assert.equal(motion.kind, "wake");
  if (motion.kind !== "wake") return;
  assert.equal(motion.y, 0);
  assert.equal(motion.duration, HUD_WAKE_MS);
  assert.equal("stagger" in motion, false);
});

test("reduced motion leaves the HUD sitting there", () => {
  const motion = hudWakeMotion({ narrow: false, reducedMotion: true });
  assert.equal(motion.kind, "instant");
  if (motion.kind !== "instant") return;
  assert.equal("y" in motion, false);
  assert.equal("duration" in motion, false);
});
