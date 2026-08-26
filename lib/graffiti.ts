export const GRAFFITI_PRICE_SATS = 21;
export const GRAFFITI_TTL_HOURS = 21;
export const GRAFFITI_MAX_CHARS = 100;
export const GRAFFITI_TTL_MS = GRAFFITI_TTL_HOURS * 60 * 60 * 1000;
export const GRAFFITI_STORAGE_KEY = "surfsats.graffiti.v5";
export const GRAFFITI_CENTER = "Bitcoin Is Hope";
/** Keep tags out of the thin status strip. */
export const GRAFFITI_HERO_BAND = 4;

export const graffitiStyles = [
  { id: "tag", label: "classic tag" },
  { id: "throwup", label: "throw-up / bubble" },
  { id: "blockbuster", label: "blockbuster" },
  { id: "stencil", label: "stencil" },
  { id: "drip", label: "drip" },
  { id: "wildstyle", label: "wildstyle-lite" },
  { id: "fatcap", label: "fat-cap / marker" },
  { id: "chrome", label: "chrome" },
] as const;

export const graffitiColors = [
  { id: "chrome", label: "chrome", hex: "#cfd4d8" },
  { id: "blood", label: "blood", hex: "#c41e3a" },
  { id: "banana", label: "banana", hex: "#f4d03f" },
  { id: "ice", label: "ice", hex: "#6ec4e0" },
  { id: "rust", label: "rust", hex: "#d35400" },
  { id: "bone", label: "bone", hex: "#efe6d4" },
  { id: "pink", label: "pink", hex: "#ff4fa3" },
  { id: "night", label: "night", hex: "#141414" },
] as const;

export type GraffitiStyle = (typeof graffitiStyles)[number]["id"];
export type GraffitiColor = (typeof graffitiColors)[number]["id"];

export type GraffitiMark = {
  id: string;
  text: string;
  style: GraffitiStyle;
  color: GraffitiColor;
  createdAt: string;
  expiresAt: string;
  top: number;
  left: number;
  rotate: number;
  scale: number;
  paymentHash?: string;
};

export type GraffitiPlacement = {
  top: number;
  left: number;
  rotate: number;
  scale: number;
};

export type PendingGraffiti = {
  paymentHash: string;
  text: string;
  style: GraffitiStyle;
  color: GraffitiColor;
  createdAt: string;
  top?: number;
  left?: number;
  rotate?: number;
  scale?: number;
};

export const GRAFFITI_META_KIND = "surfsats-graffiti";

const blocked = [
  "nigger",
  "faggot",
  "kike",
  "retard",
  "rape",
  "child porn",
  "cp ",
];

export function sanitizeGraffiti(raw: string) {
  const text = raw.replace(/\s+/g, " ").trim();
  if (text.length < 2) return { ok: false as const, reason: "too short" };
  if (text.length > GRAFFITI_MAX_CHARS) {
    return { ok: false as const, reason: "too long" };
  }
  const lower = text.toLowerCase();
  if (blocked.some((word) => lower.includes(word))) {
    return { ok: false as const, reason: "not on this wall" };
  }
  if (/https?:\/\//i.test(text) || /www\./i.test(text)) {
    return { ok: false as const, reason: "no urls" };
  }
  return { ok: true as const, text };
}

export function isActiveMark(mark: GraffitiMark, now = Date.now()) {
  return new Date(mark.expiresAt).getTime() > now;
}

export function isGraffitiStyle(value: unknown): value is GraffitiStyle {
  return graffitiStyles.some((item) => item.id === value);
}

export function isGraffitiColor(value: unknown): value is GraffitiColor {
  return graffitiColors.some((item) => item.id === value);
}

/** Side and bottom bands only — leave the center Hope piece clear. */
const PLACE_ZONES = [
  { topMin: 28, topMax: 38, leftMin: 3, leftMax: 18 },
  { topMin: 28, topMax: 38, leftMin: 54, leftMax: 60 },
  { topMin: 70, topMax: 86, leftMin: 4, leftMax: 26 },
  { topMin: 70, topMax: 86, leftMin: 48, leftMax: 58 },
] as const;

const WALL_TOP_MIN = 8;
const WALL_TOP_MAX = 90;
const WALL_LEFT_MIN = 2;
const WALL_LEFT_MAX = 62;
const MURAL = { top: 40, bottom: 66, left: 20, right: 54 };

export function clampPlacement(top: number, left: number) {
  let nextTop = Math.min(WALL_TOP_MAX, Math.max(WALL_TOP_MIN, top));
  let nextLeft = Math.min(WALL_LEFT_MAX, Math.max(WALL_LEFT_MIN, left));

  if (
    nextTop > MURAL.top &&
    nextTop < MURAL.bottom &&
    nextLeft > MURAL.left &&
    nextLeft < MURAL.right
  ) {
    const dt = nextTop - MURAL.top;
    const db = MURAL.bottom - nextTop;
    const dl = nextLeft - MURAL.left;
    const dr = MURAL.right - nextLeft;
    const nearest = Math.min(dt, db, dl, dr);
    if (nearest === dt) nextTop = MURAL.top;
    else if (nearest === db) nextTop = MURAL.bottom;
    else if (nearest === dl) nextLeft = MURAL.left;
    else nextLeft = MURAL.right;
  }

  return { top: nextTop, left: nextLeft };
}

export function isGraffitiPlacement(value: unknown): value is GraffitiPlacement {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    Number.isFinite(Number(record.top)) &&
    Number.isFinite(Number(record.left)) &&
    Number.isFinite(Number(record.rotate)) &&
    Number.isFinite(Number(record.scale))
  );
}

export function readPlacement(value: unknown): GraffitiPlacement | null {
  if (!isGraffitiPlacement(value)) return null;
  const record = value as Record<string, unknown>;
  return sanitizePlacement({
    top: Number(record.top),
    left: Number(record.left),
    rotate: Number(record.rotate),
    scale: Number(record.scale),
  });
}

export function sanitizePlacement(placement: GraffitiPlacement): GraffitiPlacement {
  const clamped = clampPlacement(placement.top, placement.left);
  return {
    top: clamped.top,
    left: clamped.left,
    rotate: Math.min(16, Math.max(-16, placement.rotate)),
    scale: Math.min(1.18, Math.max(0.72, placement.scale)),
  };
}

export function organicPlacement(top: number, left: number): GraffitiPlacement {
  const jittered = clampPlacement(
    top + (Math.random() - 0.5) * 2.2,
    left + (Math.random() - 0.5) * 2.2,
  );
  return sanitizePlacement({
    top: jittered.top,
    left: jittered.left,
    rotate: -13 + Math.random() * 26,
    scale: 0.82 + Math.random() * 0.28,
  });
}

export function placeMark(seed?: string): GraffitiPlacement {
  const index = seed
    ? Math.floor(hashUnit(seed, 40) * PLACE_ZONES.length)
    : Math.floor(Math.random() * PLACE_ZONES.length);
  const zone = PLACE_ZONES[index % PLACE_ZONES.length];
  const topUnit = seed ? hashUnit(seed, 0) : Math.random();
  const leftUnit = seed ? hashUnit(seed, 8) : Math.random();
  const rotateUnit = seed ? hashUnit(seed, 24) : Math.random();
  const scaleUnit = seed ? hashUnit(seed, 32) : Math.random();

  return {
    top: zone.topMin + topUnit * (zone.topMax - zone.topMin),
    left: zone.leftMin + leftUnit * (zone.leftMax - zone.leftMin),
    rotate: -12 + rotateUnit * 24,
    scale: 0.78 + scaleUnit * 0.28,
  };
}

export function createMark(
  text: string,
  style: GraffitiStyle,
  color: GraffitiColor,
  options?: {
    paidAt?: number;
    paymentHash?: string;
    placement?: GraffitiPlacement | null;
  },
) {
  const created = options?.paidAt ?? Date.now();
  const paymentHash = options?.paymentHash;
  const id = paymentHash ? `g-${paymentHash.slice(0, 12)}` : `g-${created}`;
  const placement = options?.placement
    ? sanitizePlacement(options.placement)
    : placeMark(paymentHash);
  return {
    id,
    text,
    style,
    color,
    createdAt: new Date(created).toISOString(),
    expiresAt: new Date(created + GRAFFITI_TTL_MS).toISOString(),
    paymentHash,
    ...placement,
  } satisfies GraffitiMark;
}

function hashUnit(seed: string, offset: number) {
  const hex = seed.replace(/[^0-9a-f]/gi, "0").padEnd(offset + 8, "0");
  const slice = hex.slice(offset, offset + 8);
  const value = Number.parseInt(slice, 16);
  if (!Number.isFinite(value)) return 0.5;
  return (value % 10_000) / 10_000;
}

export const seedMarks: GraffitiMark[] = [
  {
    id: "seed-1",
    text: "21M",
    style: "blockbuster",
    color: "bone",
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    expiresAt: new Date(Date.now() + 18 * 3_600_000).toISOString(),
    top: 32,
    left: 4,
    rotate: -8,
    scale: 1.02,
  },
  {
    id: "seed-2",
    text: "no masters",
    style: "tag",
    color: "pink",
    createdAt: new Date(Date.now() - 8_000_000).toISOString(),
    expiresAt: new Date(Date.now() + 14 * 3_600_000).toISOString(),
    top: 31,
    left: 56,
    rotate: 7,
    scale: 0.92,
  },
  {
    id: "seed-3",
    text: "stack in the dark",
    style: "drip",
    color: "ice",
    createdAt: new Date(Date.now() - 2_000_000).toISOString(),
    expiresAt: new Date(Date.now() + 19 * 3_600_000).toISOString(),
    top: 78,
    left: 8,
    rotate: -6,
    scale: 1.05,
  },
  {
    id: "seed-4",
    text: "HODL",
    style: "throwup",
    color: "banana",
    createdAt: new Date(Date.now() - 5_000_000).toISOString(),
    expiresAt: new Date(Date.now() + 16 * 3_600_000).toISOString(),
    top: 76,
    left: 52,
    rotate: 5,
    scale: 1.02,
  },
];
