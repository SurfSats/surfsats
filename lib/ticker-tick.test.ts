import assert from "node:assert/strict";
import { test } from "node:test";
import {
  TICKER_TICK_DIP,
  TICKER_TICK_MS,
  tickerTickMotion,
  tickerValueChanged,
} from "./ticker-tick.ts";

test("first paint does not tick", () => {
  assert.equal(tickerValueChanged(null, "$77,310"), false);
});

test("same value does not tick", () => {
  assert.equal(tickerValueChanged("$77,310", "$77,310"), false);
});

test("changed number ticks", () => {
  assert.equal(tickerValueChanged("$77,310", "$77,341"), true);
});

test("flash is opacity only, 180–240ms, no loop", () => {
  const motion = tickerTickMotion({ reducedMotion: false });
  assert.equal(motion.kind, "flash");
  if (motion.kind !== "flash") return;
  assert.equal(TICKER_TICK_MS >= 180, true);
  assert.equal(TICKER_TICK_MS <= 240, true);
  assert.equal(motion.duration, TICKER_TICK_MS);
  assert.equal(TICKER_TICK_DIP, 0.35);
  assert.deepEqual(motion.opacity, [1, 0.35, 1]);
  assert.equal(motion.loop, false);
  assert.equal("translateY" in motion, false);
  assert.equal("y" in motion, false);
});

test("reduced motion swaps text with no tween", () => {
  const motion = tickerTickMotion({ reducedMotion: true });
  assert.equal(motion.kind, "instant");
  if (motion.kind !== "instant") return;
  assert.equal("opacity" in motion, false);
  assert.equal("duration" in motion, false);
});
