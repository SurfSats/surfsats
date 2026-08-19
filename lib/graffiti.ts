export const GRAFFITI_PRICE_SATS = 21;
export const GRAFFITI_TTL_HOURS = 21;
export const GRAFFITI_MAX_CHARS = 100;
export const GRAFFITI_TTL_MS = GRAFFITI_TTL_HOURS * 60 * 60 * 1000;
export const GRAFFITI_STORAGE_KEY = "surfsats.graffiti.v4";
export const GRAFFITI_CENTER = "Bitcoin Is Hope";
/** Keep tags below the hero title band (~first 26% of the wall). */
export const GRAFFITI_HERO_BAND = 26;

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
  paymentHash?: string;
};

export type PendingGraffiti = {
  paymentHash: string;
  text: string;
  style: GraffitiStyle;
  color: GraffitiColor;
  createdAt: string;
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

export function placeMark(seed?: string) {
  if (seed) {
    const top = GRAFFITI_HERO_BAND + hashUnit(seed, 0) * 64;
    let left = 1 + hashUnit(seed, 8) * 76;
    if (top > 34 && top < 68 && left > 16 && left < 64) {
      left = hashUnit(seed, 16) > 0.5 ? 4 : 70;
    }
    return {
      top,
      left,
      rotate: -18 + hashUnit(seed, 24) * 36,
      scale: 0.68 + hashUnit(seed, 32) * 0.85,
    };
  }

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const top = GRAFFITI_HERO_BAND + Math.random() * 64;
    const left = 1 + Math.random() * 76;
    const hitsCenter = top > 34 && top < 68 && left > 16 && left < 64;
    if (!hitsCenter) {
      return {
        top,
        left,
        rotate: -18 + Math.random() * 36,
        scale: 0.68 + Math.random() * 0.85,
      };
    }
  }
  return { top: 30, left: 4, rotate: -8, scale: 0.9 };
}

export function createMark(
  text: string,
  style: GraffitiStyle,
  color: GraffitiColor,
  options?: { paidAt?: number; paymentHash?: string },
) {
  const created = options?.paidAt ?? Date.now();
  const paymentHash = options?.paymentHash;
  const id = paymentHash ? `g-${paymentHash.slice(0, 12)}` : `g-${created}`;
  return {
    id,
    text,
    style,
    color,
    createdAt: new Date(created).toISOString(),
    expiresAt: new Date(created + GRAFFITI_TTL_MS).toISOString(),
    paymentHash,
    ...placeMark(paymentHash),
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
    top: 34,
    left: 4,
    rotate: -11,
    scale: 1.15,
  },
  {
    id: "seed-2",
    text: "no masters",
    style: "tag",
    color: "pink",
    createdAt: new Date(Date.now() - 8_000_000).toISOString(),
    expiresAt: new Date(Date.now() + 14 * 3_600_000).toISOString(),
    top: 30,
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
    left: 62,
    rotate: 5,
    scale: 1.2,
  },
];
