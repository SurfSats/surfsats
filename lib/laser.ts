export const LASER_HP = 3;
export const LASER_FIRE_HZ = 4;
export const LASER_IFRAME = 0.6;
export const LASER_ENEMY_CAP = 18;
export const LASER_PRINTER_AT = 8;
export const LASER_SLIME_HP = 1;
export const LASER_PRINTER_HP = 3;
export const LASER_DEAD_BEAT = 0.45;
export const LASER_DIR = "/arcade/pleb/laser";
/** Stamped body height as a fraction of the short side. Eyes sit on that body. */
export const LASER_BODY = 0.22;
/** Drawn beam length as a fraction of the short side. The hit is still a point. */
export const LASER_BEAM_VIS = 0.2;

const PLAYER_SPEED = 0.42;
const BEAM_SPEED = 1.15;
const SLIME_SPEED = 0.22;
const PRINTER_SPEED = 0.1;
const SPAWN_EVERY = 0.8;

export type LaserFacing = "right" | "left" | "up" | "down";
export type LaserKind = "slime" | "printer";

export type LaserBeam = {
  x: number;
  y: number;
  facing: LaserFacing;
};

export type LaserEnemy = {
  id: number;
  kind: LaserKind;
  x: number;
  y: number;
  hp: number;
};

export type LaserDrop = { x: number; y: number };

export type LaserMove = { x: -1 | 0 | 1; y: -1 | 0 | 1 };

export type Laser = {
  w: number;
  h: number;
  x: number;
  y: number;
  facing: LaserFacing;
  move: LaserMove;
  hp: number;
  iframe: number;
  fire: number;
  time: number;
  sats: number;
  dead: boolean;
  deadT: number;
  ghost: boolean;
  beams: LaserBeam[];
  enemies: LaserEnemy[];
  drops: LaserDrop[];
  spawnAcc: number;
  seed: number;
  nextId: number;
  rng: () => number;
};

const FACE: Record<LaserFacing, { x: number; y: number }> = {
  right: { x: 1, y: 0 },
  left: { x: -1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

/** Eye on the stamped body, fraction of body height from center. Negative y is the head. */
const EYE: Record<LaserFacing, { x: number; y: number }> = {
  right: { x: 0, y: -0.38 },
  left: { x: 0, y: -0.38 },
  up: { x: 0, y: -0.42 },
  down: { x: 0, y: -0.38 },
};

export function laserTapeText(actor: string, n: number) {
  const score = Math.max(0, Math.floor(n));
  return `${actor} wiped out at ${score} on Laser`;
}

export function laserScore(game: Pick<Laser, "time" | "sats">) {
  return Math.max(0, Math.floor(game.time)) + Math.max(0, Math.floor(game.sats));
}

export function laserPlayerSprite(facing: LaserFacing) {
  return `player-${facing}`;
}

export function facingFrom(x: number, y: number, prev: LaserFacing): LaserFacing {
  if (x === 0 && y === 0) return prev;
  if (Math.abs(x) >= Math.abs(y)) return x < 0 ? "left" : "right";
  return y < 0 ? "up" : "down";
}

export function laserHeldMove(held: ReadonlySet<string>): LaserMove {
  let x = 0;
  let y = 0;
  if (held.has("ArrowLeft") || held.has("a") || held.has("A")) x -= 1;
  if (held.has("ArrowRight") || held.has("d") || held.has("D")) x += 1;
  if (held.has("ArrowUp") || held.has("w") || held.has("W")) y -= 1;
  if (held.has("ArrowDown") || held.has("s") || held.has("S")) y += 1;
  return {
    x: Math.max(-1, Math.min(1, x)) as LaserMove["x"],
    y: Math.max(-1, Math.min(1, y)) as LaserMove["y"],
  };
}

export function setLaserMove(game: Laser, x: number, y: number) {
  game.move = {
    x: (x === 0 ? 0 : x > 0 ? 1 : -1) as LaserMove["x"],
    y: (y === 0 ? 0 : y > 0 ? 1 : -1) as LaserMove["y"],
  };
}

export function laserRadii(w: number, h: number) {
  const u = Math.max(1, Math.min(w, h));
  return {
    player: u * 0.07,
    slime: u * 0.05,
    printer: u * 0.09,
    beam: u * 0.055,
    sat: u * 0.035,
  };
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function speed(game: Laser, frac: number) {
  return Math.max(1, Math.min(game.w, game.h)) * frac;
}

export function enemyKind(time: number, roll: number): LaserKind {
  if (time < LASER_PRINTER_AT) return "slime";
  return roll < 0.45 ? "printer" : "slime";
}

export function spawnLaser(seed = 1, ghost = false, w = 480, h = 320): Laser {
  const width = Math.max(32, w);
  const height = Math.max(32, h);
  return {
    w: width,
    h: height,
    x: width / 2,
    y: height / 2,
    facing: "right",
    move: { x: 0, y: 0 },
    hp: LASER_HP,
    iframe: 0,
    fire: 0,
    time: 0,
    sats: 0,
    dead: false,
    deadT: 0,
    ghost,
    beams: [],
    enemies: [],
    drops: [],
    spawnAcc: 0,
    seed,
    nextId: 1,
    rng: mulberry32(seed),
  };
}

export function respawnLaser(game: Laser) {
  const next = spawnLaser(game.seed + 1, game.ghost, game.w, game.h);
  Object.assign(game, next);
}

function radiiOf(game: Laser) {
  return laserRadii(game.w, game.h);
}

function hit(ax: number, ay: number, ar: number, bx: number, by: number, br: number) {
  const dx = ax - bx;
  const dy = ay - by;
  const reach = ar + br;
  return dx * dx + dy * dy <= reach * reach;
}

function ghostMove(time: number): LaserMove {
  const x = Math.cos(time * 0.9);
  const y = Math.sin(time * 0.7);
  return {
    x: (x > 0.35 ? 1 : x < -0.35 ? -1 : 0) as LaserMove["x"],
    y: (y > 0.35 ? 1 : y < -0.35 ? -1 : 0) as LaserMove["y"],
  };
}

export function laserMuzzle(game: Pick<Laser, "x" | "y" | "w" | "h" | "facing">) {
  const u = Math.max(1, Math.min(game.w, game.h));
  const body = u * LASER_BODY;
  const eye = EYE[game.facing];
  const dir = FACE[game.facing];
  const half = (u * LASER_BEAM_VIS) / 2;
  return {
    x: game.x + eye.x * body + dir.x * half,
    y: game.y + eye.y * body + dir.y * half,
  };
}

function fireBeam(game: Laser) {
  const from = laserMuzzle(game);
  game.beams.push({
    x: from.x,
    y: from.y,
    facing: game.facing,
  });
}

function spawnEnemy(game: Laser) {
  const kind = enemyKind(game.time, game.rng());
  const rad = radiiOf(game);
  const pad = (kind === "printer" ? rad.printer : rad.slime) * 2.4;
  const edge = Math.floor(game.rng() * 4);
  const alongX = game.rng() * game.w;
  const alongY = game.rng() * game.h;
  let x = alongX;
  let y = alongY;
  if (edge === 0) x = -pad;
  else if (edge === 1) x = game.w + pad;
  else if (edge === 2) y = -pad;
  else y = game.h + pad;
  game.enemies.push({
    id: game.nextId++,
    kind,
    x,
    y,
    hp: kind === "printer" ? LASER_PRINTER_HP : LASER_SLIME_HP,
  });
}

function outside(game: Laser, x: number, y: number) {
  const margin = Math.max(game.w, game.h);
  return x < -margin || y < -margin || x > game.w + margin || y > game.h + margin;
}

export function stepLaser(game: Laser, dt: number) {
  if (!(dt > 0)) return;
  const step = dt;
  if (game.dead) {
    game.deadT += step;
    if (game.ghost && game.deadT >= LASER_DEAD_BEAT) respawnLaser(game);
    return;
  }
  if (game.ghost) game.move = ghostMove(game.time);
  const rad = radiiOf(game);
  const mx = game.move.x;
  const my = game.move.y;
  if (mx !== 0 || my !== 0) {
    const mag = Math.hypot(mx, my);
    const ux = mx / mag;
    const uy = my / mag;
    const travel = speed(game, PLAYER_SPEED) * step;
    game.x = Math.min(game.w - rad.player, Math.max(rad.player, game.x + ux * travel));
    game.y = Math.min(game.h - rad.player, Math.max(rad.player, game.y + uy * travel));
    game.facing = facingFrom(ux, uy, game.facing);
  }
  game.time += step;
  if (game.iframe > 0) game.iframe = Math.max(0, game.iframe - step);
  game.fire += step;
  const span = 1 / LASER_FIRE_HZ;
  while (game.fire >= span) {
    game.fire -= span;
    fireBeam(game);
  }
  const beamTravel = speed(game, BEAM_SPEED) * step;
  for (const beam of game.beams) {
    const dir = FACE[beam.facing];
    beam.x += dir.x * beamTravel;
    beam.y += dir.y * beamTravel;
  }
  if (game.enemies.length < LASER_ENEMY_CAP) {
    game.spawnAcc += step;
    while (game.spawnAcc >= SPAWN_EVERY && game.enemies.length < LASER_ENEMY_CAP) {
      game.spawnAcc -= SPAWN_EVERY;
      spawnEnemy(game);
    }
  }
  const kept: LaserBeam[] = [];
  for (const beam of game.beams) {
    if (outside(game, beam.x, beam.y)) continue;
    let hitEnemy = false;
    for (const enemy of game.enemies) {
      if (enemy.hp <= 0) continue;
      const er = enemy.kind === "printer" ? rad.printer : rad.slime;
      if (!hit(beam.x, beam.y, rad.beam, enemy.x, enemy.y, er)) continue;
      enemy.hp -= 1;
      hitEnemy = true;
      if (enemy.hp <= 0) game.drops.push({ x: enemy.x, y: enemy.y });
      break;
    }
    if (!hitEnemy) kept.push(beam);
  }
  game.beams = kept;
  game.enemies = game.enemies.filter((enemy) => enemy.hp > 0);
  for (const enemy of game.enemies) {
    const dx = game.x - enemy.x;
    const dy = game.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const pace = speed(game, enemy.kind === "printer" ? PRINTER_SPEED : SLIME_SPEED);
    enemy.x += (dx / dist) * pace * step;
    enemy.y += (dy / dist) * pace * step;
    const er = enemy.kind === "printer" ? rad.printer : rad.slime;
    if (game.iframe > 0 || game.dead) continue;
    if (!hit(game.x, game.y, rad.player, enemy.x, enemy.y, er)) continue;
    game.hp -= 1;
    game.iframe = LASER_IFRAME;
    if (game.hp <= 0) {
      game.hp = 0;
      game.dead = true;
      game.deadT = 0;
      game.beams = [];
    }
  }
  if (!game.dead) {
    const still: LaserDrop[] = [];
    for (const drop of game.drops) {
      if (hit(game.x, game.y, rad.player, drop.x, drop.y, rad.sat)) game.sats += 1;
      else still.push(drop);
    }
    game.drops = still;
  }
}
