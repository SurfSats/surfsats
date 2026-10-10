import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseCandles,
  type FiatPriceHistory,
  type PricePoint,
} from "./fiat-chart.ts";

export type { FiatPriceHistory, PricePoint };

const HISTORY_URL =
  "https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=86400";
const CACHE_PATH = join(tmpdir(), "surfsats-fiat-history.json");

/** Serve the last price history for six hours. A visit inside that window does not call the feed. */
export const FIAT_HISTORY_MS = 6 * 60 * 60 * 1000;

type SavedHistory = {
  fetchedAt: number;
  points: PricePoint[];
};

type HistorySlot = {
  storedAt: number;
  ready: boolean;
  history: FiatPriceHistory | null;
  pending: Promise<FiatPriceHistory | null> | null;
};

const slots = new Map<string, HistorySlot>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPoint(value: unknown): value is PricePoint {
  if (!isRecord(value)) return false;
  return (
    typeof value.time === "number" &&
    Number.isInteger(value.time) &&
    typeof value.priceUsd === "number" &&
    Number.isFinite(value.priceUsd) &&
    value.priceUsd > 0
  );
}

function parseSaved(payload: unknown): SavedHistory | null {
  if (!isRecord(payload) || !Array.isArray(payload.points)) return null;
  if (typeof payload.fetchedAt !== "number" || !Number.isFinite(payload.fetchedAt)) return null;
  const points: PricePoint[] = [];
  for (const item of payload.points) {
    if (!isPoint(item)) return null;
    points.push({ time: item.time, priceUsd: item.priceUsd });
  }
  if (points.length < 2) return null;
  return { fetchedAt: payload.fetchedAt, points };
}

function readSaved(path: string) {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    return parseSaved(parsed);
  } catch {
    return null;
  }
}

function writeSaved(path: string, saved: SavedHistory) {
  try {
    writeFileSync(path, JSON.stringify(saved));
  } catch {
    // The chart still renders. The next miss fetches again.
  }
}

function slotFor(path: string) {
  const found = slots.get(path);
  if (found) return found;
  const created: HistorySlot = { storedAt: 0, ready: false, history: null, pending: null };
  slots.set(path, created);
  return created;
}

function copyHistory(history: FiatPriceHistory): FiatPriceHistory {
  return {
    fetchedAt: history.fetchedAt,
    stale: history.stale,
    points: history.points.map((point) => ({ time: point.time, priceUsd: point.priceUsd })),
  };
}

async function pullCandles(fetchImpl: typeof fetch) {
  const response = await fetchImpl(HISTORY_URL, {
    headers: { Accept: "application/json", "User-Agent": "surfsats" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) return null;
  const body: unknown = await response.json();
  return parseCandles(body);
}

async function readOrPull(
  now: number,
  fetchImpl: typeof fetch,
  path: string,
  previousHint: FiatPriceHistory | null,
) {
  const saved = readSaved(path);
  if (saved && now - saved.fetchedAt < FIAT_HISTORY_MS) {
    return {
      history: { fetchedAt: saved.fetchedAt, stale: false, points: saved.points },
      storedAt: saved.fetchedAt,
    };
  }

  const previous =
    previousHint ??
    (saved
      ? { fetchedAt: saved.fetchedAt, stale: false, points: saved.points }
      : null);

  let fresh: PricePoint[] | null = null;
  try {
    fresh = await pullCandles(fetchImpl);
  } catch {
    fresh = null;
  }

  if (fresh) {
    const history = { fetchedAt: now, stale: false, points: fresh };
    writeSaved(path, { fetchedAt: now, points: fresh });
    return { history, storedAt: now };
  }

  if (previous && previous.points.length >= 2) {
    return {
      history: {
        fetchedAt: previous.fetchedAt,
        stale: true,
        points: previous.points.map((point) => ({ time: point.time, priceUsd: point.priceUsd })),
      },
      storedAt: now,
    };
  }

  return { history: null, storedAt: now };
}

export function clearFiatHistoryCache(path: string) {
  slots.delete(path);
}

export async function getFiatHistory(override?: {
  now?: number;
  fetchImpl?: typeof fetch;
  cachePath?: string;
}) {
  const path = override?.cachePath ?? CACHE_PATH;
  const now = override?.now ?? Date.now();
  const fetchImpl = override?.fetchImpl ?? fetch;
  const slot = slotFor(path);

  if (slot.ready && now - slot.storedAt < FIAT_HISTORY_MS) {
    return slot.history ? copyHistory(slot.history) : null;
  }
  if (slot.pending) return slot.pending;

  slot.pending = readOrPull(now, fetchImpl, path, slot.history)
    .then((result) => {
      slot.history = result.history ? copyHistory(result.history) : null;
      slot.storedAt = result.storedAt;
      slot.ready = true;
      return slot.history ? copyHistory(slot.history) : null;
    })
    .finally(() => {
      slot.pending = null;
    });
  return slot.pending;
}
