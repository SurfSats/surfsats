"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import {
  PLAYER_H,
  PLAYER_W,
  VIEW_H,
  emptyGame,
  hopGame,
  playerX,
  scoreOf,
  step,
  surfaceY,
  viewWidth,
  waveOf,
  type Game,
} from "@/lib/wave-runner";

export type WaveRunnerHandle = {
  hop: () => void;
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

function swellY(worldX: number, base: number, amp: number, phase: number) {
  return (
    base +
    amp * Math.sin(worldX * 0.014 + phase) +
    amp * 0.45 * Math.sin(worldX * 0.033 + phase * 1.7)
  );
}

function drawSwell(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scroll: number,
  speed: number,
  base: number,
  amp: number,
  phase: number,
  fill: string,
) {
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, swellY(scroll * speed, base, amp, phase));
  for (let x = 0; x <= w; x += 8) {
    ctx.lineTo(x, swellY(scroll * speed + x, base, amp, phase));
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function pixelFont(size: number, family: string) {
  return `${size}px ${family}, monospace`;
}

function draw(
  ctx: CanvasRenderingContext2D,
  game: Game,
  {
    credits,
    reduce,
    hint,
    font,
  }: {
    credits: number;
    reduce: boolean;
    hint: string;
    font: string;
  },
) {
  const W = game.w;
  const H = game.h;
  const drift = game.started ? game.scroll : game.t * 28;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (game.shake > 0 && !reduce) {
    const mag = game.shake * 8;
    ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
  }

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#071422");
  sky.addColorStop(0.42, "#12384a");
  sky.addColorStop(0.72, "#0a2430");
  sky.addColorStop(1, "#041018");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const sunX = W * 0.78;
  const sunY = H * 0.22;
  const sun = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 70);
  sun.addColorStop(0, "rgba(255, 122, 24, 0.55)");
  sun.addColorStop(0.45, "rgba(255, 122, 24, 0.12)");
  sun.addColorStop(1, "rgba(255, 122, 24, 0)");
  ctx.fillStyle = sun;
  ctx.fillRect(sunX - 80, sunY - 80, 160, 160);
  ctx.fillStyle = "#ff7a18";
  ctx.beginPath();
  ctx.arc(sunX, sunY, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(239, 230, 212, 0.55)";
  for (let i = 0; i < 22; i += 1) {
    const x = ((i * 73 + drift * 0.12) % W + W) % W;
    const y = 10 + ((i * 47) % (H * 0.38));
    ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
  }

  drawSwell(ctx, W, H, drift, 0.18, H * 0.52, 14, 0.4, "rgba(8, 36, 48, 0.9)");
  drawSwell(ctx, W, H, drift, 0.38, H * 0.58, 16, 1.1, "rgba(12, 52, 64, 0.88)");

  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, surfaceY(drift, H));
  for (let x = 0; x <= W; x += 5) {
    ctx.lineTo(x, surfaceY(drift + x, H));
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  const water = ctx.createLinearGradient(0, H * 0.52, 0, H);
  water.addColorStop(0, "rgba(61, 255, 243, 0.42)");
  water.addColorStop(0.28, "rgba(18, 90, 110, 0.85)");
  water.addColorStop(1, "rgba(4, 16, 24, 0.98)");
  ctx.fillStyle = water;
  ctx.fill();

  ctx.beginPath();
  for (let x = 0; x <= W; x += 4) {
    const y = surfaceY(drift + x, H);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "#efe6d4";
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.beginPath();
  for (let x = 0; x <= W; x += 4) {
    const y = surfaceY(drift + x, H) + 3;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "#3dfff3";
  ctx.lineWidth = 2.6;
  ctx.stroke();

  ctx.fillStyle = "rgba(239, 230, 212, 0.7)";
  for (let i = 0; i < 16; i += 1) {
    const x = ((i * 61 + drift * 0.92) % W + W) % W;
    const y = surfaceY(drift + x, H) - 2;
    ctx.fillRect(x, y, 4 + (i % 3), 1.5);
  }

  ctx.strokeStyle = "rgba(61, 255, 243, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    const y0 = H * 0.78 + i * 10;
    ctx.moveTo(0, y0);
    for (let x = 0; x <= W; x += 16) {
      ctx.lineTo(
        x,
        y0 + Math.sin((drift + x) * 0.03 + i) * 3,
      );
    }
    ctx.stroke();
  }

  for (const sat of game.pickups) {
    if (sat.taken) continue;
    drawSat(ctx, sat.x - drift, sat.y, sat.r, game.t);
  }

  for (const obs of game.obstacles) {
    const x = obs.x - drift;
    const top = surfaceY(obs.x, H) - obs.h;
    if (obs.kind === "spike") drawFin(ctx, x, top, obs.w, obs.h);
    else drawRock(ctx, x, top, obs.w, obs.h);
  }

  const px = playerX(game);
  const ground = surfaceY(drift + px, H) - PLAYER_H;
  const y = ground - game.hop + (game.dead ? Math.min(40, game.deadT * 90) : 0);
  const spin = game.dead ? game.deadT * 8 : 0;
  ctx.save();
  ctx.translate(px + PLAYER_W / 2, y + PLAYER_H / 2);
  ctx.rotate(spin);
  ctx.translate(-(px + PLAYER_W / 2), -(y + PLAYER_H / 2));
  drawSurfer(ctx, px, y, game.grounded, game.t, reduce);
  ctx.restore();

  for (const floater of game.floaters) {
    const lift = floater.t * 28;
    ctx.globalAlpha = Math.max(0, 1 - floater.t / 0.7);
    ctx.font = pixelFont(10, font);
    ctx.fillStyle = floater.text === "CLOSE" ? "#3dfff3" : "#ff7a18";
    ctx.textAlign = "center";
    ctx.fillText(floater.text, floater.x, floater.y - lift);
    ctx.globalAlpha = 1;
  }

  ctx.textAlign = "left";
  ctx.font = pixelFont(9, font);
  ctx.fillStyle = "#7cffb2";
  ctx.fillText("WAVE RUNNER", 14, 20);
  ctx.fillStyle = game.near > 0.2 ? "#3dfff3" : "#efe6d4";
  ctx.font = pixelFont(13, font);
  ctx.fillText(String(Math.floor(game.scoreShow)).padStart(6, "0"), 14, 38);
  ctx.font = pixelFont(9, font);
  ctx.fillStyle = "rgba(122, 208, 224, 0.85)";
  ctx.fillText(`W${waveOf(game.started ? game.t : 0)}`, 14, 54);

  ctx.textAlign = "right";
  ctx.fillStyle = "#ff7a18";
  ctx.font = pixelFont(11, font);
  ctx.fillText(`${game.sats} SATS`, W - 14, 22);
  ctx.fillStyle = "#7ad0e0";
  ctx.font = pixelFont(9, font);
  ctx.fillText(
    `${credits} CR`,
    W - 14,
    38,
  );

  if (!game.started) {
    ctx.textAlign = "center";
    ctx.font = pixelFont(12, font);
    ctx.fillStyle = "#efe6d4";
    const blink = reduce || Math.floor(game.t * 2) % 2 === 0;
    ctx.globalAlpha = blink ? 1 : 0.38;
    ctx.shadowColor = "rgba(4, 16, 24, 0.9)";
    ctx.shadowBlur = 10;
    ctx.fillText(hint, W / 2, H * 0.42);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  if (game.flash > 0) {
    ctx.fillStyle = `rgba(255, 46, 196, ${game.flash * 0.28})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (game.near > 0) {
    ctx.fillStyle = `rgba(61, 255, 243, ${game.near * 0.1})`;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.restore();
}

function drawSat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  t: number,
) {
  const pulse = r + Math.sin(t * 8 + x) * 1.1;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "rgba(255, 224, 138, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, pulse + 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = "#ff7a18";
  ctx.fillRect(-pulse, -pulse, pulse * 2, pulse * 2);
  ctx.strokeStyle = "#ffe08a";
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-pulse, -pulse, pulse * 2, pulse * 2);
  ctx.fillStyle = "#ffe08a";
  ctx.fillRect(-pulse * 0.38, -pulse * 0.38, pulse * 0.76, pulse * 0.76);
  ctx.restore();
}

function drawRock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w * 0.12, y + h * 0.38);
  ctx.lineTo(x + w * 0.38, y);
  ctx.lineTo(x + w * 0.72, y + h * 0.18);
  ctx.lineTo(x + w, y + h * 0.42);
  ctx.lineTo(x + w * 0.92, y + h);
  ctx.closePath();
  ctx.fillStyle = "#2a1420";
  ctx.fill();
  ctx.strokeStyle = "#ff2ec4";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 122, 24, 0.35)";
  ctx.beginPath();
  ctx.moveTo(x + w * 0.22, y + h * 0.42);
  ctx.lineTo(x + w * 0.38, y + 4);
  ctx.lineTo(x + w * 0.5, y + h * 0.28);
  ctx.closePath();
  ctx.fill();
}

function drawFin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w * 0.46, y);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fillStyle = "#4a1230";
  ctx.fill();
  ctx.strokeStyle = "#ff7a18";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w * 0.46, y + 6);
  ctx.lineTo(x + w * 0.7, y + h);
  ctx.lineTo(x + w * 0.46, y + h);
  ctx.closePath();
  ctx.fillStyle = "#ff2ec4";
  ctx.fill();
}

function drawSurfer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  grounded: boolean,
  t: number,
  reduce: boolean,
) {
  const bob = grounded && !reduce ? Math.sin(t * 10) * 1.2 : 0;
  const boardY = y + PLAYER_H - 6 + bob;

  ctx.fillStyle = "rgba(4, 16, 24, 0.35)";
  ctx.beginPath();
  ctx.ellipse(x + PLAYER_W / 2, boardY + 8, 16, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ff7a18";
  roundRect(ctx, x - 8, boardY, PLAYER_W + 16, 6, 3);
  ctx.fill();
  ctx.strokeStyle = "#ffe08a";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = "#c45a10";
  ctx.fillRect(x + PLAYER_W + 6, boardY + 2, 5, 3);

  ctx.strokeStyle = "#041018";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x + 6, boardY);
  ctx.lineTo(x + 8, y + 16 + bob);
  ctx.moveTo(x + PLAYER_W - 4, boardY);
  ctx.lineTo(x + PLAYER_W - 2, y + 16 + bob);
  ctx.stroke();

  ctx.fillStyle = "#3dfff3";
  roundRect(ctx, x + 3, y + 8 + bob, PLAYER_W - 6, 14, 3);
  ctx.fill();
  ctx.strokeStyle = "#041018";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.strokeStyle = "#3dfff3";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(x + PLAYER_W - 2, y + 12 + bob);
  ctx.lineTo(x + PLAYER_W + 8, y + 6 + bob);
  ctx.stroke();

  ctx.fillStyle = "#ff2ec4";
  ctx.beginPath();
  ctx.arc(x + PLAYER_W / 2, y + 6 + bob, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#efe6d4";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  if (grounded) {
    ctx.fillStyle = "rgba(61, 255, 243, 0.45)";
    ctx.fillRect(x - 14, boardY + 3, 6, 2);
    ctx.fillRect(x - 22, boardY + 1, 5, 1.5);
  }
}

export const WaveRunner = forwardRef<
  WaveRunnerHandle,
  {
    onWipeout: (score: number) => void;
    credits?: number;
  }
>(function WaveRunner({ onWipeout, credits = 0 }, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hopRef = useRef<() => void>(() => undefined);
  const endRef = useRef(onWipeout);
  const creditsRef = useRef(credits);
  endRef.current = onWipeout;
  creditsRef.current = credits;

  useImperativeHandle(ref, () => ({
    hop: () => hopRef.current(),
  }));

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const surface = node;
    const gfx = surface.getContext("2d");
    if (!gfx) return;

    const game = emptyGame();
    hopRef.current = () => hopGame(game);

    let frame = 0;
    let last = performance.now();
    let alive = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const hint = coarse ? "TAP TO HOP" : "TAP / SPACE TO HOP";
    const font =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-arcade-pixel")
        .trim() || "monospace";

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = surface.getBoundingClientRect();
      surface.width = Math.max(1, Math.floor(rect.width * dpr));
      surface.height = Math.max(1, Math.floor(rect.height * dpr));
      game.w = viewWidth(rect.width, rect.height);
      game.h = VIEW_H;
    }

    function loop(now: number) {
      if (!alive || !gfx) return;
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      step(game, dt);
      gfx.setTransform(surface.width / game.w, 0, 0, surface.height / game.h, 0, 0);
      draw(gfx, game, {
        credits: creditsRef.current,
        reduce,
        hint,
        font,
      });
      if (game.dead && game.deadT > 0.85 && !game.ended) {
        game.ended = true;
        endRef.current(scoreOf(game));
        return;
      }
      frame = window.requestAnimationFrame(loop);
    }

    function onKey(event: KeyboardEvent) {
      if (document.body.dataset.arcadeFront === "retro") return;
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
      onContextMenu={(event) => event.preventDefault()}
    />
  );
});
