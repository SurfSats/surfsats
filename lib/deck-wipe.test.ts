import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DECK_WIPE_EASE,
  DECK_WIPE_MS,
  DECK_WIPE_X,
  deckWipeMotion,
} from "./deck-wipe.ts";

test("desktop wipe is ~200ms, short x, no bounce, no loop", () => {
  const motion = deckWipeMotion({ narrow: false, reducedMotion: false });
  assert.equal(motion.kind, "wipe");
  if (motion.kind !== "wipe") return;
  assert.equal(DECK_WIPE_MS >= 180, true);
  assert.equal(DECK_WIPE_MS <= 220, true);
  assert.equal(motion.duration, DECK_WIPE_MS);
  assert.equal(DECK_WIPE_X >= 8, true);
  assert.equal(DECK_WIPE_X <= 16, true);
  assert.equal(motion.x, DECK_WIPE_X);
  assert.equal(motion.ease, DECK_WIPE_EASE);
  assert.equal(motion.loop, false);
  assert.deepEqual(motion.opacity, [0, 1]);
  assert.equal(motion.ease.toLowerCase().includes("bounce"), false);
});

test("390 is fade-only so the deck cannot shear", () => {
  const motion = deckWipeMotion({ narrow: true, reducedMotion: false });
  assert.equal(motion.kind, "wipe");
  if (motion.kind !== "wipe") return;
  assert.equal(motion.x, 0);
  assert.equal(motion.duration, DECK_WIPE_MS);
  assert.deepEqual(motion.opacity, [0, 1]);
});

test("reduced motion is instant, no travel", () => {
  const motion = deckWipeMotion({ narrow: false, reducedMotion: true });
  assert.equal(motion.kind, "instant");
  if (motion.kind !== "instant") return;
  assert.equal("x" in motion, false);
  assert.equal("duration" in motion, false);
});
