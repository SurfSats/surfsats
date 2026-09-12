export const SETTLE_FILL_MS = 2400;
export const SETTLE_MS = SETTLE_FILL_MS;
export const SETTLE_HOLD_MS = 400;
export const SETTLE_MIN_MS = 2000;
export const SETTLE_MAX_MS = 4000;
export const SETTLE_WAIT_MS = 16;
export const SETTLE_REDUCED_SNAP_MS = 16;
export const SETTLE_CHECK_MS = 700;
export const SETTLE_RING_MS = 420;
export const SETTLE_CHECK_DRAW_MS = 280;
export const SETTLE_CHECK_AT = 260;
export const SETTLE_WARM_AT = 0.72;
export const SETTLE_PRICE_SATS = 21;
export const SETTLE_FIELD = "#07080c";
export const SETTLE_CHECK_COLOR = "#ff6a00";
export const SETTLE_CHECK_VIEWBOX = "0 0 88 88";
export const SETTLE_CHECK_PATH = "M30 45 L40 55 L60 33";
export const SETTLE_CHECK_PATH_WIDTH = 3.4;

export const SETTLE_CHECK_RING = {
  cx: 44,
  cy: 44,
  r: 30,
  width: 3,
} as const;

export const SETTLE_TITLES = {
  waiting: "WAITING",
  settling: "SETTLING THE TAB",
  settled: "TAB SETTLED",
} as const;

export const SETTLE_CLOCK = {
  holding: "PAID · HOLDING",
  final: "FINAL · NO DESK",
} as const;

export type SettlePhase = keyof typeof SETTLE_TITLES;
export type SettleMachine = "arcade" | "tab" | "graffiti" | "story" | "drop";
export type SettleFillStyle = "wave" | "threads" | "slash" | "hex";

export const SETTLE_FILL_STYLE: SettleFillStyle = "wave";

export const SETTLE_SUBTITLES = {
  arcade: {
    waiting: "scan the sheet · nothing moves yet",
    settling: "invoice paid · credits catching up",
    settled: "21 sats cleared · three credits",
  },
  tab: {
    waiting: "one stool · unpaid",
    settling: "invoice paid · stool is yours",
    settled: "21 sats cleared · door is open",
  },
  graffiti: {
    waiting: "can in hand · wall unpaid",
    settling: "invoice paid · can is live",
    settled: "21 sats cleared · on the wall",
  },
  story: {
    waiting: "one line · not inscribed",
    settling: "invoice paid · line hitting the book",
    settled: "21 sats cleared · inscribed",
  },
  drop: {
    waiting: "21 off the rail · unpaid",
    settling: "invoice paid · 21 leaving the dock",
    settled: "21 sats cleared · dropped",
  },
} as const satisfies Record<SettleMachine, Record<SettlePhase, string>>;

export type SettleFrame = {
  phase: SettlePhase;
  title: (typeof SETTLE_TITLES)[SettlePhase];
  done: boolean;
};

export type SettleFillStop = {
  at: number;
  color: string;
};

export type SettleFillFrame = {
  width: number;
  height: number;
  progress: number;
  time: number;
};

const COOL_STOPS: readonly SettleFillStop[] = [
  { at: 0, color: "#071428" },
  { at: 0.42, color: "#1246a8" },
  { at: 0.78, color: "#5aa4ff" },
  { at: 1, color: "#ffffff" },
];

const WARM_STOPS: readonly SettleFillStop[] = [
  { at: 0, color: "#3a0e00" },
  { at: 0.42, color: "#ff6a00" },
  { at: 0.78, color: "#ffb15a" },
  { at: 1, color: "#ffffff" },
];

export function clampSettleDuration(ms: number) {
  if (ms < SETTLE_MIN_MS) return SETTLE_MIN_MS;
  if (ms > SETTLE_MAX_MS) return SETTLE_MAX_MS;
  return ms;
}

export function settleCopy({
  machine,
  phase,
}: {
  machine: SettleMachine;
  phase: SettlePhase;
}) {
  return {
    title: SETTLE_TITLES[phase],
    subtitle: SETTLE_SUBTITLES[machine][phase],
    kicker: `${machine} · ${SETTLE_PRICE_SATS} sats`,
    clock: phase === "settled" ? SETTLE_CLOCK.final : SETTLE_CLOCK.holding,
  };
}

export function settlePhaseAt({
  elapsed,
  duration = SETTLE_FILL_MS,
  hold = SETTLE_HOLD_MS,
  reducedMotion = false,
}: {
  elapsed: number;
  duration?: number;
  hold?: number;
  reducedMotion?: boolean;
}): SettleFrame {
  const t = elapsed < 0 ? 0 : elapsed;

  if (reducedMotion) {
    if (t < SETTLE_REDUCED_SNAP_MS) {
      return {
        phase: "waiting",
        title: SETTLE_TITLES.waiting,
        done: false,
      };
    }
    return {
      phase: "settled",
      title: SETTLE_TITLES.settled,
      done: t >= hold,
    };
  }

  const fillMs = clampSettleDuration(duration);
  const settlingAt = SETTLE_WAIT_MS;
  const settledAt = SETTLE_WAIT_MS + fillMs;
  const doneAt = settledAt + SETTLE_CHECK_MS + hold;

  if (t < settlingAt) {
    return {
      phase: "waiting",
      title: SETTLE_TITLES.waiting,
      done: false,
    };
  }
  if (t < settledAt) {
    return {
      phase: "settling",
      title: SETTLE_TITLES.settling,
      done: false,
    };
  }
  return {
    phase: "settled",
    title: SETTLE_TITLES.settled,
    done: t >= doneAt,
  };
}

export function fillWarm(progress: number) {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  if (p <= SETTLE_WARM_AT) return 0;
  return (p - SETTLE_WARM_AT) / (1 - SETTLE_WARM_AT);
}

function hexToRgb(hex: string): readonly [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(a: string, b: string, t: number) {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  if (u === 0) return a;
  if (u === 1) return b;
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * u);
  const g = Math.round(ag + (bg - ag) * u);
  const bl = Math.round(ab + (bb - ab) * u);
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

export function fillStops(progress: number): SettleFillStop[] {
  const warm = fillWarm(progress);
  if (warm <= 0) return COOL_STOPS.map((stop) => ({ ...stop }));
  if (warm >= 1) return WARM_STOPS.map((stop) => ({ ...stop }));
  return COOL_STOPS.map((cool, i) => {
    const hot = WARM_STOPS[i];
    return {
      at: cool.at,
      color: hot ? mixHex(cool.color, hot.color, warm) : cool.color,
    };
  });
}

export function waveLipOffset({
  y,
  height,
  time,
}: {
  y: number;
  height: number;
  time: number;
}) {
  const ny = y / Math.max(height, 1);
  return (
    Math.sin(ny * Math.PI * 2 * 1.15 + time * 2.15) * 14 +
    Math.sin(ny * Math.PI * 2 * 2.35 + time * 1.32) * 6.5 +
    Math.sin(time * 0.52) * 5
  );
}

function paintField(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  ctx.fillStyle = SETTLE_FIELD;
  ctx.fillRect(0, 0, width, height);
}

function paintFill(
  ctx: CanvasRenderingContext2D,
  frame: SettleFillFrame,
  lipX: (y: number) => number,
) {
  const { width, height, progress } = frame;
  paintField(ctx, width, height);
  if (progress <= 0 || width <= 0 || height <= 0) return;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let y = 0; y <= height; y += 1) {
    const x = Math.max(-12, Math.min(width + 12, lipX(y)));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(0, height);
  ctx.closePath();

  const front = Math.max(1, progress * width);
  const gradient = ctx.createLinearGradient(0, 0, front, 0);
  for (const stop of fillStops(progress)) {
    gradient.addColorStop(stop.at, stop.color);
  }
  ctx.fillStyle = gradient;
  ctx.fill();

  const midY = height / 2;
  const gx = Math.max(0, Math.min(width, lipX(midY)));
  const warm = fillWarm(progress);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const glow = ctx.createRadialGradient(
    gx,
    midY,
    0,
    gx,
    midY,
    Math.max(24, height * 0.46),
  );
  glow.addColorStop(0, `rgba(255, 255, 255, ${0.3 + warm * 0.12})`);
  glow.addColorStop(
    0.28,
    warm > 0.45 ? "rgba(255, 106, 0, 0.3)" : "rgba(90, 164, 255, 0.26)",
  );
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(gx, midY, 22 + warm * 10, height * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawWave(
  ctx: CanvasRenderingContext2D,
  frame: SettleFillFrame,
) {
  const front = frame.progress * frame.width;
  paintFill(ctx, frame, (y) =>
    front +
    waveLipOffset({ y, height: frame.height, time: frame.time }),
  );
}

export function drawThreads(
  ctx: CanvasRenderingContext2D,
  frame: SettleFillFrame,
) {
  const cell = 11;
  const front = frame.progress * frame.width;
  paintFill(ctx, frame, (y) => {
    const row = Math.floor(y / cell);
    const step = (row % 2) * (cell * 0.55);
    return front + step - cell * 0.25;
  });
}

export function drawSlash(
  ctx: CanvasRenderingContext2D,
  frame: SettleFillFrame,
) {
  const front = frame.progress * frame.width;
  paintFill(ctx, frame, (y) => {
    const ny = y / Math.max(frame.height, 1);
    return front + (ny - 0.5) * 36 + Math.sin(ny * 18 + frame.time * 8) * 3;
  });
}

export function drawHex(
  ctx: CanvasRenderingContext2D,
  frame: SettleFillFrame,
) {
  const front = frame.progress * frame.width;
  const pitch = 16;
  paintFill(ctx, frame, (y) => {
    const row = y / pitch;
    const scallop = Math.abs((row % 2) - 0.5) * 2;
    return front + (scallop - 0.5) * 12;
  });
}
