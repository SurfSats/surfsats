import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FLOOR_ENTER_EASE,
  FLOOR_ENTER_MS,
  FLOOR_ENTER_STAGGER_MS,
  FLOOR_ENTER_STAGGER_NARROW_MS,
  FLOOR_ENTER_Y,
  floorEnterMotion,
} from "./floor-enter.ts";

test("desktop dock fades and rises once, no bounce", () => {
  const motion = floorEnterMotion({ narrow: false, reducedMotion: false });
  assert.equal(motion.kind, "tween");
  if (motion.kind !== "tween") return;
  assert.equal(FLOOR_ENTER_MS, 420);
  assert.equal(FLOOR_ENTER_STAGGER_MS, 60);
  assert.equal(FLOOR_ENTER_Y, 12);
  assert.equal(motion.duration, 420);
  assert.equal(motion.stagger, 60);
  assert.equal(motion.y, 12);
  assert.equal(motion.ease, FLOOR_ENTER_EASE);
  assert.equal(motion.loop, false);
  assert.deepEqual(motion.opacity, [0, 1]);
  assert.equal(motion.ease.includes("Bounce"), false);
  assert.equal(motion.ease.includes("elastic"), false);
});

test("390 skips y travel and shortens stagger", () => {
  const motion = floorEnterMotion({ narrow: true, reducedMotion: false });
  assert.equal(motion.kind, "tween");
  if (motion.kind !== "tween") return;
  assert.equal(FLOOR_ENTER_STAGGER_NARROW_MS, 36);
  assert.equal(motion.stagger, 36);
  assert.equal(motion.y, 0);
  assert.equal(motion.duration, 420);
  assert.equal(motion.loop, false);
});

test("reduced motion is instant, no transform", () => {
  const motion = floorEnterMotion({ narrow: false, reducedMotion: true });
  assert.equal(motion.kind, "instant");
  if (motion.kind !== "instant") return;
  assert.equal("y" in motion, false);
  assert.equal("stagger" in motion, false);
});
