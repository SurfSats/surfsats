import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BASE_HZ,
  COLS,
  DEAD_BEAT,
  DIRS,
  INSET,
  MAX_HZ,
  ROWS,
  START_LEN,
  dirFromKey,
  dirFromSwipe,
  inBounds,
  isOpposite,
  noodleTapeText,
  queueDir,
  respawnNoodle,
  noodleView,
  applyNoodleView,
  spawnNoodle,
  stepNoodle,
  tickNoodle,
  tickSeconds,
} from "./noodle.ts";

test("a wide RUN plate is tiled edge-to-edge, not a square kill-box", () => {
  const view = noodleView(922, 365);
  const innerW = view.w * INSET.w;
  const innerH = view.h * INSET.h;
  assert.equal(view.cell, Math.floor(view.cell));
  assert.ok(view.cell >= 1);
  assert.equal(view.gridW, view.cell * view.cols);
  assert.equal(view.gridH, view.cell * view.rows);
  assert.ok(innerW - view.gridW < view.cell, `width leftover ${innerW - view.gridW} cell ${view.cell}`);
  assert.ok(innerH - view.gridH < view.cell, `height leftover ${innerH - view.gridH} cell ${view.cell}`);
  assert.ok(view.cols > view.rows, `wide grid ${view.cols}×${view.rows}`);
  assert.ok(view.ox + view.gridW <= view.w);
  assert.ok(view.oy + view.gridH <= view.h);
});

test("resize into a wider canvas adds columns instead of letterboxing", () => {
  const square = noodleView(400, 400);
  const wide = noodleView(1200, 400);
  assert.ok(wide.cols > square.cols);
  assert.ok(1200 * INSET.w - wide.gridW < wide.cell);
});

test("a fresh noodle recenters when the plate grows at RUN enter", () => {
  const game = spawnNoodle(1, false, 16, 9);
  assert.equal(game.body[0]?.x, 8);
  applyNoodleView(game, noodleView(922, 365));
  assert.ok(game.cols > 16);
  assert.equal(game.body[0]?.x, Math.floor(game.cols / 2));
  assert.equal(game.score, 0);
});

test("a scored noodle is kept when the plate grows if it still fits", () => {
  const game = spawnNoodle(1, false, 16, 9);
  game.score = 4;
  const x = game.body[0]!.x;
  applyNoodleView(game, noodleView(922, 365));
  assert.equal(game.body[0]?.x, x);
  assert.equal(game.score, 4);
});

test("applyNoodleView respawns a snake that no longer fits the plate", () => {
  const game = spawnNoodle(1, false, 24, 9);
  game.body = [
    { x: 22, y: 1 },
    { x: 21, y: 1 },
    { x: 20, y: 1 },
  ];
  applyNoodleView(game, noodleView(400, 400));
  assert.ok(game.cols < 24);
  assert.equal(game.body.length, START_LEN);
  assert.ok(game.body.every((seg) => seg.x < game.cols && seg.y < game.rows));
});

test("the last visible column is playable; one step past it is a wall", () => {
  const view = noodleView(922, 365);
  const game = spawnNoodle(1, false, view.cols, view.rows);
  game.body = [{ x: view.cols - 1, y: 1 }];
  game.dir = { ...DIRS.left };
  tickNoodle(game);
  assert.equal(game.dead, false);
  assert.equal(game.body[0]?.x, view.cols - 2);
  game.body = [{ x: view.cols - 1, y: 1 }];
  game.dir = { ...DIRS.right };
  game.dead = false;
  game.reason = null;
  tickNoodle(game);
  assert.equal(game.dead, true);
  assert.equal(game.reason, "wall");
  assert.equal(game.body[0]?.x, view.cols - 1);
});

test("first frame is a noodle in the center facing right", () => {
  const game = spawnNoodle(7);
  assert.equal(game.body.length, START_LEN);
  assert.equal(game.body[0]?.x, Math.floor(COLS / 2));
  assert.equal(game.body[0]?.y, Math.floor(ROWS / 2));
  assert.equal(game.dir.x, 1);
  assert.equal(game.dir.y, 0);
  assert.equal(game.score, 0);
  assert.equal(game.dead, false);
  assert.equal(inBounds(game.sat), true);
});

test("opposite direction is ignored", () => {
  const game = spawnNoodle(1);
  queueDir(game, DIRS.left);
  assert.equal(game.queued, null);
  queueDir(game, DIRS.up);
  assert.deepEqual(game.queued, DIRS.up);
  tickNoodle(game);
  assert.equal(game.dir.y, -1);
  queueDir(game, DIRS.down);
  assert.equal(game.queued, null);
});

test("eating a sat grows one segment and scores one", () => {
  const game = spawnNoodle(1);
  const head = game.body[0]!;
  game.sat = { x: head.x + 1, y: head.y };
  tickNoodle(game);
  assert.equal(game.score, 1);
  assert.equal(game.body.length, START_LEN + 1);
  assert.equal(game.dead, false);
});

test("wall kills and does not wrap", () => {
  const game = spawnNoodle(1);
  game.body = [{ x: COLS - 1, y: 4 }];
  game.dir = { ...DIRS.right };
  tickNoodle(game);
  assert.equal(game.dead, true);
  assert.equal(game.reason, "wall");
  assert.equal(game.body[0]?.x, COLS - 1);
});

test("self collision kills", () => {
  const game = spawnNoodle(1);
  game.body = [
    { x: 8, y: 5 },
    { x: 7, y: 5 },
    { x: 7, y: 6 },
    { x: 8, y: 6 },
    { x: 9, y: 6 },
  ];
  game.dir = { ...DIRS.down };
  tickNoodle(game);
  assert.equal(game.dead, true);
  assert.equal(game.reason, "self");
});

test("next life is a clean center snake, not the corpse", () => {
  const game = spawnNoodle(3);
  game.body = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }];
  game.dead = true;
  game.score = 9;
  game.reason = "wall";
  respawnNoodle(game);
  assert.equal(game.dead, false);
  assert.equal(game.score, 0);
  assert.equal(game.body.length, START_LEN);
  assert.equal(game.body[0]?.x, Math.floor(COLS / 2));
  assert.equal(game.body[0]?.y, Math.floor(ROWS / 2));
  assert.equal(game.body.some((seg) => seg.x === 0 && seg.y === 0), false);
});

test("tick stays 8–10.5 Hz and speeds up with length", () => {
  const start = tickSeconds(START_LEN);
  const later = tickSeconds(20);
  assert.ok(start >= 1 / MAX_HZ - 1e-9);
  assert.ok(start <= 1 / BASE_HZ + 1e-9);
  assert.ok(later < start);
  assert.ok(1 / start >= 8 && 1 / start <= 10.5);
  assert.ok(1 / later >= 8 && 1 / later <= 10.5);
  assert.ok(DEAD_BEAT > 0.1 && DEAD_BEAT < 0.16);
});

test("keys and swipes map to four dirs", () => {
  assert.deepEqual(dirFromKey("ArrowLeft"), DIRS.left);
  assert.deepEqual(dirFromKey("w"), DIRS.up);
  assert.deepEqual(dirFromSwipe(40, 2), DIRS.right);
  assert.deepEqual(dirFromSwipe(-4, 50), DIRS.down);
  assert.equal(dirFromSwipe(2, 2), null);
  assert.equal(isOpposite(DIRS.left, DIRS.right), true);
});

test("tape line is HOPE wiped out at 12 on NOODLE", () => {
  assert.equal(noodleTapeText("HOPE", 12), "HOPE wiped out at 12 on NOODLE");
});

test("copy never says SATSSS wrap portal username NFT", () => {
  const blob = noodleTapeText("HOPE", 4);
  assert.doesNotMatch(blob, /SATSSS|wrap|portal|username|NFT/i);
});

test("a ghost that dies comes back on a fresh grid", () => {
  const game = spawnNoodle(9, true);
  game.dead = true;
  game.deadT = DEAD_BEAT * 3;
  stepNoodle(game, 0.01);
  assert.equal(game.dead, false);
  assert.equal(game.body.length, START_LEN);
});
