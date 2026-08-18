export const GRAFFITI_PRICE_SATS = 21;
export const GRAFFITI_MAX_CHARS = 100;
export const GRAFFITI_TTL_MS = 24 * 60 * 60 * 1000;
export const GRAFFITI_STORAGE_KEY = "surfsats.graffiti.v1";
export const GRAFFITI_CENTER = "Bitcoin Is Hope";

export const graffitiStyles = [
  { id: "bold", label: "bold" },
  { id: "tag", label: "tag" },
  { id: "bubble", label: "bubble" },
  { id: "stencil", label: "stencil" },
  { id: "glitch", label: "glitch" },
  { id: "drip", label: "drip" },
] as const;

export const graffitiColors = [
  { id: "cyan", label: "cyan", hex: "#3dfff3" },
  { id: "magenta", label: "magenta", hex: "#ff2ec4" },
  { id: "sats", label: "sats", hex: "#ff7a18" },
  { id: "acid", label: "acid", hex: "#c8ff00" },
  { id: "white", label: "white", hex: "#f4f1ea" },
  { id: "black", label: "black", hex: "#111111" },
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
};

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

export function remainingLabel(expiresAt: string, now = Date.now()) {
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return "gone";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 1) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

export function placeMark(seed: string) {
  const slots = [
    { top: 7, left: 4, rotate: -9 },
    { top: 10, left: 68, rotate: 7 },
    { top: 28, left: 2, rotate: -4 },
    { top: 26, left: 72, rotate: 11 },
    { top: 48, left: 3, rotate: 5 },
    { top: 52, left: 70, rotate: -8 },
    { top: 70, left: 8, rotate: 6 },
    { top: 74, left: 62, rotate: -6 },
    { top: 16, left: 38, rotate: -3 },
    { top: 78, left: 36, rotate: 4 },
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return slots[hash % slots.length];
}

export function createMark(
  text: string,
  style: GraffitiStyle,
  color: GraffitiColor,
) {
  const created = Date.now();
  const id = `g-${created}-${Math.random().toString(36).slice(2, 7)}`;
  const spot = placeMark(id);
  return {
    id,
    text,
    style,
    color,
    createdAt: new Date(created).toISOString(),
    expiresAt: new Date(created + GRAFFITI_TTL_MS).toISOString(),
    ...spot,
  } satisfies GraffitiMark;
}

export const seedMarks: GraffitiMark[] = [
  {
    id: "seed-1",
    text: "21M. period.",
    style: "stencil",
    color: "white",
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    expiresAt: new Date(Date.now() + 20 * 3_600_000).toISOString(),
    top: 8,
    left: 6,
    rotate: -8,
  },
  {
    id: "seed-2",
    text: "no masters",
    style: "tag",
    color: "magenta",
    createdAt: new Date(Date.now() - 8_000_000).toISOString(),
    expiresAt: new Date(Date.now() + 16 * 3_600_000).toISOString(),
    top: 14,
    left: 70,
    rotate: 8,
  },
  {
    id: "seed-3",
    text: "stack in the dark",
    style: "drip",
    color: "cyan",
    createdAt: new Date(Date.now() - 2_000_000).toISOString(),
    expiresAt: new Date(Date.now() + 22 * 3_600_000).toISOString(),
    top: 72,
    left: 10,
    rotate: -5,
  },
];
