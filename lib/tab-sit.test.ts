import assert from "node:assert/strict";
import { test } from "node:test";
import {
  TAB_SIT_EASE,
  TAB_SIT_MS,
  TAB_SIT_STAGGER_MS,
  TAB_SIT_Y,
  tabSitMotion,
} from "./tab-sit.ts";

test("sit beat is 400–600ms, small y, no bounce, no loop", () => {
  const motion = tabSitMotion({ narrow: false, reducedMotion: false });
  assert.equal(motion.kind, "sit");
  if (motion.kind !== "sit") return;
  assert.equal(TAB_SIT_MS >= 400, true);
  assert.equal(TAB_SIT_MS <= 600, true);
  assert.equal(motion.duration, TAB_SIT_MS);
  assert.equal(TAB_SIT_Y >= 8, true);
  assert.equal(TAB_SIT_Y <= 12, true);
  assert.equal(motion.y, TAB_SIT_Y);
  assert.equal(TAB_SIT_STAGGER_MS >= 40, true);
  assert.equal(TAB_SIT_STAGGER_MS <= 60, true);
  assert.equal(motion.stagger, TAB_SIT_STAGGER_MS);
  assert.equal(motion.ease, TAB_SIT_EASE);
  assert.equal(motion.loop, false);
  assert.equal(motion.ease.toLowerCase().includes("bounce"), false);
  assert.deepEqual(motion.opacity, [0.55, 1]);
});

test("390 / portrait skips travel so the still is not cropped", () => {
  const motion = tabSitMotion({ narrow: true, reducedMotion: false });
  assert.equal(motion.kind, "sit");
  if (motion.kind !== "sit") return;
  assert.equal(motion.y, 0);
  assert.equal(motion.duration, TAB_SIT_MS);
});

test("reduced motion leaves the stills sitting there", () => {
  const motion = tabSitMotion({ narrow: false, reducedMotion: true });
  assert.equal(motion.kind, "instant");
  if (motion.kind !== "instant") return;
  assert.equal("y" in motion, false);
  assert.equal("duration" in motion, false);
});
