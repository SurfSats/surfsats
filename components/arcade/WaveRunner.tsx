"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { ARCADE_PRICE_SATS } from "@/lib/arcade";
import { isSfxMuted } from "@/lib/sfx";
import {
  BEST_KEY,
  PLAYER_H,
  PLAYER_W,
  TAP_S,
  VIEW_H,
  WAVE_COPY,
  emptyGame,
  hopGame,
  metersOf,
  playerX,
  respawnGame,
  scoreOf,
  sectionAt,
  setPump,
  setTuck,
  step,
  surfaceY,
  tubeRoof,
  viewWidth,
  waveOf,
  type Game,
  type WaveRun,
} from "@/lib/wave-runner";

export type WaveRunnerHandle = {
  hop: () => void;
};

export type { WaveRun };

type OceanCache = {
  w: number;
  h: number;
  sky: HTMLCanvasElement;
  swell: HTMLCanvasElement;
  foam: HTMLCanvasElement;
};

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

function bakeSky(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#071422");
  sky.addColorStop(0.38, "#12384a");
  sky.addColorStop(0.7, "#0a2430");
  sky.addColorStop(1, "#041018");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const sunX = w * 0.78;
  const sunY = h * 0.2;
  const sun = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 72);
  sun.addColorStop(0, "rgba(255, 122, 24, 0.55)");
  sun.addColorStop(0.45, "rgba(255, 122, 24, 0.12)");
  sun.addColorStop(1, "rgba(255, 122, 24, 0)");
  ctx.fillStyle = sun;
  ctx.fillRect(sunX - 80, sunY - 80, 160, 160);
  ctx.fillStyle = "#ff7a18";
  ctx.beginPath();
  ctx.arc(sunX, sunY, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(239, 230, 212, 0.5)";
  for (let i = 0; i < 18; i += 1) {
    ctx.fillRect((i * 73) % w, 8 + ((i * 47) % (h * 0.34)), i % 5 === 0 ? 2 : 1, 1);
  }
  return c;
}

function bakeSwell(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.fillStyle = "rgba(8, 36, 48, 0.9)";
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 10) {
    const y = h * 0.54 + 12 * Math.sin(x * 0.018) + 6 * Math.sin(x * 0.04);
    if (x === 0) ctx.lineTo(0, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(12, 52, 64, 0.88)";
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 10) {
    const y = h * 0.6 + 14 * Math.sin(x * 0.022 + 1.1);
    if (x === 0) ctx.lineTo(0, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  return c;
}

function bakeFoam() {
  const c = document.createElement("canvas");
  c.width = 48;
  c.height = 16;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.fillStyle = "rgba(239, 230, 212, 0.85)";
  ctx.beginPath();
  ctx.ellipse(24, 8, 20, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(61, 255, 243, 0.35)";
  ctx.fillRect(8, 6, 12, 2);
  return c;
}

function oceanCache(w: number, h: number, prev: OceanCache | null): OceanCache {
  if (prev && prev.w === w && prev.h === h) return prev;
  return { w, h, sky: bakeSky(w, h), swell: bakeSwell(w, h), foam: bakeFoam() };
}

function pixelFont(size: number, family: string) {
  return `${size}px ${family}, monospace`;
}

function blip(kind: "hop" | "wipe" | "barrel") {
  if (typeof window === "undefined" || isSfxMuted()) return;
  const AudioCtx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(kind === "wipe" ? 0.1 : 0.06, now);
  master.connect(ctx.destination);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = kind === "wipe" ? "triangle" : "square";
  osc.frequency.setValueAtTime(kind === "hop" ? 520 : kind === "barrel" ? 180 : 90, now);
  if (kind === "hop") osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
  if (kind === "wipe") osc.frequency.exponentialRampToValueAtTime(40, now + 0.28);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.9, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "wipe" ? 0.32 : 0.1));
  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + 0.36);
  window.setTimeout(() => void ctx.close(), 420);
}

function drawFace(ctx: CanvasRenderingContext2D, game: Game) {
  const W = game.w;
  const H = game.h;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 6) {
    ctx.lineTo(x, surfaceY(game, game.scroll + x, 0.02));
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  const deep = ctx.createLinearGradient(0, H * 0.55, 0, H);
  deep.addColorStop(0, "rgba(10, 48, 62, 0.95)");
  deep.addColorStop(1, "rgba(4, 16, 24, 0.98)");
  ctx.fillStyle = deep;
  ctx.fill();

  ctx.beginPath();
  for (let x = 0; x <= W; x += 5) {
    const y = surfaceY(game, game.scroll + x, 0.92);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let x = W; x >= 0; x -= 5) {
    ctx.lineTo(x, surfaceY(game, game.scroll + x, 0.08));
  }
  ctx.closePath();
  const face = ctx.createLinearGradient(0, H * 0.28, 0, H * 0.82);
  face.addColorStop(0, "rgba(180, 245, 255, 0.55)");
  face.addColorStop(0.22, "rgba(61, 255, 243, 0.42)");
  face.addColorStop(0.55, "rgba(18, 90, 110, 0.92)");
  face.addColorStop(1, "rgba(8, 28, 40, 0.98)");
  ctx.fillStyle = face;
  ctx.fill();

  ctx.beginPath();
  for (let x = 0; x <= W; x += 5) {
    const y = surfaceY(game, game.scroll + x, 0.92);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "#efe6d4";
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.beginPath();
  for (let x = 0; x <= W; x += 5) {
    const y = surfaceY(game, game.scroll + x, 0.92) + 4;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "#3dfff3";
  ctx.lineWidth = 2.2;
  ctx.stroke();
}

function drawBarrel(ctx: CanvasRenderingContext2D, game: Game) {
  const W = game.w;
  let drawing = false;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 6) {
    const worldX = game.scroll + x;
    const sec = sectionAt(game, worldX);
    const tube = sec && (sec.kind === "barrel" || (sec.kind === "closeout" && worldX >= sec.telegraphX));
    if (!tube) {
      if (drawing) {
        ctx.lineTo(x, surfaceY(game, worldX, 0.12));
        drawing = false;
      }
      continue;
    }
    const roof = tubeRoof(game, worldX);
    const floor = surfaceY(game, worldX, 0.18);
    if (!drawing) {
      ctx.moveTo(x, floor);
      drawing = true;
    }
    ctx.lineTo(x, roof);
  }
  for (let x = W; x >= 0; x -= 6) {
    const worldX = game.scroll + x;
    const sec = sectionAt(game, worldX);
    const tube = sec && (sec.kind === "barrel" || (sec.kind === "closeout" && worldX >= sec.telegraphX));
    if (!tube) continue;
    ctx.lineTo(x, surfaceY(game, worldX, 0.18));
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(2, 8, 14, 0.72)";
  ctx.fill();
}

function drawTelegraph(ctx: CanvasRenderingContext2D, game: Game, foam: HTMLCanvasElement) {
  const px = playerX(game);
  const worldX = game.scroll + px;
  const sec = sectionAt(game, worldX);
  if (!sec || sec.kind !== "closeout" || worldX < sec.telegraphX) return;
  const u = Math.min(1, (worldX - sec.telegraphX) / Math.max(1, sec.x1 - sec.telegraphX));
  const x = px + 40 + u * 80;
  ctx.fillStyle = `rgba(239, 230, 212, ${0.2 + u * 0.45})`;
  ctx.fillRect(x, surfaceY(game, game.scroll + x, 0.7) - 8, 18 + u * 40, 70);
  ctx.drawImage(foam, x - 8, surfaceY(game, game.scroll + x, 0.82) - 6);
  ctx.fillStyle = `rgba(255, 46, 196, ${0.15 + u * 0.35})`;
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  ctx.fillText(WAVE_COPY.closeout, x + 20, surfaceY(game, game.scroll + x, 0.9) - 16);
}

function drawSurfer(
  ctx: CanvasRenderingContext2D,
  game: Game,
  reduce: boolean,
) {
  const px = playerX(game);
  const worldX = game.scroll + px;
  const sit = surfaceY(game, worldX, game.rail) - PLAYER_H;
  const y = sit - game.hop + (game.dead ? Math.min(48, game.deadT * 110) : 0);
  const spin = game.dead ? game.deadT * 10 : 0;
  const tucked = game.tucked && !game.dead;
  ctx.save();
  ctx.translate(px + PLAYER_W / 2, y + PLAYER_H / 2);
  ctx.rotate(spin);
  ctx.translate(-(px + PLAYER_W / 2), -(y + PLAYER_H / 2));

  const bob = game.grounded && !reduce && !tucked ? Math.sin(game.t * 10) * 1.1 : 0;
  const boardY = y + PLAYER_H - (tucked ? 10 : 6) + bob;
  ctx.fillStyle = "rgba(4, 16, 24, 0.35)";
  ctx.beginPath();
  ctx.ellipse(px + PLAYER_W / 2, boardY + 8, tucked ? 20 : 16, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff7a18";
  roundRect(ctx, px - (tucked ? 12 : 8), boardY, PLAYER_W + (tucked ? 24 : 16), 6, 3);
  ctx.fill();
  ctx.strokeStyle = "#ffe08a";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  if (!tucked) {
    ctx.strokeStyle = "#041018";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(px + 6, boardY);
    ctx.lineTo(px + 8, y + 16 + bob);
    ctx.moveTo(px + PLAYER_W - 4, boardY);
    ctx.lineTo(px + PLAYER_W - 2, y + 16 + bob);
    ctx.stroke();
    ctx.fillStyle = game.pumping ? "#7cffb2" : "#3dfff3";
    roundRect(ctx, px + 3, y + 8 + bob, PLAYER_W - 6, 14, 3);
    ctx.fill();
    ctx.fillStyle = "#ff2ec4";
    ctx.beginPath();
    ctx.arc(px + PLAYER_W / 2, y + 6 + bob, 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#3dfff3";
    roundRect(ctx, px + 2, boardY - 8, PLAYER_W + 4, 8, 2);
    ctx.fill();
    ctx.fillStyle = "#ff2ec4";
    ctx.beginPath();
    ctx.arc(px + 8, boardY - 8, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (game.grounded && game.pumping) {
    ctx.fillStyle = "rgba(61, 255, 243, 0.5)";
    ctx.fillRect(px - 16, boardY + 2, 8, 2);
    ctx.fillRect(px - 26, boardY, 7, 1.5);
  }
  if (game.inBarrel) {
    ctx.fillStyle = "rgba(61, 255, 243, 0.25)";
    ctx.fillRect(px - 10, y + 4, PLAYER_W + 28, PLAYER_H);
  }
  ctx.restore();

  if (game.dead) {
    ctx.fillStyle = "rgba(239, 230, 212, 0.35)";
    for (let i = 0; i < 8; i += 1) {
      const ox = px + (i * 11) % 40 - 8;
      const oy = y + PLAYER_H + 4 + (i % 3) * 5;
      ctx.fillRect(ox, oy, 6, 2);
    }
  }
}

function drawHud(
  ctx: CanvasRenderingContext2D,
  game: Game,
  credits: number,
  font: string,
  best: number,
) {
  const W = game.w;
  const H = game.h;
  const meters = Math.floor(metersOf(game));
  ctx.textAlign = "left";
  ctx.font = pixelFont(9, font);
  ctx.fillStyle = "#7cffb2";
  ctx.fillText(WAVE_COPY.title, 14, 18);
  ctx.fillStyle = "#efe6d4";
  ctx.font = pixelFont(13, font);
  ctx.fillText(`${meters}m`, 14, 36);
  ctx.font = pixelFont(9, font);
  ctx.fillStyle = game.inBarrel ? "#3dfff3" : "rgba(122, 208, 224, 0.9)";
  ctx.fillText(`${WAVE_COPY.barrel} ${game.barrelS.toFixed(1)}s`, 14, 50);
  ctx.fillStyle = "rgba(122, 208, 224, 0.7)";
  ctx.fillText(`SET ${waveOf(game.t)}`, 14, 64);

  ctx.textAlign = "right";
  ctx.fillStyle = "#ff7a18";
  ctx.font = pixelFont(11, font);
  ctx.fillText(String(scoreOf(game)).padStart(6, "0"), W - 14, 22);
  ctx.fillStyle = "#7ad0e0";
  ctx.font = pixelFont(9, font);
  ctx.fillText(`${credits} CR`, W - 14, 38);
  if (best > 0) {
    ctx.fillStyle = "rgba(255, 122, 24, 0.8)";
    ctx.fillText(`BEST ${Math.floor(best)}m`, W - 14, 52);
  }

  if (game.overlay) {
    ctx.fillStyle = "rgba(4, 16, 24, 0.62)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ff2ec4";
    ctx.font = pixelFont(14, font);
    ctx.fillText(WAVE_COPY.wipeout, W / 2, H * 0.36);
    ctx.fillStyle = "#efe6d4";
    ctx.font = pixelFont(12, font);
    ctx.fillText(`${meters}m · ${game.barrelS.toFixed(1)}s ${WAVE_COPY.barrel}`, W / 2, H * 0.44);
    if (game.reason) {
      ctx.fillStyle = "#3dfff3";
      ctx.font = pixelFont(9, font);
      ctx.fillText(game.reason === "closeout" ? WAVE_COPY.closeout : game.reason.toUpperCase(), W / 2, H * 0.52);
    }
    ctx.fillStyle = "#ff7a18";
    ctx.font = pixelFont(12, font);
    ctx.fillText(
      credits > 0 ? WAVE_COPY.nextLife : `INSERT ${ARCADE_PRICE_SATS} SATS`,
      W / 2,
      H * 0.62,
    );
  }
}

function draw(
  ctx: CanvasRenderingContext2D,
  game: Game,
  cache: OceanCache,
  {
    credits,
    reduce,
    font,
    best,
  }: {
    credits: number;
    reduce: boolean;
    font: string;
    best: number;
  },
) {
  const W = game.w;
  const H = game.h;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (game.shake > 0 && !reduce) {
    const mag = game.shake * 7;
    ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
  }
  ctx.drawImage(cache.sky, 0, 0, W, H);
  const drift = ((game.scroll * 0.18) % W + W) % W;
  ctx.drawImage(cache.swell, -drift, 0, W, H);
  ctx.drawImage(cache.swell, W - drift, 0, W, H);
  drawFace(ctx, game);
  drawBarrel(ctx, game);
  drawTelegraph(ctx, game, cache.foam);
  const foamY = surfaceY(game, game.scroll + 40, 0.62);
  ctx.drawImage(cache.foam, (40 - (game.scroll * 0.4) % 60 + 60) % W, foamY - 4);
  drawSurfer(ctx, game, reduce);
  if (game.flash > 0) {
    ctx.fillStyle = `rgba(255, 46, 196, ${game.flash * 0.28})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (game.near > 0 && !game.overlay) {
    ctx.fillStyle = `rgba(61, 255, 243, ${game.near * 0.1})`;
    ctx.fillRect(0, 0, W, H);
  }
  drawHud(ctx, game, credits, font, best);
  ctx.restore();
}

export const WaveRunner = forwardRef<
  WaveRunnerHandle,
  {
    onWipeout: (run: WaveRun) => void;
    onNextLife?: () => Promise<boolean>;
    credits?: number;
  }
>(function WaveRunner({ onWipeout, onNextLife, credits = 0 }, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hopRef = useRef<() => void>(() => undefined);
  const endRef = useRef(onWipeout);
  const lifeRef = useRef(onNextLife);
  const creditsRef = useRef(credits);
  endRef.current = onWipeout;
  lifeRef.current = onNextLife;
  creditsRef.current = credits;

  useImperativeHandle(ref, () => ({
    hop: () => hopRef.current(),
  }));

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const canvas: HTMLCanvasElement = el;
    const gfx = canvas.getContext("2d");
    if (!gfx) return;

    const game = emptyGame(480, VIEW_H, (Date.now() % 1_000_000) | 0);
    let cache: OceanCache | null = null;
    let bestM = 0;
    try {
      const raw = window.localStorage.getItem(BEST_KEY);
      if (raw) bestM = JSON.parse(raw).meters ?? 0;
    } catch {
      bestM = 0;
    }
    let reported = false;
    let lifeLock = false;
    let holdAt = 0;
    let pumping = false;
    const pointers = new Map<number, { x: number; y: number }>();

    hopRef.current = () => {
      if (game.overlay) {
        game.wantLife = true;
        return;
      }
      hopGame(game);
      blip("hop");
    };

    let frame = 0;
    let last = performance.now();
    let alive = true;
    let wasBarrel = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const font =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-arcade-pixel")
        .trim() || "monospace";

    function resize() {
      const surface = canvasRef.current;
      if (!surface) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = surface.getBoundingClientRect();
      surface.width = Math.max(1, Math.floor(rect.width * dpr));
      surface.height = Math.max(1, Math.floor(rect.height * dpr));
      game.w = viewWidth(rect.width, rect.height);
      game.h = VIEW_H;
      cache = oceanCache(game.w, game.h, null);
    }

    function loop(now: number) {
      const surface = canvasRef.current;
      if (!alive || !gfx || !cache || !surface) return;
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      setPump(game, pumping && !game.dead);
      step(game, dt);
      if (game.inBarrel && !wasBarrel) blip("barrel");
      wasBarrel = game.inBarrel;
      gfx.setTransform(surface.width / game.w, 0, 0, surface.height / game.h, 0, 0);
      draw(gfx, game, cache, {
        credits: creditsRef.current,
        reduce,
        font,
        best: bestM,
      });
      if (game.overlay && !reported) {
        reported = true;
        if (game.dead && game.deadT > 0) blip("wipe");
        endRef.current({
          score: scoreOf(game),
          meters: metersOf(game),
          barrelS: game.barrelS,
          reason: game.reason,
          seed: game.seed,
        });
      }
      if (game.wantLife && !lifeLock) {
        game.wantLife = false;
        if (creditsRef.current < 1) {
          // parent overlay handles insert
        } else {
          lifeLock = true;
          void Promise.resolve(lifeRef.current?.()).then((ok) => {
            lifeLock = false;
            if (ok) {
              reported = false;
              respawnGame(game);
            }
          });
        }
      }
      frame = window.requestAnimationFrame(loop);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (document.body.dataset.arcadeFront === "retro") return;
      if (event.repeat) return;
      if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        holdAt = performance.now();
        pumping = true;
      }
      if (event.code === "ArrowDown" || event.code === "KeyS") {
        event.preventDefault();
        setTuck(game, true);
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      if (document.body.dataset.arcadeFront === "retro") return;
      if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        const held = (performance.now() - holdAt) / 1000;
        pumping = false;
        setPump(game, false);
        if (held <= TAP_S) hopRef.current();
      }
      if (event.code === "ArrowDown" || event.code === "KeyS") {
        setTuck(game, false);
      }
    }

    function onPointerDown(event: PointerEvent) {
      event.preventDefault();
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      try {
        canvasRef.current?.setPointerCapture(event.pointerId);
      } catch {
        // ignore
      }
      if (pointers.size === 1) {
        holdAt = performance.now();
        pumping = true;
      } else {
        setTuck(game, true);
      }
    }

    function onPointerMove(event: PointerEvent) {
      const prev = pointers.get(event.pointerId);
      if (!prev) return;
      if (pointers.size > 1 && event.clientY - prev.y > 18) setTuck(game, true);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    function onPointerUp(event: PointerEvent) {
      event.preventDefault();
      pointers.delete(event.pointerId);
      if (pointers.size === 0) {
        const held = (performance.now() - holdAt) / 1000;
        pumping = false;
        setPump(game, false);
        if (held <= TAP_S) hopRef.current();
      }
      if (pointers.size < 2) setTuck(game, false);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    frame = window.requestAnimationFrame(loop);

    return () => {
      alive = false;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="wave-runner-canvas"
      aria-label="WAVE RUNNER. Hold to pump. Tap to hop. Down to tuck."
      onContextMenu={(event) => event.preventDefault()}
    />
  );
});
