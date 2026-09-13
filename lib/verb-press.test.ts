import assert from "node:assert/strict";
import { test } from "node:test";
import {
  VERB_PRESS_EASE,
  VERB_PRESS_MS,
  VERB_PRESS_SCALE,
  verbPressMotion,
} from "./verb-press.ts";

test("verb press is scale 0.97 for ~80ms, no bounce, no loop", () => {
  const motion = verbPressMotion({ reducedMotion: false });
  assert.equal(motion.kind, "press");
  if (motion.kind !== "press") return;
  assert.equal(VERB_PRESS_SCALE, 0.97);
  assert.equal(motion.scale, VERB_PRESS_SCALE);
  assert.equal(VERB_PRESS_MS, 80);
  assert.equal(motion.duration, VERB_PRESS_MS);
  assert.equal(motion.ease, VERB_PRESS_EASE);
  assert.equal(motion.loop, false);
  assert.equal(motion.ease.toLowerCase().includes("bounce"), false);
  assert.equal(motion.ease.toLowerCase().includes("elastic"), false);
  assert.equal(motion.ease.toLowerCase().includes("spring"), false);
});

test("reduced motion does not scale", () => {
  const motion = verbPressMotion({ reducedMotion: true });
  assert.equal(motion.kind, "instant");
  if (motion.kind !== "instant") return;
  assert.equal("scale" in motion, false);
  assert.equal("duration" in motion, false);
});
