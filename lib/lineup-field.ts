export const SATS_PER_BTC = 100_000_000;
export const LIVE_CAP = 320;
export const BLOCK_TX_PAGES = 4;
export const BLOCK_TILE_CAP = 72;
export const MEMPOOL_REST = "https://mempool.space/api";
export const MEMPOOL_WS = "wss://mempool.space/api/v1/ws";
export const MEMPOOL_SITE = "https://mempool.space";

/** log10(BTC): 1_000 sats .. 50 BTC. Width steps ~10× value. */
export const LOG_BTC_MIN = Math.log10(1_000 / SATS_PER_BTC);
export const LOG_BTC_MAX = Math.log10(50);

export type LiveTx = {
  txid: string;
  value: number;
};

export type SealedBlock = {
  hash: string;
  height: number;
  timestamp: number;
  txCount: number;
  tiles: LiveTx[];
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function asTxid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!/^[0-9a-fA-F]{64}$/.test(value)) return null;
  return value.toLowerCase();
}

export function logT(sats: number) {
  const btc = Math.max(sats / SATS_PER_BTC, 1e-8);
  const t =
    (Math.log10(btc) - LOG_BTC_MIN) / (LOG_BTC_MAX - LOG_BTC_MIN);
  return Math.max(0, Math.min(1, t));
}

export function tileSide(sats: number, minPx: number, maxPx: number) {
  const lo = Math.min(minPx, maxPx);
  const hi = Math.max(minPx, maxPx);
  return lo + logT(sats) * (hi - lo);
}

export function tileRgb(sats: number): [number, number, number] {
  const t = logT(sats);
  if (t < 0.35) {
    const u = t / 0.35;
    return mixRgb([28, 86, 92], [61, 255, 243], u);
  }
  if (t < 0.7) {
    const u = (t - 0.35) / 0.35;
    return mixRgb([61, 255, 243], [255, 122, 24], u);
  }
  const u = (t - 0.7) / 0.3;
  return mixRgb([255, 122, 24], [255, 196, 92], u);
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  const u = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * u),
    Math.round(a[1] + (b[1] - a[1]) * u),
    Math.round(a[2] + (b[2] - a[2]) * u),
  ];
}

export function outputValueSats(tx: unknown): number | null {
  if (!isRecord(tx)) return null;
  const direct = finiteNumber(tx.value);
  if (direct !== null && direct >= 0) return direct;
  if (!Array.isArray(tx.vout)) return null;
  let sum = 0;
  let any = false;
  for (const out of tx.vout) {
    if (!isRecord(out)) continue;
    const value = finiteNumber(out.value);
    if (value === null || value < 0) continue;
    sum += value;
    any = true;
  }
  return any ? sum : null;
}

export function parseLiveTx(raw: unknown): LiveTx | null {
  if (!isRecord(raw)) return null;
  const txid = asTxid(raw.txid);
  const value = outputValueSats(raw);
  if (!txid || value === null) return null;
  return { txid, value };
}

export function parseLiveTxList(raw: unknown): LiveTx[] {
  if (!Array.isArray(raw)) return [];
  const out: LiveTx[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const tx = parseLiveTx(item);
    if (!tx || seen.has(tx.txid)) continue;
    seen.add(tx.txid);
    out.push(tx);
  }
  return out;
}

export function parseBlockHint(raw: unknown): {
  hash: string;
  height: number;
  timestamp: number;
  txCount: number;
} | null {
  if (!isRecord(raw)) return null;
  const hash = asTxid(raw.id) ?? asTxid(raw.hash);
  const height = finiteNumber(raw.height);
  const timestamp = finiteNumber(raw.timestamp);
  const txCount =
    finiteNumber(raw.tx_count) ?? finiteNumber(raw.txCount) ?? 0;
  if (!hash || height === null || timestamp === null) return null;
  return { hash, height, timestamp, txCount };
}

export function shortTxid(txid: string) {
  return `${txid.slice(0, 8)}…${txid.slice(-4)}`;
}

export function txUrl(txid: string) {
  return `${MEMPOOL_SITE}/tx/${txid}`;
}

export function blockUrl(hash: string) {
  return `${MEMPOOL_SITE}/block/${hash}`;
}

export function formatValueSats(sats: number) {
  const btc = sats / SATS_PER_BTC;
  if (btc >= 1) return `${btc.toFixed(3)} BTC`;
  if (btc >= 0.01) return `${btc.toFixed(4)} BTC`;
  if (btc >= 0.0001) return `${btc.toFixed(6)} BTC`;
  return `${Math.round(sats).toLocaleString("en-US")} sats`;
}
