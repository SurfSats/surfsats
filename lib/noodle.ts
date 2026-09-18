export const COLS = 16;
export const ROWS = 9;
export const INSET = { x: 0.032, y: 0.04, w: 0.936, h: 0.9 };
export const START_LEN = 3;
export const BASE_HZ = 8;
export const MAX_HZ = 10.5;
export const DEAD_BEAT = 0.125;
export const FALLBACK = "#F7931A";
export const SKIN_DIR = "/arcade/pleb/noodle";

export const DIRS = {
  right: { x: 1, y: 0 },
  left: { x: -1, y: 0 },
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
} as const;

export type Dir = { x: -1 | 0 | 1; y: -1 | 0 | 1 };
export type Cell = { x: number; y: number };

export type Noodle = {
  body: Cell[];
  dir: Dir;
  queued: Dir | null;
  sat: Cell;
  score: number;
  dead: boolean;
  reason: "wall" | "self" | null;
  deadT: number;
  ghost: boolean;
  acc: number;
  seed: number;
};

export type NoodleRng = () => number;

export function noodleView(cssW: number, cssH: number) {
  const w = Math.max(1, Math.floor(cssW));
  const h = Math.max(1, Math.floor(cssH));
  const innerW = w * INSET.w;
  const innerH = h * INSET.h;
  const cell = Math.max(1, Math.floor(Math.min(innerW / COLS, innerH / ROWS)));
  const gridW = cell * COLS;
  const gridH = cell * ROWS;
  const ox = Math.floor(w * INSET.x + (innerW - gridW) / 2);
  const oy = Math.floor(h * INSET.y + (innerH - gridH) / 2);
  return { w, h, cell, ox, oy, gridW, gridH };
}

export function tickSeconds(length: number) {
  const extra = Math.max(0, length - START_LEN) * 0.12;
  const hz = Math.min(MAX_HZ, BASE_HZ + extra);
  return 1 / hz;
}

export function isOpposite(a: Dir, b: Dir) {
  return a.x === -b.x && a.y === -b.y && (a.x !== 0 || a.y !== 0);
}

export function sameCell(a: Cell, b: Cell) {
  return a.x === b.x && a.y === b.y;
}

export function inBounds(cell: Cell) {
  return cell.x >= 0 && cell.x < COLS && cell.y >= 0 && cell.y < ROWS;
}

export function mulberry32(seed: number): NoodleRng {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function occupied(body: Cell[], cell: Cell, ignoreTail = false) {
  const last = body.length - 1;
  return body.some((seg, i) => {
    if (ignoreTail && i === last) return false;
    return sameCell(seg, cell);
  });
}

export function placeSat(game: Noodle, rng: NoodleRng) {
  const free: Cell[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = { x, y };
      if (!occupied(game.body, cell)) free.push(cell);
    }
  }
  if (!free.length) {
    game.sat = { x: -1, y: -1 };
    return;
  }
  game.sat = free[Math.floor(rng() * free.length)]!;
}

export function spawnNoodle(seed = 1, ghost = false): Noodle {
  const cx = Math.floor(COLS / 2);
  const cy = Math.floor(ROWS / 2);
  const body: Cell[] = [];
  for (let i = 0; i < START_LEN; i++) {
    body.push({ x: cx - i, y: cy });
  }
  const game: Noodle = {
    body,
    dir: { ...DIRS.right },
    queued: null,
    sat: { x: 0, y: 0 },
    score: 0,
    dead: false,
    reason: null,
    deadT: 0,
    ghost,
    acc: 0,
    seed,
  };
  placeSat(game, mulberry32(seed));
  return game;
}

export function respawnNoodle(game: Noodle) {
  const next = spawnNoodle(game.seed + 1, game.ghost);
  game.body = next.body;
  game.dir = next.dir;
  game.queued = null;
  game.sat = next.sat;
  game.score = 0;
  game.dead = false;
  game.reason = null;
  game.deadT = 0;
  game.acc = 0;
  game.seed = next.seed;
}

export function queueDir(game: Noodle, dir: Dir) {
  if (!dir.x && !dir.y) return;
  if (isOpposite(game.dir, dir)) return;
  game.queued = { x: dir.x, y: dir.y };
}

export function dirFromKey(key: string): Dir | null {
  if (key === "ArrowUp" || key === "w" || key === "W") return { ...DIRS.up };
  if (key === "ArrowDown" || key === "s" || key === "S") return { ...DIRS.down };
  if (key === "ArrowLeft" || key === "a" || key === "A") return { ...DIRS.left };
  if (key === "ArrowRight" || key === "d" || key === "D") return { ...DIRS.right };
  return null;
}

export function dirFromSwipe(dx: number, dy: number, min = 24): Dir | null {
  if (Math.abs(dx) < min && Math.abs(dy) < min) return null;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? { ...DIRS.right } : { ...DIRS.left };
  }
  return dy > 0 ? { ...DIRS.down } : { ...DIRS.up };
}

function toward(from: Cell, to: Cell): Dir {
  return { x: Math.sign(to.x - from.x) as Dir["x"], y: Math.sign(to.y - from.y) as Dir["y"] };
}

export function ghostThink(game: Noodle): Dir {
  const head = game.body[0]!;
  const options: Dir[] = [];
  const dx = game.sat.x - head.x;
  const dy = game.sat.y - head.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx) options.push(dx > 0 ? { ...DIRS.right } : { ...DIRS.left });
    if (dy) options.push(dy > 0 ? { ...DIRS.down } : { ...DIRS.up });
  } else {
    if (dy) options.push(dy > 0 ? { ...DIRS.down } : { ...DIRS.up });
    if (dx) options.push(dx > 0 ? { ...DIRS.right } : { ...DIRS.left });
  }
  for (const dir of [DIRS.right, DIRS.down, DIRS.left, DIRS.up]) {
    if (!options.some((item) => item.x === dir.x && item.y === dir.y)) {
      options.push({ ...dir });
    }
  }
  for (const dir of options) {
    if (isOpposite(game.dir, dir)) continue;
    const next = { x: head.x + dir.x, y: head.y + dir.y };
    if (!inBounds(next)) continue;
    if (occupied(game.body, next, true)) continue;
    return dir;
  }
  return game.dir;
}

function kill(game: Noodle, reason: "wall" | "self") {
  game.dead = true;
  game.reason = reason;
  game.deadT = 0;
}

export function tickNoodle(game: Noodle) {
  if (game.dead) return;
  if (game.ghost) game.queued = ghostThink(game);
  if (game.queued && !isOpposite(game.dir, game.queued)) {
    game.dir = game.queued;
  }
  game.queued = null;
  const head = game.body[0]!;
  const next = { x: head.x + game.dir.x, y: head.y + game.dir.y };
  if (!inBounds(next)) {
    kill(game, "wall");
    return;
  }
  const eating = game.sat.x >= 0 && sameCell(next, game.sat);
  if (occupied(game.body, next, !eating)) {
    kill(game, "self");
    return;
  }
  game.body.unshift(next);
  if (eating) {
    game.score += 1;
    placeSat(game, mulberry32(game.seed + game.score * 9973 + game.body.length));
  } else {
    game.body.pop();
  }
}

export function stepNoodle(game: Noodle, dt: number) {
  if (game.dead) {
    game.deadT += dt;
    if (game.ghost && game.deadT >= DEAD_BEAT * 3) respawnNoodle(game);
    return;
  }
  game.acc += dt;
  const span = tickSeconds(game.body.length);
  while (!game.dead && game.acc >= span) {
    game.acc -= span;
    tickNoodle(game);
  }
}

export function segmentDir(game: Noodle, index: number): Dir {
  const a = game.body[index]!;
  const b = game.body[index - 1] ?? game.body[index + 1];
  if (!b) return game.dir;
  const d = toward(a, b);
  if (!d.x && !d.y) return game.dir;
  return d;
}

export function tailDir(game: Noodle): Dir {
  if (game.body.length < 2) return game.dir;
  return toward(game.body[game.body.length - 1]!, game.body[game.body.length - 2]!);
}

export function noodleTapeText(actor: string, n: number) {
  const score = Math.max(0, Math.floor(n));
  return `${actor} wiped out at ${score} on NOODLE`;
}
