export const BOTTLE_PRICE_SATS = 21;
export const BOTTLE_META_KIND = "surfsats-bottle";
export const BOTTLE_MACHINE = "bottle";
export const BOTTLE_RECENT = 12;
export const BOTTLE_AVOID = 8;

export type BottlePull = {
  id: string;
  line: string;
  createdAt: string;
  paymentHash?: string;
};

export type BottlePending = {
  paymentHash: string;
  createdAt: string;
};

export function pickBottleLine(lines: string[], recent: string[]) {
  if (!lines.length) return null;
  const avoid = new Set(recent.slice(0, BOTTLE_AVOID));
  const pool = lines.filter((line) => !avoid.has(line));
  const pickFrom = pool.length ? pool : lines;
  return pickFrom[Math.floor(Math.random() * pickFrom.length)] ?? null;
}

export function isBottleKind(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const kind = String(record.kind ?? "").toLowerCase();
  const machine = String(record.machine ?? "").toLowerCase();
  return (
    kind === BOTTLE_META_KIND ||
    kind === BOTTLE_MACHINE ||
    machine === BOTTLE_MACHINE
  );
}
