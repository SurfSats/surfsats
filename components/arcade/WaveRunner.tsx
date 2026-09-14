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
  coachAlpha,
  emptyGame,
  ghostThink,
  hopGame,
  isStalling,
  metersOf,
  playerX,
  primeGhostCourse,
  respawnGame,
  scoreOf,
  sectionAt,
  setPump,
  setTuck,
  step,
  surfaceY,
  viewWidth,
  waveOf,
  wipeoutLine,
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

type WaveSkin = {
  rider: HTMLImageElement | null;
  board: HTMLImageElement | null;
  foam: HTMLImageElement | null;
  lip: HTMLImageElement | null;
  barrel: HTMLImageElement | null;
  closeout: HTMLImageElement | null;
  water: HTMLImageElement | null;
};

const SKIN_DIR = "/arcade/wave-runner";
const SKIN_FILES = [
  "rider",
  "board",
  "foam",
  "lip",
  "barrel",
  "closeout",
  "water",
] as const;

function emptySkin(): WaveSkin {
  return {
    rider: null,
    board: null,
    foam: null,
    lip: null,
    barrel: null,
    closeout: null,
    water: null,
  };
}

function loadSkinImage(name: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `${SKIN_DIR}/${name}.png`;
  });
}

async function loadWaveSkin() {
  const skin = emptySkin();
  const loaded = await Promise.all(
    SKIN_FILES.map(async (name) => [name, await loadSkinImage(name)] as const),
  );
  for (const [name, img] of loaded) skin[name] = img;
  return skin;
}

function riderFrame(game: Game) {
  if (game.dead) return 4;
  if (game.tucked) return 3;
  if (!game.grounded || game.hop > 2) return 2;
  if (game.pumping) return 1;
  return 0;
}

function drawClippedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (w <= 1 || h <= 1) return;
  ctx.save();
  ctx.clip();
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
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

function lipYAt(game: Game, screenX: number) {
  return surfaceY(game, game.scroll + screenX, 0.94);
}

function troughYAt(game: Game, screenX: number) {
  return surfaceY(game, game.scroll + screenX, 0.06);
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  game: Game,
  foam: HTMLCanvasElement,
  skin: WaveSkin,
) {
  const W = game.w;
  const H = game.h;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 6) ctx.lineTo(x, troughYAt(game, x));
  ctx.lineTo(W, H);
  ctx.closePath();
  if (skin.water) {
    ctx.save();
    ctx.clip();
    const iw = Math.max(32, skin.water.width);
    const ih = Math.max(32, skin.water.height);
    for (let y = Math.floor(H * 0.4); y < H; y += ih) {
      for (let x = 0; x < W; x += iw) ctx.drawImage(skin.water, x, y, iw, ih);
    }
    ctx.restore();
  } else {
    const mass = ctx.createLinearGradient(0, H * 0.5, 0, H);
    mass.addColorStop(0, "#0a3040");
    mass.addColorStop(1, "#041018");
    ctx.fillStyle = mass;
    ctx.fill();
  }

  ctx.beginPath();
  for (let x = 0; x <= W; x += 5) {
    if (x === 0) ctx.moveTo(x, lipYAt(game, x));
    else ctx.lineTo(x, lipYAt(game, x));
  }
  for (let x = W; x >= 0; x -= 5) ctx.lineTo(x, troughYAt(game, x));
  ctx.closePath();
  const face = ctx.createLinearGradient(0, H * 0.22, W * 0.35, H * 0.78);
  face.addColorStop(0, "#c8fff6");
  face.addColorStop(0.18, "#7cffb2");
  face.addColorStop(0.42, "#3dfff3");
  face.addColorStop(0.72, "#14708a");
  face.addColorStop(1, "#0a2430");
  ctx.fillStyle = face;
  ctx.fill();

  if (skin.lip) {
    const tile = Math.max(16, skin.lip.width);
    const hh = Math.max(10, Math.min(28, skin.lip.height));
    for (let x = 0; x < W; x += tile - 2) {
      ctx.drawImage(skin.lip, x, lipYAt(game, x) - hh * 0.65, tile, hh);
    }
  } else {
    ctx.beginPath();
    for (let x = 0; x <= W; x += 4) {
      if (x === 0) ctx.moveTo(x, lipYAt(game, x) - 2);
      else ctx.lineTo(x, lipYAt(game, x) - 2);
    }
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = "#efe6d4";
    ctx.lineWidth = 3.2;
    ctx.stroke();
  }
  const foamImg = skin.foam ?? foam;
  for (let x = 8; x < W; x += 28) {
    ctx.drawImage(foamImg, x - 18, lipYAt(game, x) - 10);
  }
}

function drawBarrel(ctx: CanvasRenderingContext2D, game: Game, skin: WaveSkin) {
  const seen = new Set<number>();
  for (const sec of game.sections) {
    if (sec.kind !== "barrel") continue;
    if (seen.has(sec.x0)) continue;
    seen.add(sec.x0);
    const x0 = sec.x0 - game.scroll;
    const x1 = sec.x1 - game.scroll;
    if (x1 < -20 || x0 > game.w + 20) continue;
    const cx = (x0 + x1) / 2;
    const lip = lipYAt(game, cx);
    const trough = troughYAt(game, cx);
    const cy = lip + (trough - lip) * 0.42;
    const rx = Math.min(86, Math.max(36, (x1 - x0) * 0.32));
    const ry = Math.max(22, (trough - lip) * 0.34);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (skin.barrel) {
      drawClippedImage(ctx, skin.barrel, cx - rx, cy - ry, rx * 2, ry * 2);
    } else {
      ctx.fillStyle = "#02080e";
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - rx * 0.12, cy, rx * 0.72, ry * 0.7, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(4, 16, 24, 0.92)";
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(61, 255, 243, 0.45)";
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx + rx * 0.15, cy - ry * 0.08, rx * 0.92, ry * 0.86, 0, -0.4, 1.1);
    ctx.strokeStyle = "rgba(239, 230, 212, 0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawCloseout(
  ctx: CanvasRenderingContext2D,
  game: Game,
  foam: HTMLCanvasElement,
  skin: WaveSkin,
) {
  for (const sec of game.sections) {
    if (sec.kind !== "closeout") continue;
    const x0 = sec.telegraphX - game.scroll;
    const x1 = sec.x1 - game.scroll;
    if (x1 < 0 || x0 > game.w) continue;
    const worldX = game.scroll + playerX(game);
    if (worldX < sec.telegraphX) continue;
    const u = Math.min(1, Math.max(0, (worldX - sec.telegraphX) / Math.max(1, sec.x1 - sec.telegraphX)));
    const x = x0 + u * Math.max(24, x1 - x0);
    const lip = lipYAt(game, x);
    const trough = troughYAt(game, x);
    const flash = 0.55 + 0.45 * Math.abs(Math.sin(game.t * 22));
    ctx.beginPath();
    ctx.moveTo(x - 10, lip - 8);
    for (let i = 0; i <= 8; i += 1) {
      const yy = lip + ((trough - lip) * i) / 8;
      ctx.lineTo(x + (i % 2 === 0 ? 28 + u * 36 : 8) + Math.sin(game.t * 30 + i) * 6, yy);
    }
    ctx.lineTo(x - 16, trough + 10);
    ctx.closePath();
    if (skin.closeout) {
      const wallW = 40 + u * 48;
      drawClippedImage(ctx, skin.closeout, x - 16, lip - 8, wallW, trough - lip + 20);
    } else {
      ctx.fillStyle = `rgba(239, 230, 212, ${0.35 + u * 0.5 * flash})`;
      ctx.fill();
      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * flash})`;
      ctx.fill();
    }
    const foamImg = skin.foam ?? foam;
    ctx.drawImage(foamImg, x - 8, lip - 6);
    ctx.drawImage(foamImg, x + 10, lip + 10);
    if (u < 0.7) {
      ctx.fillStyle = `rgba(255, 46, 196, ${0.55 + flash * 0.35})`;
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.fillText(WAVE_COPY.closeout, x + 8, lip - 14);
    }
  }
}

function drawSurfer(
  ctx: CanvasRenderingContext2D,
  game: Game,
  reduce: boolean,
  skin: WaveSkin,
) {
  const px = playerX(game);
  const worldX = game.scroll + px;
  const tucked = game.tucked && !game.dead;
  const sit = surfaceY(game, worldX, tucked ? Math.min(game.rail, 0.62) : game.rail) - PLAYER_H;
  const pop = game.hop;
  const y = sit - pop + (game.dead ? Math.min(52, game.deadT * 120) : 0);
  const tilt = game.dead
    ? game.deadT * 9
    : pop > 2
      ? -0.35
      : tucked
        ? 0.18
        : game.pumping
          ? -0.08
          : 0;
  const bob = game.grounded && !reduce && !tucked ? Math.sin(game.t * 9) * 1.1 : 0;
  const cx = px + PLAYER_W / 2;
  const boardY = y + PLAYER_H - (tucked ? 8 : 5) + bob;

  ctx.save();
  ctx.translate(cx, boardY);
  ctx.rotate(tilt);
  ctx.translate(-cx, -boardY);

  ctx.fillStyle = "rgba(4, 16, 24, 0.4)";
  ctx.beginPath();
  ctx.ellipse(cx + 4, boardY + 7, tucked ? 22 : 18, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  if (skin.board) {
    const bw = tucked ? 52 : 44;
    const bh = tucked ? 10 : 8;
    ctx.drawImage(skin.board, cx - bw / 2, boardY - bh / 2, bw, bh);
  } else {
    ctx.fillStyle = "#ff7a18";
    ctx.beginPath();
    ctx.ellipse(cx, boardY, tucked ? 26 : 22, tucked ? 4.2 : 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffe08a";
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }

  if (skin.rider && skin.rider.width > 4) {
    const frames = 5;
    const fw = skin.rider.width / frames;
    const fh = skin.rider.height;
    const destW = PLAYER_W * 1.7;
    const destH = PLAYER_H * 1.35;
    ctx.drawImage(
      skin.rider,
      riderFrame(game) * fw,
      0,
      fw,
      fh,
      cx - destW / 2,
      y + bob - 4,
      destW,
      destH,
    );
  } else {
  ctx.fillStyle = "#041018";
  if (tucked) {
    ctx.beginPath();
    ctx.ellipse(cx - 4, boardY - 5, 13, 5.5, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff2ec4";
    ctx.beginPath();
    ctx.arc(cx - 14, boardY - 6, 3.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - 5, boardY);
    ctx.lineTo(cx - 7, y + 18 + bob);
    ctx.lineTo(cx - 2, y + 18 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 6, boardY);
    ctx.lineTo(cx + 9, y + 17 + bob);
    ctx.lineTo(cx + 3, y + 17 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 6, y + 20 + bob);
    ctx.lineTo(cx + 7, y + 20 + bob);
    ctx.lineTo(cx + 5, y + 8 + bob);
    ctx.lineTo(cx - 4, y + 8 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#041018";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx + 4, y + 12 + bob);
    ctx.quadraticCurveTo(cx + 16, y + 4 + bob, cx + 18, y + 10 + bob);
    ctx.stroke();
    ctx.fillStyle = "#ff2ec4";
    ctx.beginPath();
    ctx.arc(cx, y + 5 + bob, 5.2, 0, Math.PI * 2);
    ctx.fill();
  }
  }

  if (game.pumping && game.grounded && !tucked) {
    ctx.strokeStyle = "rgba(61, 255, 243, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 28, boardY + 1);
    ctx.lineTo(cx - 16, boardY + 3);
    ctx.moveTo(cx - 24, boardY - 3);
    ctx.lineTo(cx - 14, boardY);
    ctx.stroke();
  }
  if (isStalling(game)) {
    ctx.fillStyle = "rgba(239, 230, 212, 0.85)";
    ctx.beginPath();
    ctx.ellipse(cx + 20, boardY - 2, 10, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#efe6d4";
    ctx.font = "8px monospace";
    ctx.textAlign = "left";
    ctx.fillText(WAVE_COPY.stall, cx + 18, boardY - 10);
  }
  ctx.restore();

  if (game.dead) {
    ctx.fillStyle = "rgba(239, 230, 212, 0.4)";
    for (let i = 0; i < 10; i += 1) {
      ctx.fillRect(px + (i * 9) % 42 - 6, y + PLAYER_H + (i % 4) * 4, 7, 2);
    }
  }
}

function drawCoach(
  ctx: CanvasRenderingContext2D,
  game: Game,
  font: string,
  ghost: boolean,
) {
  const alpha = ghost ? 1 : coachAlpha(game.t);
  if (alpha <= 0.02) return;
  const W = game.w;
  const H = game.h;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  ctx.font = pixelFont(11, font);
  ctx.fillStyle = "#efe6d4";
  ctx.fillText(WAVE_COPY.coachHold, W / 2, H * 0.14);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(WAVE_COPY.coachTap, W / 2, H * 0.14 + 16);
  ctx.fillStyle = "#3dfff3";
  ctx.fillText(WAVE_COPY.coachDown, W / 2, H * 0.14 + 32);
  ctx.restore();
}

function drawHud(
  ctx: CanvasRenderingContext2D,
  game: Game,
  credits: number,
  font: string,
  best: number,
  ghost: boolean,
) {
  const W = game.w;
  const H = game.h;
  const meters = Math.floor(metersOf(game));
  ctx.textAlign = "left";
  ctx.font = pixelFont(9, font);
  ctx.fillStyle = "#7cffb2";
  ctx.fillText(ghost ? `${WAVE_COPY.title} · DEMO` : WAVE_COPY.title, 14, 18);
  if (!ghost) {
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
  }

  drawCoach(ctx, game, font, ghost);

  if (game.overlay && !ghost) {
    ctx.fillStyle = "rgba(4, 16, 24, 0.62)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ff2ec4";
    ctx.font = pixelFont(14, font);
    ctx.fillText(WAVE_COPY.wipeout, W / 2, H * 0.34);
    ctx.fillStyle = "#efe6d4";
    ctx.font = pixelFont(12, font);
    ctx.fillText(`${meters}m · ${game.barrelS.toFixed(1)}s ${WAVE_COPY.barrel}`, W / 2, H * 0.42);
    ctx.fillStyle = "#3dfff3";
    ctx.font = pixelFont(10, font);
    ctx.fillText(wipeoutLine(game.reason), W / 2, H * 0.52);
    ctx.fillStyle = "#ff7a18";
    ctx.font = pixelFont(12, font);
    ctx.fillText(
      credits > 0 ? WAVE_COPY.nextLife : `INSERT ${ARCADE_PRICE_SATS} SATS`,
      W / 2,
      H * 0.64,
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
    ghost,
    skin,
  }: {
    credits: number;
    reduce: boolean;
    font: string;
    best: number;
    ghost: boolean;
    skin: WaveSkin;
  },
) {
  const W = game.w;
  const H = game.h;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (game.shake > 0 && !reduce && !ghost) {
    const mag = game.shake * 7;
    ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
  }
  ctx.drawImage(cache.sky, 0, 0, W, H);
  const drift = ((game.scroll * 0.18) % W + W) % W;
  ctx.drawImage(cache.swell, -drift, 0, W, H);
  ctx.drawImage(cache.swell, W - drift, 0, W, H);
  drawFace(ctx, game, cache.foam, skin);
  drawBarrel(ctx, game, skin);
  drawCloseout(ctx, game, cache.foam, skin);
  drawSurfer(ctx, game, reduce, skin);
  if (game.flash > 0 && !ghost) {
    ctx.fillStyle = `rgba(255, 46, 196, ${game.flash * 0.28})`;
    ctx.fillRect(0, 0, W, H);
  }
  drawHud(ctx, game, credits, font, best, ghost);
  ctx.restore();
}

export const WaveRunner = forwardRef<
  WaveRunnerHandle,
  {
    onWipeout: (run: WaveRun) => void;
    onNextLife?: () => Promise<boolean>;
    credits?: number;
    ghost?: boolean;
  }
>(function WaveRunner({ onWipeout, onNextLife, credits = 0, ghost = false }, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hopRef = useRef<() => void>(() => undefined);
  const endRef = useRef(onWipeout);
  const lifeRef = useRef(onNextLife);
  const creditsRef = useRef(credits);
  const ghostRef = useRef(ghost);
  endRef.current = onWipeout;
  lifeRef.current = onNextLife;
  creditsRef.current = credits;
  ghostRef.current = ghost;

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
    if (ghost) primeGhostCourse(game);
    let cache: OceanCache | null = null;
    let skin = emptySkin();
    void loadWaveSkin().then((loaded) => {
      skin = loaded;
    });
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
      if (ghostRef.current) return;
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
      if (ghostRef.current) ghostThink(game);
      else setPump(game, pumping && !game.dead);
      step(game, dt);
      if (ghostRef.current && game.dead && game.deadT > 0.55) {
        const w = game.w;
        const h = game.h;
        const next = emptyGame(w, h, (game.seed + 17) | 0);
        Object.assign(game, next);
        primeGhostCourse(game);
      }
      if (game.inBarrel && !wasBarrel) blip("barrel");
      wasBarrel = game.inBarrel;
      gfx.setTransform(surface.width / game.w, 0, 0, surface.height / game.h, 0, 0);
      draw(gfx, game, cache, {
        credits: creditsRef.current,
        reduce,
        font,
        best: bestM,
        ghost: ghostRef.current,
        skin,
      });
      if (game.overlay && !reported && !ghostRef.current) {
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
      if (ghostRef.current) return;
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
      if (ghostRef.current) return;
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
      if (ghostRef.current) return;
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
