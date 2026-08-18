export const GRAFFITI_PRICE_SATS = 21;
export const GRAFFITI_MAX_CHARS = 100;
export const GRAFFITI_TTL_MS = 24 * 60 * 60 * 1000;
export const GRAFFITI_STORAGE_KEY = "surfsats.graffiti.v2";
export const GRAFFITI_CENTER = "Bitcoin Is Hope";

export const graffitiStyles = [
  { id: "tag", label: "classic tag" },
  { id: "throwup", label: "throw-up" },
  { id: "wildstyle", label: "wildstyle" },
  { id: "stencil", label: "stencil" },
  { id: "drip", label: "drip" },
  { id: "blockbuster", label: "blockbuster" },
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

export function placeMark() {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const top = 3 + Math.random() * 84;
    const left = 1 + Math.random() * 76;
    const hitsCenter = top > 30 && top < 70 && left > 16 && left < 64;
    if (!hitsCenter) {
      return {
        top,
        left,
        rotate: -18 + Math.random() * 36,
        scale: 0.68 + Math.random() * 0.85,
      };
    }
  }
  return { top: 6, left: 4, rotate: -8, scale: 0.9 };
}

export function createMark(
  text: string,
  style: GraffitiStyle,
  color: GraffitiColor,
) {
  const created = Date.now();
  const id = `g-${created}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    text,
    style,
    color,
    createdAt: new Date(created).toISOString(),
    expiresAt: new Date(created + GRAFFITI_TTL_MS).toISOString(),
    ...placeMark(),
  } satisfies GraffitiMark;
}

export const seedMarks: GraffitiMark[] = [
  {
    id: "seed-1",
    text: "21M",
    style: "blockbuster",
    color: "bone",
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    expiresAt: new Date(Date.now() + 20 * 3_600_000).toISOString(),
    top: 6,
    left: 5,
    rotate: -11,
    scale: 1.15,
  },
  {
    id: "seed-2",
    text: "no masters",
    style: "tag",
    color: "pink",
    createdAt: new Date(Date.now() - 8_000_000).toISOString(),
    expiresAt: new Date(Date.now() + 16 * 3_600_000).toISOString(),
    top: 12,
    left: 68,
    rotate: 9,
    scale: 0.95,
  },
  {
    id: "seed-3",
    text: "stack in the dark",
    style: "drip",
    color: "ice",
    createdAt: new Date(Date.now() - 2_000_000).toISOString(),
    expiresAt: new Date(Date.now() + 22 * 3_600_000).toISOString(),
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
    expiresAt: new Date(Date.now() + 18 * 3_600_000).toISOString(),
    top: 76,
    left: 62,
    rotate: 5,
    scale: 1.2,
  },
];
