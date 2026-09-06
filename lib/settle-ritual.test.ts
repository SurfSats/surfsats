import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SETTLE_HOLD_MS,
  SETTLE_MS,
  SETTLE_SETTLED_AT,
  SETTLE_SETTLING_AT,
  SETTLE_SUBTITLES,
  SETTLE_TITLES,
  settleCopy,
  settlePhaseAt,
  type SettleMachine,
  type SettlePhase,
} from "./settle-ritual.ts";

const MACHINES = [
  "arcade",
  "tab",
  "graffiti",
  "story",
  "drop",
] as const satisfies readonly SettleMachine[];

const PHASES = [
  "waiting",
  "settling",
  "settled",
] as const satisfies readonly SettlePhase[];

test("titles stay WAITING → SETTLING THE TAB → TAB SETTLED", () => {
  assert.equal(SETTLE_TITLES.waiting, "WAITING");
  assert.equal(SETTLE_TITLES.settling, "SETTLING THE TAB");
  assert.equal(SETTLE_TITLES.settled, "TAB SETTLED");
});

test("machine subtitles stay locked", () => {
  assert.equal(
    SETTLE_SUBTITLES.arcade.waiting,
    "scan the sheet · nothing moves yet",
  );
  assert.equal(
    SETTLE_SUBTITLES.arcade.settling,
    "invoice paid · credits catching up",
  );
  assert.equal(
    SETTLE_SUBTITLES.arcade.settled,
    "21 sats cleared · three credits",
  );
  assert.equal(SETTLE_SUBTITLES.tab.waiting, "one stool · unpaid");
  assert.equal(SETTLE_SUBTITLES.tab.settling, "invoice paid · stool is yours");
  assert.equal(SETTLE_SUBTITLES.tab.settled, "21 sats cleared · door is open");
  assert.equal(SETTLE_SUBTITLES.graffiti.waiting, "can in hand · wall unpaid");
  assert.equal(SETTLE_SUBTITLES.graffiti.settling, "invoice paid · can is live");
  assert.equal(SETTLE_SUBTITLES.graffiti.settled, "21 sats cleared · on the wall");
  assert.equal(SETTLE_SUBTITLES.story.waiting, "one line · not inscribed");
  assert.equal(
    SETTLE_SUBTITLES.story.settling,
    "invoice paid · line hitting the book",
  );
  assert.equal(SETTLE_SUBTITLES.story.settled, "21 sats cleared · inscribed");
  assert.equal(SETTLE_SUBTITLES.drop.waiting, "21 off the rail · unpaid");
  assert.equal(
    SETTLE_SUBTITLES.drop.settling,
    "invoice paid · 21 leaving the dock",
  );
  assert.equal(SETTLE_SUBTITLES.drop.settled, "21 sats cleared · dropped");
});

test("every machine has a subtitle for every title", () => {
  for (const machine of MACHINES) {
    for (const phase of PHASES) {
      const copy = settleCopy({ machine, phase });
      assert.equal(copy.title, SETTLE_TITLES[phase]);
      assert.equal(copy.subtitle, SETTLE_SUBTITLES[machine][phase]);
      assert.ok(copy.subtitle.length > 0);
    }
  }
});

test("starts WAITING, then SETTLING THE TAB after the draw, no percent", () => {
  const start = settlePhaseAt({ elapsed: 0 });
  assert.equal(start.phase, "waiting");
  assert.equal(start.done, false);
  assert.equal(start.title, "WAITING");
  assert.equal("progress" in start, false);

  const beforeFill = settlePhaseAt({ elapsed: SETTLE_SETTLING_AT - 1 });
  assert.equal(beforeFill.phase, "waiting");
  assert.equal(beforeFill.title, "WAITING");

  const mid = settlePhaseAt({ elapsed: SETTLE_SETTLING_AT });
  assert.equal(mid.phase, "settling");
  assert.equal(mid.title, "SETTLING THE TAB");
  assert.equal(mid.done, false);
});

test("TAB SETTLED holds then completes after default 2.8s + hold", () => {
  const settled = settlePhaseAt({ elapsed: SETTLE_SETTLED_AT });
  assert.equal(settled.phase, "settled");
  assert.equal(settled.title, "TAB SETTLED");
  assert.equal(settled.done, false);

  const hold = settlePhaseAt({ elapsed: SETTLE_MS + SETTLE_HOLD_MS - 1 });
  assert.equal(hold.phase, "settled");
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

test("reduced motion snaps WAITING → TAB SETTLED then completes", () => {
  const first = settlePhaseAt({ elapsed: 0, reducedMotion: true });
  assert.equal(first.phase, "waiting");
  assert.equal(first.title, "WAITING");
  assert.equal(first.done, false);

  const snapped = settlePhaseAt({ elapsed: 20, reducedMotion: true });
  assert.equal(snapped.phase, "settled");
  assert.equal(snapped.title, "TAB SETTLED");
  assert.equal(snapped.done, false);

  const done = settlePhaseAt({
    elapsed: SETTLE_HOLD_MS,
    reducedMotion: true,
  });
  assert.equal(done.done, true);
});
