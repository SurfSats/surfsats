import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LASER_DEAD_BEAT,
  LASER_ENEMY_CAP,
  LASER_FIRE_HZ,
  LASER_HP,
  LASER_IFRAME,
  LASER_PRINTER_AT,
  LASER_PRINTER_HP,
  enemyKind,
  facingFrom,
  laserHeldMove,
  laserPlayerSprite,
  laserScore,
  laserTapeText,
  respawnLaser,
  spawnLaser,
  stepLaser,
  type Laser,
} from "./laser.ts";

function run(game: Laser, seconds: number, dt = 1 / 60) {
  let left = seconds;
  while (left > 0) {
    const step = Math.min(dt, left);
    stepLaser(game, step);
    left -= step;
  }
}

test("tape line is HOPE wiped out at 9 on Laser", () => {
  assert.equal(laserTapeText("HOPE", 9), "HOPE wiped out at 9 on Laser");
  assert.equal(laserTapeText("HOPE", 9.8), "HOPE wiped out at 9 on Laser");
});

test("facing follows the move and idle keeps the last face", () => {
  assert.equal(facingFrom(1, 0, "up"), "right");
  assert.equal(facingFrom(-1, 0.2, "up"), "left");
  assert.equal(facingFrom(0, -1, "right"), "up");
  assert.equal(facingFrom(0, 1, "right"), "down");
  assert.equal(facingFrom(0, 0, "left"), "left");
  assert.equal(laserPlayerSprite("up"), "player-up");
  const held = new Set(["d", "w"]);
  assert.deepEqual(laserHeldMove(held), { x: 1, y: -1 });

  const game = spawnLaser(1, false, 480, 320);
  game.move = { x: 0, y: -1 };
  run(game, 0.1);
  assert.equal(game.facing, "up");
  game.move = { x: 0, y: 0 };
  run(game, 0.2);
  assert.equal(game.facing, "up");
});

test("auto-fire is about 4 beams a second in the facing direction", () => {
  const game = spawnLaser(3, false, 4000, 4000);
  game.enemies = [];
  game.spawnAcc = -100;
  run(game, 1);
  assert.equal(LASER_FIRE_HZ, 4);
  assert.ok(game.beams.length >= 3 && game.beams.length <= 4);
  assert.ok(game.beams.every((beam) => beam.facing === "right"));
});

test("diagonal travel matches cardinal speed", () => {
  const card = spawnLaser(1, false, 800, 800);
  card.spawnAcc = -100;
  card.move = { x: 1, y: 0 };
  const x0 = card.x;
  run(card, 0.4);
  const straight = card.x - x0;
  const diag = spawnLaser(1, false, 800, 800);
  diag.spawnAcc = -100;
  diag.move = { x: 1, y: 1 };
  const p = { x: diag.x, y: diag.y };
  run(diag, 0.4);
  const traveled = Math.hypot(diag.x - p.x, diag.y - p.y);
  assert.ok(Math.abs(traveled - straight) < 1.5);
});

test("a beam drops a slime and a sat is worth one", () => {
  const game = spawnLaser(4, false, 480, 320);
  game.spawnAcc = -100;
  game.enemies = [
    { id: 1, kind: "slime", x: game.x + 90, y: game.y, hp: 1 },
  ];
  run(game, 0.6);
  assert.equal(game.enemies.length, 0);
  assert.equal(game.drops.length, 1);
  game.x = game.drops[0]!.x;
  game.y = game.drops[0]!.y;
  run(game, 0.05);
  assert.equal(game.sats, 1);
  assert.equal(laserScore({ time: 3.2, sats: game.sats }), 4);
});

test("printers have 3 HP and only join after 8s", () => {
  assert.equal(enemyKind(7.9, 0), "slime");
  assert.equal(enemyKind(LASER_PRINTER_AT, 0.1), "printer");
  assert.equal(enemyKind(9, 0.9), "slime");
  assert.equal(LASER_PRINTER_HP, 3);

  const early = spawnLaser(2, false, 480, 320);
  run(early, 6);
  assert.ok(early.enemies.length > 0);
  assert.ok(early.enemies.every((enemy) => enemy.kind === "slime"));

  const later = spawnLaser(2, false, 480, 320);
  later.time = LASER_PRINTER_AT;
  later.rng = () => 0.1;
  later.spawnAcc = 0.8;
  stepLaser(later, 0.02);
  assert.ok(later.enemies.some((enemy) => enemy.kind === "printer"));

  const tank = spawnLaser(5, false, 480, 320);
  tank.spawnAcc = -100;
  tank.enemies = [
    { id: 9, kind: "printer", x: tank.x + 110, y: tank.y, hp: LASER_PRINTER_HP },
  ];
  run(tank, 0.4);
  const printer = tank.enemies.find((enemy) => enemy.id === 9);
  assert.ok(printer);
  assert.ok(printer.hp < LASER_PRINTER_HP && printer.hp > 0);
  run(tank, 1.2);
  assert.equal(tank.enemies.some((enemy) => enemy.id === 9), false);
  assert.ok(tank.drops.length >= 1);
});

test("enemies spawn off the plate and stay under the cap", () => {
  const game = spawnLaser(7, false, 400, 300);
  game.spawnAcc = 0.8;
  run(game, 0.02);
  assert.ok(game.enemies.length > 0);
  assert.ok(
    game.enemies.every(
      (enemy) => enemy.x < 0 || enemy.y < 0 || enemy.x > game.w || enemy.y > game.h,
    ),
  );
  run(game, 20);
  assert.ok(game.enemies.length <= LASER_ENEMY_CAP);
  assert.equal(LASER_ENEMY_CAP, 18);
});

test("a touch costs one HP and iframes block the next hit", () => {
  const game = spawnLaser(1, false, 400, 300);
  game.spawnAcc = -100;
  game.enemies = [{ id: 1, kind: "slime", x: game.x, y: game.y, hp: 1 }];
  run(game, 0.02);
  assert.equal(game.hp, LASER_HP - 1);
  assert.ok(game.iframe > LASER_IFRAME - 0.05);
  const hp = game.hp;
  run(game, 0.2);
  assert.equal(game.hp, hp);
});

test("zero HP dies, and a ghost's next life is a fresh arena", () => {
  const game = spawnLaser(1, false, 400, 300);
  game.spawnAcc = -100;
  game.hp = 1;
  game.enemies = [{ id: 1, kind: "slime", x: game.x, y: game.y, hp: 1 }];
  run(game, 0.02);
  assert.equal(game.dead, true);
  assert.equal(game.hp, 0);

  const ghost = spawnLaser(3, true, 400, 300);
  ghost.hp = 0;
  ghost.dead = true;
  ghost.deadT = 0;
  ghost.enemies = [{ id: 1, kind: "slime", x: 10, y: 10, hp: 1 }];
  stepLaser(ghost, LASER_DEAD_BEAT);
  assert.equal(ghost.dead, false);
  assert.equal(ghost.hp, LASER_HP);
  assert.equal(ghost.time, 0);
  assert.equal(ghost.enemies.length, 0);
  assert.equal(ghost.ghost, true);

  const spent = spawnLaser(4, false, 500, 340);
  spent.time = 12;
  spent.sats = 4;
  spent.hp = 1;
  spent.enemies = [{ id: 2, kind: "printer", x: 1, y: 1, hp: 2 }];
  respawnLaser(spent);
  assert.equal(spent.hp, LASER_HP);
  assert.equal(spent.time, 0);
  assert.equal(spent.sats, 0);
  assert.equal(spent.enemies.length, 0);
  assert.equal(spent.ghost, false);
});
