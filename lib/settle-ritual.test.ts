import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SETTLE_CHECK_AT,
  SETTLE_CHECK_COLOR,
  SETTLE_CHECK_DRAW_MS,
  SETTLE_CHECK_MS,
  SETTLE_CHECK_PATH,
  SETTLE_CHECK_PATH_WIDTH,
  SETTLE_CHECK_RING,
  SETTLE_CHECK_VIEWBOX,
  SETTLE_CLOCK,
  SETTLE_FIELD,
  SETTLE_FILL_MS,
  SETTLE_FILL_STYLE,
  SETTLE_HOLD_MS,
  SETTLE_PRICE_SATS,
  SETTLE_RING_MS,
  SETTLE_SUBTITLES,
  SETTLE_TITLES,
  SETTLE_WAIT_MS,
  SETTLE_WARM_AT,
  drawHex,
  drawSlash,
  drawThreads,
  drawWave,
  fillStops,
  settleCopy,
  settlePhaseAt,
  waveLipOffset,
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

test("HUD kicker and clock stay locked", () => {
  assert.equal(SETTLE_PRICE_SATS, 21);
  assert.equal(SETTLE_CLOCK.holding, "PAID · HOLDING");
  assert.equal(SETTLE_CLOCK.final, "FINAL · NO DESK");
  for (const machine of MACHINES) {
    const settling = settleCopy({ machine, phase: "settling" });
    const settled = settleCopy({ machine, phase: "settled" });
    assert.equal(settling.kicker, `${machine} · 21 sats`);
    assert.equal(settling.clock, "PAID · HOLDING");
    assert.equal(settled.clock, "FINAL · NO DESK");
    assert.equal(settled.kicker, settling.kicker);
  }
});

test("WAITING flashes then SETTLING THE TAB; no percent", () => {
  const start = settlePhaseAt({ elapsed: 0 });
  assert.equal(start.phase, "waiting");
  assert.equal(start.done, false);
  assert.equal(start.title, "WAITING");
  assert.equal("progress" in start, false);

  const mid = settlePhaseAt({ elapsed: SETTLE_WAIT_MS });
  assert.equal(mid.phase, "settling");
  assert.equal(mid.title, "SETTLING THE TAB");
  assert.equal(mid.done, false);
});

test("TAB SETTLED after 2400ms fill, completes after check + hold", () => {
  assert.equal(SETTLE_FILL_MS, 2400);
  assert.equal(SETTLE_CHECK_MS, 700);
  assert.equal(SETTLE_HOLD_MS, 400);
  assert.equal(SETTLE_RING_MS, 420);
  assert.equal(SETTLE_CHECK_DRAW_MS, 280);
  assert.equal(SETTLE_CHECK_AT, 260);

  const still = settlePhaseAt({
    elapsed: SETTLE_WAIT_MS + SETTLE_FILL_MS - 1,
  });
  assert.equal(still.phase, "settling");
  assert.equal(still.title, "SETTLING THE TAB");

  const settled = settlePhaseAt({ elapsed: SETTLE_WAIT_MS + SETTLE_FILL_MS });
  assert.equal(settled.phase, "settled");
  assert.equal(settled.title, "TAB SETTLED");
  assert.equal(settled.done, false);

  const hold = settlePhaseAt({
    elapsed:
      SETTLE_WAIT_MS + SETTLE_FILL_MS + SETTLE_CHECK_MS + SETTLE_HOLD_MS - 1,
  });
  assert.equal(hold.phase, "settled");
  assert.equal(hold.done, false);

  const done = settlePhaseAt({
    elapsed: SETTLE_WAIT_MS + SETTLE_FILL_MS + SETTLE_CHECK_MS + SETTLE_HOLD_MS,
  });
  assert.equal(done.phase, "settled");
  assert.equal(done.done, true);
});

test("clamps fill duration to 2–4s", () => {
  const short = settlePhaseAt({
    elapsed: SETTLE_WAIT_MS + 2000,
    duration: 500,
  });
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

test("shipped fill is wave; family draws exist", () => {
  assert.equal(SETTLE_FILL_STYLE, "wave");
  assert.equal(SETTLE_FIELD, "#07080c");
  assert.equal(typeof drawWave, "function");
  assert.equal(typeof drawThreads, "function");
  assert.equal(typeof drawSlash, "function");
  assert.equal(typeof drawHex, "function");
});

test("wave lip sloshes; it is not a flat bar", () => {
  const a = waveLipOffset({ y: 12, height: 200, time: 0.4 });
  const b = waveLipOffset({ y: 88, height: 200, time: 0.4 });
  const c = waveLipOffset({ y: 12, height: 200, time: 1.2 });
  assert.notEqual(a, b);
  assert.notEqual(a, c);
});

test("fill gradient is navy then warms after 72%", () => {
  assert.equal(SETTLE_WARM_AT, 0.72);
  const cool = fillStops(0.2).map((stop) => stop.color.toLowerCase());
  const warm = fillStops(1).map((stop) => stop.color.toLowerCase());
  assert.ok(cool.some((color) => color.includes("1246a8")));
  assert.ok(cool.some((color) => color.includes("5aa4ff")));
  assert.ok(warm.some((color) => color.includes("ff6a00")));
  assert.ok(warm.some((color) => color.includes("3a0e00")));
  assert.ok(warm.some((color) => color.includes("ffb15a")));
});

test("check SVG geometry stays locked", () => {
  assert.equal(SETTLE_CHECK_VIEWBOX, "0 0 88 88");
  assert.equal(SETTLE_CHECK_COLOR, "#ff6a00");
  assert.equal(SETTLE_CHECK_RING.cx, 44);
  assert.equal(SETTLE_CHECK_RING.cy, 44);
  assert.equal(SETTLE_CHECK_RING.r, 30);
  assert.equal(SETTLE_CHECK_RING.width, 3);
  assert.equal(SETTLE_CHECK_PATH, "M30 45 L40 55 L60 33");
  assert.equal(SETTLE_CHECK_PATH_WIDTH, 3.4);
});
