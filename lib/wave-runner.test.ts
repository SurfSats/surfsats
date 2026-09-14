import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BARREL_BONUS,
  BASE_SPEED,
  LEARN_SECS,
  MAX_SPEED,
  PIXELS_PER_METER,
  WAVE_COPY,
  coachAlpha,
  emptyGame,
  hopGame,
  isStalling,
  metersOf,
  respawnGame,
  scoreOf,
  sectionAt,
  sectionLength,
  setTuck,
  spawnAhead,
  speedAt,
  step,
  viewWidth,
  waveOf,
  waveRunnerTapeText,
  wipeoutLine,
} from "./wave-runner.ts";

test("first seconds stay near base speed", () => {
  assert.ok(speedAt(0) <= BASE_SPEED + 1);
  assert.ok(speedAt(LEARN_SECS) - speedAt(0) < 40);
  assert.ok(speedAt(LEARN_SECS) < speedAt(24));
});

test("speed climbs then caps", () => {
  assert.ok(speedAt(40) > speedAt(12));
  assert.ok(speedAt(80) <= MAX_SPEED + 0.01);
  assert.equal(speedAt(200), speedAt(72));
});

test("slow boards get more time on a section so the line stays makeable", () => {
  const slowT = sectionLength(BASE_SPEED) / BASE_SPEED;
  const fastT = sectionLength(MAX_SPEED) / MAX_SPEED;
  assert.ok(slowT > fastT);
  assert.ok(slowT > 0.9);
});

test("wave ticks every 10s and caps at 8", () => {
  assert.equal(waveOf(0), 1);
  assert.equal(waveOf(9.9), 1);
  assert.equal(waveOf(10), 2);
  assert.equal(waveOf(70), 8);
  assert.equal(waveOf(200), 8);
});

test("view width follows canvas aspect so portrait is not stretched", () => {
  const phone = viewWidth(390, 766);
  const desk = viewWidth(937, 792);
  assert.ok(Math.abs(phone / 360 - 390 / 766) < 0.02);
  assert.ok(Math.abs(desk / 360 - 937 / 792) < 0.02);
  assert.ok(phone < desk);
});

test("score is meters plus barrel-seconds bonus", () => {
  const game = emptyGame();
  game.scroll = PIXELS_PER_METER * 100;
  game.barrelS = 2;
  assert.equal(scoreOf(game), 100 + 2 * BARREL_BONUS);
  assert.equal(metersOf(game), 100);
});

test("the ride starts on the first frame", () => {
  const game = emptyGame();
  assert.equal(game.started, true);
  step(game, 1 / 60);
  assert.ok(game.scroll > 0);
  assert.ok(scoreOf(game) >= 0);
});

test("hop pops off the face", () => {
  const game = emptyGame();
  assert.equal(game.grounded, true);
  hopGame(game);
  assert.equal(game.grounded, false);
  assert.ok(game.hopV < 0);
});

test("tuck on a barrel section is a corridor you can stay in", () => {
  const game = emptyGame(480, 360, 7);
  game.sections.push({
    kind: "barrel",
    x0: 0,
    x1: 800,
    steep: 0.5,
    tube: 70,
    telegraphX: 800,
  });
  game.nextX = 800;
  game.scroll = 40;
  game.rail = 0.62;
  setTuck(game, true);
  for (let i = 0; i < 30; i += 1) step(game, 1 / 60);
  assert.equal(game.dead, false);
  assert.equal(game.inBarrel, true);
  assert.ok(game.barrelS > 0.2);
  assert.ok(scoreOf(game) > metersOf(game));
});

test("closeout is telegraphed before it slams", () => {
  const game = emptyGame(480, 360, 3);
  game.speed = 200;
  game.sections.push({
    kind: "closeout",
    x0: 0,
    x1: 400,
    steep: 0.6,
    tube: 64,
    telegraphX: 400 - 200 * 0.46,
  });
  game.nextX = 400;
  const px = Math.round(Math.min(128, Math.max(52, game.w * 0.22)));
  game.scroll = game.sections[0].telegraphX - px - 2;
  game.rail = 0.7;
  step(game, 1 / 60);
  assert.equal(game.dead, false);
  assert.ok(game.near > 0);
  const sec = sectionAt(game, game.scroll + px);
  assert.equal(sec?.kind, "closeout");
  assert.ok(sec && sec.telegraphX < sec.x1);
});

test("standing up through a closeout slam wipes out", () => {
  const game = emptyGame(480, 360, 3);
  game.speed = 180;
  game.sections.push({
    kind: "closeout",
    x0: 0,
    x1: 300,
    steep: 0.7,
    tube: 60,
    telegraphX: 40,
  });
  game.nextX = 300;
  const px = Math.round(Math.min(128, Math.max(52, game.w * 0.22)));
  game.scroll = 220 - px;
  game.rail = 0.72;
  setTuck(game, false);
  for (let i = 0; i < 20; i += 1) step(game, 1 / 60);
  assert.equal(game.dead, true);
  assert.equal(game.reason, "closeout");
});

test("next life starts on an open face, not the kill section", () => {
  const game = emptyGame(480, 360, 11);
  const px = Math.round(Math.min(128, Math.max(52, game.w * 0.22)));
  game.scroll = 900;
  game.speed = MAX_SPEED;
  game.t = 40;
  game.barrelS = 3.2;
  game.rail = 0.8;
  game.energy = 0.9;
  game.sections = [
    {
      kind: "closeout",
      x0: 800,
      x1: 1200,
      steep: 0.8,
      tube: 64,
      telegraphX: 820,
    },
  ];
  game.nextX = 1200;
  game.dead = true;
  game.reason = "closeout";
  respawnGame(game);
  assert.equal(game.dead, false);
  assert.equal(game.scroll, 0);
  assert.equal(game.speed, BASE_SPEED);
  assert.equal(game.barrelS, 0);
  assert.equal(metersOf(game), 0);
  assert.equal(game.t, 0);
  assert.ok(Math.abs(game.rail - 0.55) < 0.001);
  assert.ok(Math.abs(game.energy - 0.45) < 0.001);
  const here = sectionAt(game, px);
  assert.equal(here?.kind, "face");
  assert.ok(
    !game.sections.some((sec) => sec.kind === "closeout" && sec.x0 < 200),
  );
});

test("later sets spawn more of the wave ahead", () => {
  const early = emptyGame(480, 360, 2);
  early.t = 2;
  spawnAhead(early);
  const late = emptyGame(480, 360, 2);
  late.t = 50;
  late.speed = speedAt(50);
  spawnAhead(late);
  assert.ok(early.sections.length >= 2);
  assert.ok(late.sections.length >= 2);
  assert.ok(speedAt(50) > speedAt(2));
});

test("tape line is SURF wiped out at 184m on Wave Runner", () => {
  assert.equal(
    waveRunnerTapeText("SURF", 184),
    "SURF wiped out at 184m on Wave Runner",
  );
});

test("copy stays on the wave and never says NFT username account", () => {
  const blob = Object.values(WAVE_COPY).join(" ");
  assert.match(blob, /WAVE RUNNER/);
  assert.match(blob, /BARREL/);
  assert.match(blob, /CLOSEOUT/);
  assert.match(blob, /HOLD climbs the face/);
  assert.match(blob, /WHITE LIP/);
  assert.match(blob, /DARK HOLE/);
  assert.doesNotMatch(blob, /NFT|username|account/i);
});

test("wipeout lines say why you died", () => {
  assert.equal(
    wipeoutLine("pearl"),
    "nosedived · hold to stay on the face",
  );
  assert.equal(
    wipeoutLine("closeout"),
    "the wall ate you · drop in earlier or tuck",
  );
  assert.equal(
    wipeoutLine("eject"),
    "spat out of the tube · stay down in the hole",
  );
});

test("coach glass is solid for LEARN_SECS then fades", () => {
  assert.equal(coachAlpha(0), 1);
  assert.equal(coachAlpha(8), 1);
  assert.ok(coachAlpha(8.6) < 1);
  assert.equal(coachAlpha(12), 0);
});

test("pearl warns with stall before it kills", () => {
  const game = emptyGame();
  game.t = 2;
  game.rail = 0.12;
  game.energy = 0.1;
  game.grounded = true;
  assert.equal(isStalling(game), true);
  step(game, 0.2);
  assert.equal(game.dead, false);
  assert.ok(game.stallT > 0);
  game.rail = 0.04;
  game.energy = 0.04;
  for (let i = 0; i < 50; i += 1) step(game, 1 / 60);
  assert.equal(game.dead, true);
  assert.equal(game.reason, "pearl");
});
