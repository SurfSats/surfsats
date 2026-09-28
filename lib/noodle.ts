export const COLS = 16;
export const ROWS = 9;
export const INSET = { x: 0.032, y: 0.04, w: 0.936, h: 0.9 };
export const SHORT_CELLS = 9;
export const START_LEN = 3;
export const BASE_HZ = 8;
export const MAX_HZ = 10.5;
export const DEAD_BEAT = 0.125;
export const FALLBACK = "#F7931A";
export const SKIN_DIR = "/arcade/pleb/noodle";
export const HEAD_SCALE = 1.38;
export const SAT_SCALE = 0.7;
export const SEGMENT_OVERLAP = 0.3;
export const GRID_ALPHA = 0.1;

export function stampSize(
  cell: number,
  kind: "head" | "body" | "bend" | "tail" | "sat" | "dead",
  aspect = 1,
) {
  const c = Math.max(1, Math.floor(cell));
  if (kind === "sat") {
    const s = Math.max(1, Math.round(c * SAT_SCALE));
    return { w: s, h: s };
  }
  const safe = aspect > 0 ? aspect : 1;
  if (kind === "body" || kind === "bend") {
    if (safe >= 1) return { w: c, h: Math.max(1, Math.round(c / safe)) };
    return { w: Math.max(1, Math.round(c * safe)), h: c };
  }
  const scale =
    kind === "head" || kind === "dead" ? HEAD_SCALE : 1 + SEGMENT_OVERLAP;
  const along = Math.max(1, Math.round(c * scale));
  if (safe >= 1) {
    return { w: along, h: Math.max(1, Math.round(along / safe)) };
  }
  return { w: Math.max(1, Math.round(along * safe)), h: along };
}

export function headSprite(dir: Dir) {
  if (dir.x > 0) return "head-right";
  if (dir.x < 0) return "head-left";
  if (dir.y < 0) return "head-up";
  return "head-down";
}

export function bodySprite(dir: Dir) {
  return dir.y !== 0 && dir.x === 0 ? "body-v" : "body-h";
}

export function bodyTile(game: Noodle, index: number): string {
  const here = game.body[index];
  if (!here) return "body-h";
  const ahead = game.body[index - 1];
  const behind = game.body[index + 1];
  if (!ahead || !behind) {
    const other = ahead ?? behind;
    return bodySprite(other ? toward(here, other) : game.dir);
  }
  const out = toward(here, ahead);
  const into = toward(behind, here);
  const sameAxis = (out.x !== 0 && into.x !== 0) || (out.y !== 0 && into.y !== 0);
  if (sameAxis || (!out.x && !out.y) || (!into.x && !into.y)) {
    const axis = out.x || out.y ? out : into;
    return bodySprite(axis.x || axis.y ? axis : game.dir);
  }
  const arm = toward(here, behind);
  const north = out.y < 0 || arm.y < 0;
  const south = out.y > 0 || arm.y > 0;
  const east = out.x > 0 || arm.x > 0;
  const west = out.x < 0 || arm.x < 0;
  if (north && east) return "bend-ne";
  if (north && west) return "bend-nw";
  if (south && east) return "bend-se";
  return "bend-sw";
}

export function tailSprite(dir: Dir) {
  if (dir.x < 0) return "tail-left";
  if (dir.x > 0) return "tail-right";
  if (dir.y < 0) return "tail-up";
  return "tail-down";
}

export function spriteFallback(name: string) {
  if (name.startsWith("head-")) return "head";
  if (name.startsWith("body-") || name.startsWith("bend-")) return "body";
  if (name.startsWith("tail-")) return "tail";
  return name;
}

export function tailPoint(game: Noodle): Dir {
  if (game.body.length < 2) {
    return {
      x: (game.dir.x === 0 ? 0 : -game.dir.x) as Dir["x"],
      y: (game.dir.y === 0 ? 0 : -game.dir.y) as Dir["y"],
    };
  }
  return toward(
    game.body[game.body.length - 2]!,
    game.body[game.body.length - 1]!,
  );
}

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
  cols: number;
  rows: number;
};

export type NoodleView = {
  w: number;
  h: number;
  cell: number;
  ox: number;
  oy: number;
  gridW: number;
  gridH: number;
  cols: number;
  rows: number;
};

export type NoodleRng = () => number;

export function noodleView(cssW: number, cssH: number): NoodleView {
  const w = Math.max(1, Math.floor(cssW));
  const h = Math.max(1, Math.floor(cssH));
  const innerW = w * INSET.w;
  const innerH = h * INSET.h;
  const short = Math.min(innerW, innerH);
  const cell = Math.max(1, Math.floor(short / SHORT_CELLS));
  const cols = Math.max(1, Math.floor(innerW / cell));
  const rows = Math.max(1, Math.floor(innerH / cell));
  const gridW = cell * cols;
  const gridH = cell * rows;
  const ox = Math.floor(w * INSET.x + (innerW - gridW) / 2);
  const oy = Math.floor(h * INSET.y + (innerH - gridH) / 2);
  return { w, h, cell, ox, oy, gridW, gridH, cols, rows };
}

export function applyNoodleView(game: Noodle, view: Pick<NoodleView, "cols" | "rows">) {
  const cols = Math.max(1, Math.floor(view.cols));
  const rows = Math.max(1, Math.floor(view.rows));
  const same = game.cols === cols && game.rows === rows;
  game.cols = cols;
  game.rows = rows;
  if (same) return;
  const out = game.body.some(
    (seg) => seg.x < 0 || seg.y < 0 || seg.x >= cols || seg.y >= rows,
  );
  const satOut =
    game.sat.x >= 0 &&
    (game.sat.x >= cols || game.sat.y >= rows || game.sat.x < 0 || game.sat.y < 0);
  const fresh =
    !game.dead && game.score === 0 && game.body.length === START_LEN;
  if (out || satOut || fresh) respawnNoodle(game);
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

export function inBounds(cell: Cell, cols = COLS, rows = ROWS) {
  return cell.x >= 0 && cell.x < cols && cell.y >= 0 && cell.y < rows;
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
  for (let y = 0; y < game.rows; y++) {
    for (let x = 0; x < game.cols; x++) {
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

export function spawnNoodle(
  seed = 1,
  ghost = false,
  cols = COLS,
  rows = ROWS,
): Noodle {
  const gridW = Math.max(START_LEN, Math.floor(cols));
  const gridH = Math.max(1, Math.floor(rows));
  const cx = Math.floor(gridW / 2);
  const cy = Math.floor(gridH / 2);
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
    cols: gridW,
    rows: gridH,
  };
  placeSat(game, mulberry32(seed));
  return game;
}

export function respawnNoodle(game: Noodle) {
  const next = spawnNoodle(game.seed + 1, game.ghost, game.cols, game.rows);
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
    if (!inBounds(next, game.cols, game.rows)) continue;
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
  if (!inBounds(next, game.cols, game.rows)) {
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
