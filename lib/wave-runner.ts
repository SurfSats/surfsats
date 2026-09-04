export const VIEW_H = 360;
export const GRAVITY = 1040;
export const JUMP_V = -412;
export const COYOTE = 0.13;
export const BASE_SPEED = 120;
export const MAX_SPEED = 262;
export const WAVE_SECS = 10;
export const WAVE_CAP = 8;
export const LEARN_SECS = 10;
export const PLAYER_W = 22;
export const PLAYER_H = 30;
export const MAX_OBSTACLE_H = 62;

export type ObstacleKind = "block" | "spike";

export type Obstacle = {
  x: number;
  w: number;
  h: number;
  kind: ObstacleKind;
  cleared: boolean;
  near: boolean;
};

export type Pickup = {
  x: number;
  y: number;
  r: number;
  taken: boolean;
};

export type Floater = {
  x: number;
  y: number;
  text: string;
  t: number;
};

export type Game = {
  w: number;
  h: number;
  t: number;
  scroll: number;
  speed: number;
  hop: number;
  hopV: number;
  grounded: boolean;
  coyote: number;
  dead: boolean;
  deadT: number;
  sats: number;
  scoreShow: number;
  shake: number;
  flash: number;
  near: number;
  nextObstacle: number;
  nextSat: number;
  obstacles: Obstacle[];
  pickups: Pickup[];
  floaters: Floater[];
  ended: boolean;
  started: boolean;
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
  const u = Math.min(1, Math.max(0, t) / 78);
  const ease = u * u;
  return BASE_SPEED + (MAX_SPEED - BASE_SPEED) * ease;
}

export function gapAt(t: number) {
  const u = Math.min(1, Math.max(0, t - 8) / 68);
  const min = 248 - 96 * u;
  const span = 148 - 42 * u;
  return { min, span };
}

export function spikeChanceAt(t: number) {
  return 0.18 + 0.3 * Math.min(1, Math.max(0, t) / 58);
}

export function obstacleSizeAt(t: number, rand: number) {
  const u = Math.min(1, Math.max(0, t) / 70);
  const h = Math.min(
    MAX_OBSTACLE_H,
    28 + 8 * u + rand * (18 + 12 * u),
  );
  const w = 18 + 3 * u + rand * (10 + 6 * u);
  return { w, h };
}

export function surfaceY(worldX: number, h = VIEW_H) {
  return (
    h * 0.7 +
    18 * Math.sin(worldX * 0.018) +
    8 * Math.sin(worldX * 0.041 + 1.4) +
    3.5 * Math.sin(worldX * 0.09 + 0.6)
  );
}

export function emptyGame(w = 480, h = VIEW_H): Game {
  return {
    w,
    h,
    t: 0,
    scroll: 0,
    speed: BASE_SPEED,
    hop: 0,
    hopV: 0,
    grounded: true,
    coyote: 0,
    dead: false,
    deadT: 0,
    sats: 0,
    scoreShow: 0,
    shake: 0,
    flash: 0,
    near: 0,
    nextObstacle: 540,
    nextSat: 270,
    obstacles: [],
    pickups: [],
    floaters: [],
    ended: false,
    started: false,
  };
}

export function scoreOf(game: Game) {
  return Math.floor(game.scroll * 1.6 + game.sats * 21);
}

export function playerBox(game: Game) {
  const px = playerX(game);
  const worldX = game.scroll + px;
  const ground = surfaceY(worldX, game.h) - PLAYER_H;
  const y = ground - game.hop;
  return { x: px + 5, y: y + 7, w: PLAYER_W - 9, h: PLAYER_H - 10 };
}

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function hopGame(game: Game) {
  if (game.dead) return;
  if (!game.started) {
    game.started = true;
    game.t = 0;
    game.scroll = 0;
  }
  if (game.grounded || game.coyote > 0) {
    game.hopV = JUMP_V;
    game.grounded = false;
    game.coyote = 0;
    game.shake = Math.max(game.shake, 0.08);
  }
}

export function spawnAhead(game: Game, rand: () => number = Math.random) {
  const horizon = game.scroll + game.w + 90;
  while (game.nextObstacle < horizon) {
    const size = obstacleSizeAt(game.t, rand());
    game.obstacles.push({
      x: game.nextObstacle,
      w: size.w,
      h: size.h,
      kind: rand() < spikeChanceAt(game.t) ? "spike" : "block",
      cleared: false,
      near: false,
    });
    const gap = gapAt(game.t);
    game.nextObstacle += gap.min + rand() * gap.span;
  }
  while (game.nextSat < horizon) {
    const x = game.nextSat;
    const blocked = game.obstacles.some((obs) => Math.abs(obs.x - x) < obs.w + 28);
    if (!blocked) {
      game.pickups.push({
        x,
        y: surfaceY(x, game.h) - (34 + rand() * 46),
        r: 8,
        taken: false,
      });
    }
    game.nextSat += 72 + rand() * 92;
  }
}

export function step(game: Game, dt: number, rand: () => number = Math.random) {
  game.shake = Math.max(0, game.shake - dt * 2.8);
  game.flash = Math.max(0, game.flash - dt * 3.2);
  game.near = Math.max(0, game.near - dt * 2.4);
  const target = scoreOf(game);
  game.scoreShow += (target - game.scoreShow) * Math.min(1, dt * 14);
  if (Math.abs(target - game.scoreShow) < 0.5) game.scoreShow = target;
  for (const floater of game.floaters) floater.t += dt;
  game.floaters = game.floaters.filter((item) => item.t < 0.7);

  if (game.dead) {
    game.deadT += dt;
    game.hopV += GRAVITY * dt;
    game.hop -= game.hopV * dt;
    return;
  }

  if (!game.started) {
    game.t += dt;
    return;
  }

  game.t += dt;
  game.speed = speedAt(game.t);
  game.scroll += game.speed * dt;
  spawnAhead(game, rand);

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

  const box = playerBox(game);
  for (const obs of game.obstacles) {
    const ox = obs.x - game.scroll;
    if (ox < -48 || ox > game.w + 48) continue;
    const top = surfaceY(obs.x, game.h) - obs.h;
    if (
      overlaps(box, {
        x: ox,
        y: top,
        w: obs.w,
        h: obs.h,
      })
    ) {
      game.dead = true;
      game.deadT = 0;
      game.hopV = -110;
      game.shake = 0.7;
      game.flash = 1;
      return;
    }
    const overlappingX = box.x < ox + obs.w && box.x + box.w > ox;
    const gap = box.y - (top + obs.h);
    if (overlappingX && gap > 0 && gap < 16 && !obs.near) {
      obs.near = true;
      game.near = 1;
      game.floaters.push({
        x: playerX(game) + PLAYER_W / 2,
        y: box.y - 8,
        text: "CLOSE",
        t: 0,
      });
    }
    if (!obs.cleared && ox + obs.w < box.x) {
      obs.cleared = true;
    }
  }

  for (const sat of game.pickups) {
    if (sat.taken) continue;
    const sx = sat.x - game.scroll;
    if (sx < -20 || sx > game.w + 20) continue;
    const dx = box.x + box.w / 2 - sx;
    const dy = box.y + box.h / 2 - sat.y;
    if (dx * dx + dy * dy < (sat.r + 10) * (sat.r + 10)) {
      sat.taken = true;
      game.sats += 1;
      game.floaters.push({
        x: sx,
        y: sat.y,
        text: "+21",
        t: 0,
      });
    }
  }

  game.obstacles = game.obstacles.filter((obs) => obs.x > game.scroll - 80);
  game.pickups = game.pickups.filter((sat) => sat.x > game.scroll - 80 && !sat.taken);
}
