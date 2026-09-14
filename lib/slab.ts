import { readCallsign } from "./callsign.ts";

export const SLAB_WIDTH = 210;
export const SLAB_HEIGHT = 84;
export const SLAB_MAX_PIXELS = 21;
export const SLAB_SWELL_SATS = 21;
export const SLAB_SWELL_BLOCKS = 2016;
export const SLAB_REEF_SATS = 441;
export const SLAB_REEF_BLOCKS = 210_000;
export const SLAB_STAIN_OPACITY = 0.15;
export const SLAB_STORAGE_KEY = "surfsats.slab.v1";
export const SLAB_META_KIND = "surfsats-slab";

export const SLAB_COATS = {
  swell: { priceSats: SLAB_SWELL_SATS, blocks: SLAB_SWELL_BLOCKS },
  reef: { priceSats: SLAB_REEF_SATS, blocks: SLAB_REEF_BLOCKS },
} as const;

export const slabPalette = [
  { id: "void", label: "void", hex: "#0a0a0c" },
  { id: "bone", label: "bone", hex: "#efe6d4" },
  { id: "chrome", label: "chrome", hex: "#cfd4d8" },
  { id: "banana", label: "banana", hex: "#f4d03f" },
  { id: "blood", label: "blood", hex: "#c41e3a" },
  { id: "ice", label: "ice", hex: "#6ec4e0" },
  { id: "rust", label: "rust", hex: "#d35400" },
  { id: "pink", label: "pink", hex: "#ff4fa3" },
  { id: "night", label: "night", hex: "#141414" },
  { id: "moss", label: "moss", hex: "#3d7a4a" },
  { id: "foam", label: "foam", hex: "#9ee8c8" },
  { id: "tar", label: "tar", hex: "#1a1612" },
  { id: "sats", label: "sats", hex: "#ff7a18" },
  { id: "cyan", label: "cyan", hex: "#3dfff3" },
  { id: "magenta", label: "magenta", hex: "#ff2ec4" },
  { id: "hope", label: "hope", hex: "#f7931a" },
] as const;

export type SlabCoat = keyof typeof SLAB_COATS;
export type SlabColor = (typeof slabPalette)[number]["id"];

export type SlabPixel = {
  x: number;
  y: number;
};

export type SlabCell = SlabPixel & {
  color: SlabColor;
  coat: SlabCoat;
  callsign: string;
  paintedHeight: number;
  expiresHeight: number;
  paymentHash?: string;
};

export type SlabStain = SlabPixel & {
  color: SlabColor;
};

export type SlabStroke = {
  paymentHash: string;
  callsign: string;
  coat: SlabCoat;
  color: SlabColor;
  pixelCount: number;
  amountSats: number;
  createdAt: string;
  paintedHeight: number;
};

export type PendingSlab = {
  paymentHash: string;
  coat: SlabCoat;
  color: SlabColor;
  pixels: SlabPixel[];
  callsign: string;
  createdAt: string;
  amountSats: number;
};

export type SlabInvoicePayload = {
  coat: SlabCoat;
  color: SlabColor;
  pixels: SlabPixel[];
  callsign: string;
};

export const SLAB_COPY = {
  title: "THE SLAB",
  clock: "concrete · the chain is the clock",
  swell: "SWELL COAT · 21 sats · 2,016 blocks · epoch",
  reef: "REEF COAT · 441 sats · 210,000 blocks · halving",
  pixel: "PIXEL",
  stain: "STAIN remains when a coat dies",
  hold: "reef holds those pixels",
} as const;

const COATS = new Set<SlabCoat>(["swell", "reef"]);
const COLORS = new Set<SlabColor>(slabPalette.map((item) => item.id));

export function isSlabCoat(value: unknown): value is SlabCoat {
  return typeof value === "string" && COATS.has(value as SlabCoat);
}

export function isSlabColor(value: unknown): value is SlabColor {
  return typeof value === "string" && COLORS.has(value as SlabColor);
}

export function coatPrice(coat: SlabCoat) {
  return SLAB_COATS[coat].priceSats;
}

export function coatBlocks(coat: SlabCoat) {
  return SLAB_COATS[coat].blocks;
}

export function invoiceSats(coat: SlabCoat, pixelCount: number) {
  return coatPrice(coat) * pixelCount;
}

export function cellKey(x: number, y: number) {
  return `${x},${y}`;
}

export function isLiveCell(cell: SlabCell, currentHeight: number) {
  return currentHeight < cell.expiresHeight;
}

export function blocksRemaining(cell: SlabCell, currentHeight: number) {
  return Math.max(0, cell.expiresHeight - currentHeight);
}

export function paletteHex(color: SlabColor) {
  const hit = slabPalette.find((item) => item.id === color);
  return hit?.hex ?? "#0a0a0c";
}

export function inBounds(x: number, y: number) {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    y >= 0 &&
    x < SLAB_WIDTH &&
    y < SLAB_HEIGHT
  );
}

export function parseSlabPixels(value: unknown): SlabPixel[] | null {
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  const pixels: SlabPixel[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const x = Number(record.x);
    const y = Number(record.y);
    if (!inBounds(x, y)) continue;
    const key = cellKey(x, y);
    if (seen.has(key)) continue;
    seen.add(key);
    pixels.push({ x, y });
    if (pixels.length > SLAB_MAX_PIXELS) return null;
  }
  if (!pixels.length) return null;
  return pixels;
}

export function canOverwrite(
  coat: SlabCoat,
  existing: SlabCell | undefined,
  currentHeight: number,
) {
  if (!existing || !isLiveCell(existing, currentHeight)) return true;
  if (coat === "reef") return true;
  return existing.coat !== "reef";
}

export function stripStroke({
  pixels,
  live,
  coat,
  currentHeight,
}: {
  pixels: SlabPixel[];
  live: SlabCell[];
  coat: SlabCoat;
  currentHeight: number;
}) {
  const liveMap = new Map<string, SlabCell>();
  for (const cell of live) {
    if (isLiveCell(cell, currentHeight)) {
      liveMap.set(cellKey(cell.x, cell.y), cell);
    }
  }
  return pixels.filter((pixel) =>
    canOverwrite(coat, liveMap.get(cellKey(pixel.x, pixel.y)), currentHeight),
  );
}

export function expireBoard({
  live,
  stains,
  currentHeight,
}: {
  live: SlabCell[];
  stains: SlabStain[];
  currentHeight: number;
}) {
  const nextLive: SlabCell[] = [];
  const stainMap = new Map<string, SlabStain>();
  for (const stain of stains) {
    stainMap.set(cellKey(stain.x, stain.y), stain);
  }
  for (const cell of live) {
    if (isLiveCell(cell, currentHeight)) {
      nextLive.push(cell);
      continue;
    }
    stainMap.set(cellKey(cell.x, cell.y), {
      x: cell.x,
      y: cell.y,
      color: cell.color,
    });
  }
  return { live: nextLive, stains: [...stainMap.values()] };
}

export function applyStroke({
  live,
  stains,
  pixels,
  coat,
  color,
  callsign,
  paintedHeight,
  paymentHash,
}: {
  live: SlabCell[];
  stains: SlabStain[];
  pixels: SlabPixel[];
  coat: SlabCoat;
  color: SlabColor;
  callsign: string;
  paintedHeight: number;
  paymentHash?: string;
}) {
  const expired = expireBoard({ live, stains, currentHeight: paintedHeight });
  const stroke = stripStroke({
    pixels,
    live: expired.live,
    coat,
    currentHeight: paintedHeight,
  });
  const liveMap = new Map(
    expired.live.map((cell) => [cellKey(cell.x, cell.y), cell]),
  );
  const stainMap = new Map(
    expired.stains.map((stain) => [cellKey(stain.x, stain.y), stain]),
  );
  const painted: SlabCell[] = [];
  const expiresHeight = paintedHeight + coatBlocks(coat);
  for (const pixel of stroke) {
    const next: SlabCell = {
      x: pixel.x,
      y: pixel.y,
      color,
      coat,
      callsign,
      paintedHeight,
      expiresHeight,
      ...(paymentHash ? { paymentHash } : {}),
    };
    liveMap.set(cellKey(pixel.x, pixel.y), next);
    stainMap.delete(cellKey(pixel.x, pixel.y));
    painted.push(next);
  }
  return {
    live: [...liveMap.values()],
    stains: [...stainMap.values()],
    painted,
  };
}

export function bezelCounts({
  live,
  stains,
  currentHeight,
}: {
  live: SlabCell[];
  stains: SlabStain[];
  currentHeight: number;
}) {
  const active = live.filter((cell) => isLiveCell(cell, currentHeight));
  let swell = 0;
  let reef = 0;
  let nextExpiry: number | null = null;
  for (const cell of active) {
    if (cell.coat === "swell") swell += 1;
    else reef += 1;
    const left = blocksRemaining(cell, currentHeight);
    if (nextExpiry === null || left < nextExpiry) nextExpiry = left;
  }
  return {
    painted: active.length,
    swell,
    reef,
    stain: stains.length,
    nextExpiry,
  };
}

export function slabTapeText(
  actor: string,
  pixelCount: number,
  coat: SlabCoat,
) {
  return `${actor} laid ${pixelCount} ${coat} px on The Slab`;
}

export function pendingSlabFromBody(
  body: unknown,
): SlabInvoicePayload | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "missing stroke" };
  }
  const record = body as Record<string, unknown>;
  if (!isSlabCoat(record.coat)) {
    return { error: "pick a coat" };
  }
  if (!isSlabColor(record.color)) {
    return { error: "pick a color" };
  }
  const pixels = parseSlabPixels(record.pixels);
  if (!pixels) {
    return { error: "select 1–21 pixels" };
  }
  const callsign = readCallsign(record.callsign ?? record.alias);
  if (!callsign) {
    return { error: "SET CALLSIGN FIRST · 2–16 CHARS" };
  }
  return {
    coat: record.coat,
    color: record.color,
    pixels,
    callsign,
  };
}

export function parseSlabPayload(value: unknown): SlabInvoicePayload | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    record.kind &&
    record.kind !== SLAB_META_KIND &&
    record.kind !== "slab"
  ) {
    return null;
  }
  const parsed = pendingSlabFromBody(record);
  if ("error" in parsed) return null;
  return parsed;
}
