"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

const W = 480;
const H = 360;
const PLAYER_X = 108;
const PLAYER_W = 20;
const PLAYER_H = 26;
const GRAVITY = 980;
const JUMP_V = -390;
const COYOTE = 0.1;
const MAX_SPEED = 310;
const BASE_SPEED = 148;

export type WaveRunnerHandle = {
  hop: () => void;
};

type Obstacle = {
  x: number;
  w: number;
  h: number;
  kind: "block" | "spike";
};

type Pickup = {
  x: number;
  y: number;
  r: number;
  taken: boolean;
};

type Game = {
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
  nextObstacle: number;
  nextSat: number;
  obstacles: Obstacle[];
  pickups: Pickup[];
  ended: boolean;
};

function surfaceY(worldX: number) {
  return (
    H * 0.72 +
    20 * Math.sin(worldX * 0.02) +
    9 * Math.sin(worldX * 0.045 + 1.4)
  );
}

function emptyGame(): Game {
  return {
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
    nextObstacle: 420,
    nextSat: 240,
    obstacles: [],
    pickups: [],
    ended: false,
  };
}

function scoreOf(game: Game) {
  return Math.floor(game.scroll * 1.6 + game.sats * 21);
}

function playerBox(game: Game) {
  const worldX = game.scroll + PLAYER_X;
  const ground = surfaceY(worldX) - PLAYER_H;
  const y = ground - game.hop;
  return { x: PLAYER_X + 3, y: y + 4, w: PLAYER_W - 6, h: PLAYER_H - 6 };
}

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function spawnAhead(game: Game) {
  const horizon = game.scroll + W + 80;
  while (game.nextObstacle < horizon) {
    const w = 16 + Math.random() * 14;
    const h = 26 + Math.random() * 28;
    game.obstacles.push({
      x: game.nextObstacle,
      w,
      h,
      kind: Math.random() < 0.35 ? "spike" : "block",
    });
    game.nextObstacle += 170 + Math.random() * 150 + game.speed * 0.12;
  }
  while (game.nextSat < horizon) {
    const x = game.nextSat;
    const blocked = game.obstacles.some((obs) => Math.abs(obs.x - x) < obs.w + 28);
    if (!blocked) {
      game.pickups.push({
        x,
        y: surfaceY(x) - (36 + Math.random() * 42),
        r: 8,
        taken: false,
      });
    }
    game.nextSat += 70 + Math.random() * 90;
  }
}

function hopGame(game: Game) {
  if (game.dead) return;
  if (game.grounded || game.coyote > 0) {
    game.hopV = JUMP_V;
    game.grounded = false;
    game.coyote = 0;
  }
}

function step(game: Game, dt: number) {
  if (game.dead) {
    game.deadT += dt;
    game.hopV += GRAVITY * dt;
    game.hop -= game.hopV * dt;
    return;
  }

  game.t += dt;
  game.speed = Math.min(MAX_SPEED, BASE_SPEED + game.t * 2.15);
  game.scroll += game.speed * dt;
  spawnAhead(game);

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
    if (ox < -40 || ox > W + 40) continue;
    const top = surfaceY(obs.x) - obs.h;
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
      game.hopV = -80;
      return;
    }
  }

  for (const sat of game.pickups) {
    if (sat.taken) continue;
    const sx = sat.x - game.scroll;
    if (sx < -20 || sx > W + 20) continue;
    const dx = box.x + box.w / 2 - sx;
    const dy = box.y + box.h / 2 - sat.y;
    if (dx * dx + dy * dy < (sat.r + 10) * (sat.r + 10)) {
      sat.taken = true;
      game.sats += 1;
    }
  }

  game.obstacles = game.obstacles.filter((obs) => obs.x > game.scroll - 80);
  game.pickups = game.pickups.filter((sat) => sat.x > game.scroll - 80 && !sat.taken);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function draw(ctx: CanvasRenderingContext2D, game: Game) {
  ctx.clearRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.5, H * 0.35, 20, W * 0.5, H * 0.5, H);
  glow.addColorStop(0, "#12384a");
  glow.addColorStop(1, "#041018");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(61,255,243,0.35)";
  for (let i = 0; i < 18; i += 1) {
    const x = ((i * 73 + game.scroll * 0.15) % W);
    const y = (i * 47) % (H * 0.55);
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, surfaceY(game.scroll));
  for (let x = 0; x <= W; x += 6) {
    ctx.lineTo(x, surfaceY(game.scroll + x));
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  const water = ctx.createLinearGradient(0, H * 0.55, 0, H);
  water.addColorStop(0, "rgba(61,255,243,0.35)");
  water.addColorStop(1, "rgba(8, 24, 36, 0.95)");
  ctx.fillStyle = water;
  ctx.fill();

  ctx.beginPath();
  for (let x = 0; x <= W; x += 5) {
    const y = surfaceY(game.scroll + x);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "#3dfff3";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#3dfff3";
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  for (let x = 0; x <= W; x += 8) {
    ctx.lineTo(x, surfaceY(game.scroll + x) + 7);
  }
  ctx.strokeStyle = "rgba(255,122,24,0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();

  for (const sat of game.pickups) {
    if (sat.taken) continue;
    const x = sat.x - game.scroll;
    drawSat(ctx, x, sat.y, sat.r, game.t);
  }

  for (const obs of game.obstacles) {
    const x = obs.x - game.scroll;
    const top = surfaceY(obs.x) - obs.h;
    if (obs.kind === "spike") {
      ctx.beginPath();
      ctx.moveTo(x, top + obs.h);
      ctx.lineTo(x + obs.w / 2, top);
      ctx.lineTo(x + obs.w, top + obs.h);
      ctx.closePath();
      ctx.fillStyle = "#ff2ec4";
      ctx.shadowColor = "#ff2ec4";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ff7a18";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.fillStyle = "#ff2ec4";
      ctx.shadowColor = "#ff2ec4";
      ctx.shadowBlur = 8;
      roundRect(ctx, x, top, obs.w, obs.h, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ff7a18";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  const worldX = game.scroll + PLAYER_X;
  const ground = surfaceY(worldX) - PLAYER_H;
  const y = ground - game.hop + (game.dead ? Math.min(40, game.deadT * 90) : 0);
  const spin = game.dead ? game.deadT * 8 : 0;
  ctx.save();
  ctx.translate(PLAYER_X + PLAYER_W / 2, y + PLAYER_H / 2);
  ctx.rotate(spin);
  ctx.translate(-(PLAYER_X + PLAYER_W / 2), -(y + PLAYER_H / 2));
  drawSurfer(ctx, PLAYER_X, y, game.grounded, game.t);
  ctx.restore();

  ctx.font = "11px monospace";
  ctx.fillStyle = "#7cffb2";
  ctx.textAlign = "left";
  ctx.fillText("WAVE RUNNER", 16, 22);
  ctx.fillStyle = "#efe6d4";
  ctx.font = "14px monospace";
  ctx.fillText(String(scoreOf(game)).padStart(6, "0"), 16, 40);
  ctx.textAlign = "right";
  ctx.fillStyle = "#ff7a18";
  ctx.fillText(`${game.sats} SATS`, W - 16, 28);
}

function drawSat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  t: number,
) {
  const pulse = r + Math.sin(t * 8 + x) * 1.2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = "#ff7a18";
  ctx.shadowColor = "#ff7a18";
  ctx.shadowBlur = 10;
  ctx.fillRect(-pulse, -pulse, pulse * 2, pulse * 2);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffe08a";
  ctx.fillRect(-pulse * 0.4, -pulse * 0.4, pulse * 0.8, pulse * 0.8);
  ctx.restore();
}

function drawSurfer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  grounded: boolean,
  t: number,
) {
  const bob = grounded ? Math.sin(t * 10) * 1.2 : 0;
  ctx.fillStyle = "#ff7a18";
  roundRect(ctx, x - 4, y + PLAYER_H - 7 + bob, PLAYER_W + 8, 6, 2);
  ctx.fill();
  ctx.fillStyle = "#3dfff3";
  ctx.beginPath();
  ctx.moveTo(x + PLAYER_W / 2, y + 6 + bob);
  ctx.lineTo(x + PLAYER_W + 2, y + PLAYER_H - 8 + bob);
  ctx.lineTo(x - 2, y + PLAYER_H - 8 + bob);
  ctx.closePath();
  ctx.shadowColor = "#3dfff3";
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ff2ec4";
  ctx.beginPath();
  ctx.arc(x + PLAYER_W / 2, y + 5 + bob, 5, 0, Math.PI * 2);
  ctx.fill();
}

export const WaveRunner = forwardRef<WaveRunnerHandle, {
  onWipeout: (score: number) => void;
}>(function WaveRunner({ onWipeout }, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game>(emptyGame());
  const hopRef = useRef<() => void>(() => undefined);
  const endRef = useRef(onWipeout);
  endRef.current = onWipeout;

  useImperativeHandle(ref, () => ({
    hop: () => hopRef.current(),
  }));

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const surface: HTMLCanvasElement = node;
    const gfx = surface.getContext("2d") as CanvasRenderingContext2D;

    const game = emptyGame();
    gameRef.current = game;
    hopRef.current = () => hopGame(game);

    let frame = 0;
    let last = performance.now();
    let alive = true;

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = surface.getBoundingClientRect();
      surface.width = Math.max(1, Math.floor(rect.width * dpr));
      surface.height = Math.max(1, Math.floor(rect.height * dpr));
    }

    function loop(now: number) {
      if (!alive) return;
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      step(game, dt);
      gfx.setTransform(surface.width / W, 0, 0, surface.height / H, 0, 0);
      draw(gfx, game);
      if (game.dead && game.deadT > 0.85 && !game.ended) {
        game.ended = true;
        endRef.current(scoreOf(game));
        return;
      }
      frame = window.requestAnimationFrame(loop);
    }

    function onKey(event: KeyboardEvent) {
      if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        hopGame(game);
      }
    }

    function onPointer(event: PointerEvent) {
      event.preventDefault();
      hopGame(game);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(surface);
    window.addEventListener("keydown", onKey, { passive: false });
    surface.addEventListener("pointerdown", onPointer, { passive: false });
    frame = window.requestAnimationFrame(loop);

    return () => {
      alive = false;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKey);
      surface.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="wave-runner-canvas"
      aria-label="WAVE RUNNER. Tap, click, or press space to hop."
    />
  );
});
