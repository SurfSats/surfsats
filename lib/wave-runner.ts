export const VIEW_H = 360;
export const PIXELS_PER_METER = 18;
export const BARREL_BONUS = 40;
export const GRAVITY = 1180;
export const FACE_SLIDE = 0.12;
export const PUMP_CLIMB = 0.62;
export const HOP_V = -390;
export const COYOTE = 0.1;
export const BASE_SPEED = 132;
export const MAX_SPEED = 310;
export const WAVE_SECS = 10;
export const WAVE_CAP = 8;
export const LEARN_SECS = 8;
export const PLAYER_W = 22;
export const PLAYER_H = 30;
export const WIPEOUT_S = 0.4;
export const TELEGRAPH_S = 0.46;
export const TAP_S = 0.17;
export const BEST_KEY = "surfsats.wave-runner.best.v1";
export const HEAT_KEY = "surfsats.wave-runner.heat.v1";

export const WAVE_COPY = {
  title: "WAVE RUNNER",
  kicker: "READ THE SET",
  late: "LATE DROP",
  barrel: "BARREL",
  closeout: "CLOSEOUT",
  wipeout: "WIPEOUT",
  nextLife: "NEXT LIFE",
  insert: "INSERT 21 SATS",
} as const;

export type SectionKind = "face" | "lip" | "barrel" | "closeout";
export type WipeReason = "closeout" | "pearl" | "eject" | "lip" | "stall";

export type Section = {
  kind: SectionKind;
  x0: number;
  x1: number;
  steep: number;
  tube: number;
  telegraphX: number;
};

export type Game = {
  w: number;
  h: number;
  t: number;
  scroll: number;
  speed: number;
  rail: number;
  hop: number;
  hopV: number;
  grounded: boolean;
  coyote: number;
  pumping: boolean;
  tucked: boolean;
  inBarrel: boolean;
  barrelS: number;
  energy: number;
  dead: boolean;
  deadT: number;
  reason: WipeReason | null;
  overlay: boolean;
  wantLife: boolean;
  shake: number;
  flash: number;
  near: number;
  seed: number;
  rng: number;
  nextX: number;
  sections: Section[];
  ended: boolean;
  started: boolean;
};

export type WaveRun = {
  score: number;
  meters: number;
  barrelS: number;
  reason: WipeReason | null;
  seed: number;
};

export type WaveBest = {
  meters: number;
  barrelS: number;
  score: number;
  at: string;
};

export type WaveHeat = {
  callsign: string;
  meters: number;
  barrelS: number;
  at: string;
  seed: number;
};

export function viewWidth(cssW: number, cssH: number) {
  const aspect = cssW / Math.max(1, cssH);
  return Math.round(Math.min(900, Math.max(160, VIEW_H * aspect)));
}

export function playerX(game: Game) {
  return Math.round(Math.min(128, Math.max(52, game.w * 0.22)));
}

export function waveOf(t: number) {
  return 1 + Math.min(WAVE_CAP - 1, Math.floor(Math.max(0, t) / WAVE_SECS));
}

export function speedAt(t: number) {
  const u = Math.min(1, Math.max(0, t) / 72);
  const ease = u * u;
  return BASE_SPEED + (MAX_SPEED - BASE_SPEED) * ease;
}

export function sectionDuration(speed: number) {
  const u = Math.min(1, Math.max(0, (speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED)));
  return 1.28 - 0.42 * u;
}

export function sectionLength(speed: number) {
  return Math.max(200, speed * sectionDuration(speed));
}

export function mulberry32(seed: number) {
  let s = seed | 0;
  return function rand() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function nextRand(game: Game) {
  game.rng = (Math.imul(game.rng, 1664525) + 1013904223) | 0;
  return ((game.rng >>> 0) % 1_000_000) / 1_000_000;
}

export function metersOf(game: Game) {
  return game.scroll / PIXELS_PER_METER;
}

export function scoreOf(game: Game) {
  return Math.floor(Math.max(0, metersOf(game) + game.barrelS * BARREL_BONUS));
}

export function emptyGame(w = 480, h = VIEW_H, seed = 1): Game {
  return {
    w,
    h,
    t: 0,
    scroll: 0,
    speed: BASE_SPEED,
    rail: 0.55,
    hop: 0,
    hopV: 0,
    grounded: true,
    coyote: 0,
    pumping: false,
    tucked: false,
    inBarrel: false,
    barrelS: 0,
    energy: 0.45,
    dead: false,
    deadT: 0,
    reason: null,
    overlay: false,
    wantLife: false,
    shake: 0,
    flash: 0,
    near: 0,
    seed,
    rng: seed | 0,
    nextX: 80,
    sections: [],
    ended: false,
    started: true,
  };
}

export function sectionAt(game: Game, worldX: number) {
  for (let i = 0; i < game.sections.length; i += 1) {
    const sec = game.sections[i];
    if (worldX >= sec.x0 && worldX < sec.x1) return sec;
  }
  return game.sections[game.sections.length - 1] ?? null;
}

export function steepAt(game: Game, worldX: number) {
  const sec = sectionAt(game, worldX);
  return sec?.steep ?? 0.35;
}

export function troughY(h: number) {
  return h * 0.82;
}

export function lipY(h: number, steep: number) {
  return h * (0.4 - 0.08 * steep);
}

export function faceY(game: Game, worldX: number) {
  const steep = steepAt(game, worldX);
  const trough = troughY(game.h);
  const lip = lipY(game.h, steep);
  const roll =
    7 * Math.sin(worldX * 0.016 + game.seed) +
    3.2 * Math.sin(worldX * 0.041 + 1.1);
  const rail = 0.5;
  return trough + (lip - trough) * rail + roll;
}

export function surfaceY(game: Game, worldX: number, rail = 0.5) {
  const steep = steepAt(game, worldX);
  const trough = troughY(game.h);
  const lip = lipY(game.h, steep);
  const roll =
    7 * Math.sin(worldX * 0.016 + game.seed) +
    3.2 * Math.sin(worldX * 0.041 + 1.1);
  const u = Math.min(1, Math.max(0, rail));
  return trough + (lip - trough) * u + roll;
}

export function tubeRoof(game: Game, worldX: number) {
  const sec = sectionAt(game, worldX);
  const floor = surfaceY(game, worldX, 0.22);
  if (!sec) return floor - 90;
  if (sec.kind === "barrel") return floor - sec.tube;
  if (sec.kind === "closeout") {
    const warn = worldX >= sec.telegraphX;
    if (!warn) return floor - sec.tube * 0.85;
    const span = Math.max(1, sec.x1 - sec.telegraphX);
    const u = Math.min(1, Math.max(0, (worldX - sec.telegraphX) / span));
    return floor - sec.tube * (1 - u);
  }
  return floor - 70 - sec.steep * 20;
}

export function playerBox(game: Game) {
  const px = playerX(game);
  const worldX = game.scroll + px;
  const sit = surfaceY(game, worldX, game.rail) - PLAYER_H;
  const y = sit - game.hop;
  const tucked = game.tucked && !game.dead;
  return {
    x: px + 4,
    y: y + (tucked ? 12 : 6),
    w: PLAYER_W - (tucked ? 4 : 8),
    h: PLAYER_H - (tucked ? 16 : 10),
  };
}

export function hopGame(game: Game) {
  if (game.dead) {
    if (game.overlay) game.wantLife = true;
    return;
  }
  if (game.grounded || game.coyote > 0) {
    const late = game.rail > 0.68 ? 1 : game.rail > 0.45 ? 0.55 : 0.2;
    game.hopV = HOP_V - game.energy * 90 - late * 70;
    game.grounded = false;
    game.coyote = 0;
    game.shake = Math.max(game.shake, 0.07);
  }
}

export function setPump(game: Game, on: boolean) {
  if (game.dead) return;
  game.pumping = on;
}

export function setTuck(game: Game, on: boolean) {
  if (game.dead) return;
  game.tucked = on;
}

function pickKind(game: Game, rand: number): SectionKind {
  const late = game.t > LEARN_SECS + 4;
  const prev = game.sections[game.sections.length - 1];
  if (prev?.kind === "closeout") return "face";
  if (prev?.kind === "lip" && rand < 0.62) return "barrel";
  if (prev?.kind === "barrel" && late && rand < 0.4) return "closeout";
  if (!late) {
    if (rand < 0.18) return "lip";
    if (rand < 0.28) return "barrel";
    return "face";
  }
  if (rand < 0.22) return "lip";
  if (rand < 0.5) return "barrel";
  if (rand < 0.68) return "closeout";
  return "face";
}

export function spawnAhead(game: Game) {
  const horizon = game.scroll + game.w + 240;
  while (game.nextX < horizon) {
    const len = sectionLength(game.speed);
    const rand = nextRand(game);
    const kind = pickKind(game, rand);
    const steep =
      kind === "face"
        ? 0.22 + nextRand(game) * 0.28
        : kind === "lip"
          ? 0.55 + nextRand(game) * 0.25
          : 0.4 + nextRand(game) * 0.35;
    const x0 = game.nextX;
    const x1 = x0 + len;
    const telegraphX =
      kind === "closeout" ? Math.max(x0, x1 - game.speed * TELEGRAPH_S) : x1;
    game.sections.push({
      kind,
      x0,
      x1,
      steep,
      tube: 52 + nextRand(game) * 28,
      telegraphX,
    });
    game.nextX = x1;
  }
}

function wipe(game: Game, reason: WipeReason) {
  if (game.dead) return;
  game.dead = true;
  game.deadT = 0;
  game.reason = reason;
  game.hopV = -90;
  game.grounded = false;
  game.inBarrel = false;
  game.pumping = false;
  game.shake = 0.8;
  game.flash = 1;
}

export function respawnGame(game: Game) {
  game.dead = false;
  game.deadT = 0;
  game.reason = null;
  game.overlay = false;
  game.wantLife = false;
  game.ended = false;
  game.hop = 0;
  game.hopV = 0;
  game.grounded = true;
  game.tucked = false;
  game.inBarrel = false;
  game.pumping = false;
  game.rail = 0.4;
  game.energy = 0.38;
  game.speed = Math.min(game.speed, BASE_SPEED + 36);
  game.shake = 0;
  game.flash = 0;
  game.near = 0;
}

export function step(game: Game, dt: number) {
  game.shake = Math.max(0, game.shake - dt * 2.6);
  game.flash = Math.max(0, game.flash - dt * 3);
  game.near = Math.max(0, game.near - dt * 2.2);

  if (game.dead) {
    game.deadT += dt;
    game.hopV += GRAVITY * dt;
    game.hop -= game.hopV * dt * 0.45;
    if (game.deadT >= WIPEOUT_S) game.overlay = true;
    return;
  }

  game.t += dt;
  const drop = game.grounded ? (0.55 - game.rail) * 46 : 0;
  const pumpBoost = game.pumping && game.grounded ? 38 + game.energy * 50 : 0;
  game.speed = speedAt(game.t) + drop + pumpBoost;
  game.scroll += game.speed * dt;
  spawnAhead(game);

  if (game.grounded) {
    if (game.pumping) {
      game.energy = Math.min(1, game.energy + dt * 0.85);
      game.rail = Math.min(0.96, game.rail + dt * PUMP_CLIMB * (0.55 + game.energy));
    } else {
      game.energy = Math.max(0, game.energy - dt * 0.32);
      game.rail = Math.max(0.04, game.rail - dt * FACE_SLIDE * (0.7 + steepAt(game, game.scroll + playerX(game))));
    }
  }

  game.hopV += GRAVITY * dt;
  game.hop -= game.hopV * dt;
  if (game.hop <= 0) {
    game.hop = 0;
    game.hopV = 0;
    if (!game.grounded) game.coyote = COYOTE;
    game.grounded = true;
  } else {
    game.grounded = false;
    game.coyote = Math.max(0, game.coyote - dt);
  }

  const px = playerX(game);
  const worldX = game.scroll + px;
  const sec = sectionAt(game, worldX);
  game.inBarrel = Boolean(
    sec &&
      sec.kind === "barrel" &&
      game.tucked &&
      game.rail > 0.32 &&
      game.rail < 0.9,
  );
  if (game.inBarrel) {
    game.barrelS += dt;
    game.near = Math.max(game.near, 0.55);
  }

  if (sec?.kind === "closeout" && worldX >= sec.telegraphX) {
    game.near = 1;
    const slamming = worldX >= sec.telegraphX + (sec.x1 - sec.telegraphX) * 0.55;
    if (slamming && game.rail > 0.28 && !game.tucked && game.grounded) {
      wipe(game, "closeout");
      return;
    }
    if (slamming && game.tucked && game.rail > 0.82) {
      wipe(game, "closeout");
      return;
    }
  }

  if (sec?.kind === "barrel" && !game.tucked && game.rail > 0.72 && game.grounded) {
    wipe(game, "eject");
    return;
  }

  if (sec?.kind === "barrel" && game.tucked && game.rail > 0.94) {
    wipe(game, "eject");
    return;
  }

  if (game.grounded && game.rail < 0.07 && game.energy < 0.05 && game.t > 3.5) {
    wipe(game, "pearl");
  }

  game.sections = game.sections.filter((item) => item.x1 > game.scroll - 80);
}

export function waveRunnerTapeText(actor: string, meters: number) {
  const m = Math.max(0, Math.floor(meters));
  return `${actor} wiped out at ${m}m on Wave Runner`;
}

export function parseWaveBest(raw: unknown): WaveBest | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const meters = Number(row.meters);
  const barrelS = Number(row.barrelS);
  const score = Number(row.score);
  const at = String(row.at ?? "");
  if (!Number.isFinite(meters) || !Number.isFinite(score) || !at) return null;
  return {
    meters,
    barrelS: Number.isFinite(barrelS) ? barrelS : 0,
    score,
    at,
  };
}

export function readWaveBest(
  storage: { getItem(key: string): string | null } | null,
): WaveBest | null {
  if (!storage) return null;
  try {
    return parseWaveBest(JSON.parse(storage.getItem(BEST_KEY) ?? "null"));
  } catch {
    return null;
  }
}

export function writeWaveBest(
  run: WaveBest,
  storage: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  } | null,
) {
  if (!storage) return run;
  const prev = readWaveBest(storage);
  const next =
    !prev || run.score > prev.score || (run.score === prev.score && run.meters > prev.meters)
      ? run
      : prev;
  storage.setItem(BEST_KEY, JSON.stringify(next));
  return next;
}

export function rememberHeat(
  row: WaveHeat,
  storage: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  } | null,
) {
  if (!storage) return [row];
  let list: WaveHeat[] = [];
  try {
    const raw = JSON.parse(storage.getItem(HEAT_KEY) ?? "[]") as unknown;
    if (Array.isArray(raw)) {
      list = raw.filter((item) => item && typeof item === "object") as WaveHeat[];
    }
  } catch {
    list = [];
  }
  const next = [row, ...list].slice(0, 12);
  storage.setItem(HEAT_KEY, JSON.stringify(next));
  return next;
}
