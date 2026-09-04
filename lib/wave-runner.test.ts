import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BASE_SPEED,
  LEARN_SECS,
  MAX_OBSTACLE_H,
  MAX_SPEED,
  emptyGame,
  gapAt,
  hopGame,
  obstacleSizeAt,
  scoreOf,
  spawnAhead,
  speedAt,
  spikeChanceAt,
  step,
  viewWidth,
  waveOf,
} from "./wave-runner.ts";

test("first 10s stay near base speed", () => {
  assert.ok(speedAt(0) <= BASE_SPEED + 1);
  assert.ok(speedAt(LEARN_SECS) - speedAt(0) < 28);
  assert.ok(speedAt(LEARN_SECS) < speedAt(24));
});

test("speed climbs then caps", () => {
  assert.ok(speedAt(40) > speedAt(12));
  assert.ok(speedAt(80) <= MAX_SPEED + 0.01);
  assert.equal(speedAt(200), speedAt(78));
});

test("gaps tighten after the learn window but stay jumpable", () => {
  const early = gapAt(0);
  const late = gapAt(80);
  assert.ok(late.min < early.min);
  assert.ok(late.min >= 148);
  assert.ok(obstacleSizeAt(90, 1).h <= MAX_OBSTACLE_H);
});

test("wave ticks every 10s and caps at 8", () => {
  assert.equal(waveOf(0), 1);
  assert.equal(waveOf(9.9), 1);
  assert.equal(waveOf(10), 2);
  assert.equal(waveOf(70), 8);
  assert.equal(waveOf(200), 8);
});

test("spikes become more common later", () => {
  assert.ok(spikeChanceAt(0) < 0.25);
  assert.ok(spikeChanceAt(60) > spikeChanceAt(10));
  assert.ok(spikeChanceAt(90) <= 0.5);
});

test("later waves pack obstacles tighter", () => {
  const early = emptyGame();
  early.started = true;
  early.t = 4;
  early.nextObstacle = 80;
  spawnAhead(early, () => 0.5);
  const late = emptyGame();
  late.started = true;
  late.t = 52;
  late.nextObstacle = 80;
  spawnAhead(late, () => 0.5);
  assert.ok(early.obstacles.length >= 2);
  assert.ok(late.obstacles.length >= 2);
  const earlyGap = early.obstacles[1].x - early.obstacles[0].x;
  const lateGap = late.obstacles[1].x - late.obstacles[0].x;
  assert.ok(lateGap < earlyGap);
  assert.ok(speedAt(52) > speedAt(4));
});

test("view width follows canvas aspect so portrait is not stretched", () => {
  const phone = viewWidth(390, 766);
  const desk = viewWidth(937, 792);
  assert.ok(Math.abs(phone / 360 - 390 / 766) < 0.02);
  assert.ok(Math.abs(desk / 360 - 937 / 792) < 0.02);
  assert.ok(phone < desk);
});

test("score is distance plus sats and title does not score a run", () => {
  const idle = emptyGame();
  step(idle, 2);
  assert.equal(idle.started, false);
  assert.equal(scoreOf(idle), 0);
  const live = emptyGame();
  hopGame(live);
  for (let i = 0; i < 60; i += 1) step(live, 1 / 60, () => 0.5);
  assert.ok(scoreOf(live) > 0);
});
