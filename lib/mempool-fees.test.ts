import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MEMPOOL_POLL_MS,
  formatSatVb,
  parseMempoolFees,
  parseTipHeight,
  shouldPulseOnTip,
} from "./mempool-fees.ts";

test("parseTipHeight reads mempool tip text", () => {
  assert.equal(parseTipHeight("965676"), 965676);
  assert.equal(parseTipHeight(965676), 965676);
  assert.equal(parseTipHeight("nope"), null);
});

test("parseMempoolFees reads fastest, half hour, and minimum", () => {
  const fees = parseMempoolFees({
    fastestFee: 12,
    halfHourFee: 8,
    hourFee: 4,
    minimumFee: 1,
  });
  assert.deepEqual(fees, { fastestFee: 12, halfHourFee: 8, minimumFee: 1 });
  assert.equal(formatSatVb(12), "12 SAT/VB");
  assert.equal(formatSatVb(null), "-- SAT/VB");
});

test("fresh block ingestion pulses only when height advances", () => {
  assert.equal(shouldPulseOnTip(100, 101), true);
  assert.equal(shouldPulseOnTip(100, 100), false);
  assert.equal(shouldPulseOnTip(null, 101), false);
  assert.equal(MEMPOOL_POLL_MS, 30_000);
});
