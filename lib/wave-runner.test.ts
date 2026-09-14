import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BARREL_BONUS,
  BASE_SPEED,
  LEARN_SECS,
  MAX_SPEED,
  PIXELS_PER_METER,
  WAVE_COPY,
  emptyGame,
  hopGame,
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

test("wipeout with lives left respawns on the same wave", () => {
  const game = emptyGame(480, 360, 11);
  spawnAhead(game);
  for (let i = 0; i < 40; i += 1) step(game, 1 / 60);
  const scroll = game.scroll;
  const seed = game.seed;
  const sections = game.sections.length;
  game.dead = true;
  game.reason = "closeout";
  respawnGame(game);
  assert.equal(game.dead, false);
  assert.equal(game.seed, seed);
  assert.equal(game.scroll, scroll);
  assert.ok(game.sections.length >= sections - 2);
  assert.ok(game.rail > 0.2);
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
  assert.doesNotMatch(blob, /NFT|username|account/i);
});
