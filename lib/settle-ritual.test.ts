import assert from "node:assert/strict";
import { test } from "node:test";
import { COPY } from "./copy.ts";
import {
  SETTLE_HOLD_MS,
  SETTLE_MS,
  SETTLE_TITLES,
  settlePhaseAt,
} from "./settle-ritual.ts";

test("titles stay Connecting → Validating Preimage → Sats Settled", () => {
  assert.equal(SETTLE_TITLES.waiting, COPY.loadingPeer);
  assert.equal(SETTLE_TITLES.settling, COPY.validating);
  assert.equal(SETTLE_TITLES.settled, COPY.settled);
});

test("starts Connecting to LN peer, then Validating Preimage with 0→1 progress", () => {
  const start = settlePhaseAt({ elapsed: 0 });
  assert.equal(start.phase, "waiting");
  assert.equal(start.progress, 0);
  assert.equal(start.done, false);
  assert.equal(start.title, COPY.loadingPeer);

  const mid = settlePhaseAt({ elapsed: SETTLE_MS * 0.5 });
  assert.equal(mid.phase, "settling");
  assert.equal(mid.title, COPY.validating);
  assert.ok(mid.progress > 0.3 && mid.progress < 0.7);
  assert.equal(mid.done, false);
});

test("Sats Settled holds then completes after default 2.8s + hold", () => {
  const settled = settlePhaseAt({ elapsed: SETTLE_MS });
  assert.equal(settled.phase, "settled");
  assert.equal(settled.title, COPY.settled);
  assert.equal(settled.progress, 1);
  assert.equal(settled.done, false);

  const hold = settlePhaseAt({ elapsed: SETTLE_MS + SETTLE_HOLD_MS - 1 });
  assert.equal(hold.done, false);

  const done = settlePhaseAt({ elapsed: SETTLE_MS + SETTLE_HOLD_MS });
  assert.equal(done.phase, "settled");
  assert.equal(done.done, true);
});

test("clamps duration to 2–4s", () => {
  const short = settlePhaseAt({ elapsed: 2000, duration: 500 });
  assert.equal(short.phase, "settled");
  const long = settlePhaseAt({ elapsed: 3000, duration: 8000 });
  assert.equal(long.phase, "settling");
});

test("reduced motion snaps Connecting → Sats Settled then completes", () => {
  const first = settlePhaseAt({ elapsed: 0, reducedMotion: true });
  assert.equal(first.phase, "waiting");
  assert.equal(first.title, COPY.loadingPeer);
  assert.equal(first.progress, 0);

  const snapped = settlePhaseAt({ elapsed: 20, reducedMotion: true });
  assert.equal(snapped.phase, "settled");
  assert.equal(snapped.title, COPY.settled);
  assert.equal(snapped.progress, 1);
  assert.equal(snapped.done, false);

  const done = settlePhaseAt({
    elapsed: SETTLE_HOLD_MS,
    reducedMotion: true,
  });
  assert.equal(done.done, true);
});
