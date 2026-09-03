export const SATS_PER_BTC = 100_000_000;
export const LIVE_CAP = 320;
export const BLOCK_TX_PAGES = 4;
export const BLOCK_TILE_CAP = 72;
export const DETAIL_BUDGET = 40;
export const DETAIL_CONCURRENCY = 4;
export const MEMPOOL_REST = "https://mempool.space/api";
export const MEMPOOL_WS = "wss://mempool.space/api/v1/ws";
export const MEMPOOL_SITE = "https://mempool.space";
export const MEMPOOL_RECENT_PATH = "/api/mempool/recent";
export const MEMPOOL_TX_PATH = "/api/mempool/tx";

/** log10(BTC): 1_000 sats .. 50 BTC. Width steps ~10× value. */
export const LOG_BTC_MIN = Math.log10(1_000 / SATS_PER_BTC);
export const LOG_BTC_MAX = Math.log10(50);

export type LiveTx = {
  txid: string;
  value: number;
};

export type BlockHint = {
  hash: string;
  height: number;
  timestamp: number;
  txCount: number;
};

export type SealedBlock = BlockHint & {
  tiles: LiveTx[];
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
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
  if (Array.isArray(raw)) return parseCompressedTx(raw);
  if (!isRecord(raw)) return null;
  const txid = asTxid(raw.txid);
  const value = outputValueSats(raw);
  if (!txid || value === null) return null;
  return { txid, value };
}

function parseCompressedTx(raw: unknown[]): LiveTx | null {
  const txid = asTxid(raw[0]);
  const value = finiteNumber(raw[3]);
  if (!txid || value === null || value < 0) return null;
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

export function pendingTxids(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    const id = asTxid(raw) ?? (isRecord(raw) ? asTxid(raw.txid) : null);
    if (!id || parseLiveTx(raw)) return [];
    return [id];
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (parseLiveTx(item)) continue;
    const id = asTxid(item) ?? (isRecord(item) ? asTxid(item.txid) : null);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export type FeedBatch = {
  txs: LiveTx[];
  pending: string[];
  mined: string[];
  unconfirmed: number | null;
  block: BlockHint | null;
  blocks: BlockHint[];
};

export function extractFeedBatch(raw: unknown): FeedBatch {
  const empty: FeedBatch = {
    txs: [],
    pending: [],
    mined: [],
    unconfirmed: null,
    block: null,
    blocks: [],
  };
  const body = unwrapJson(raw);
  if (!isRecord(body)) return empty;

  const txs: LiveTx[] = [];
  const pending: string[] = [];
  const mined: string[] = [];
  const seenTx = new Set<string>();
  const seenPending = new Set<string>();
  const seenMined = new Set<string>();

  function takeList(list: unknown) {
    for (const tx of parseLiveTxList(list)) {
      if (seenTx.has(tx.txid)) continue;
      seenTx.add(tx.txid);
      txs.push(tx);
    }
    for (const id of pendingTxids(list)) {
      if (seenTx.has(id) || seenPending.has(id)) continue;
      seenPending.add(id);
      pending.push(id);
    }
  }

  function takeMined(list: unknown) {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      const id = asTxid(item) ?? (isRecord(item) ? asTxid(item.txid) : null);
      if (!id || seenMined.has(id)) continue;
      seenMined.add(id);
      mined.push(id);
    }
  }

  takeList(body.transactions);

  const mempoolTxs = unwrapJson(body["mempool-transactions"]);
  if (isRecord(mempoolTxs)) {
    takeList(mempoolTxs.added);
    takeMined(mempoolTxs.mined);
  }

  const mempoolTxids = unwrapJson(body["mempool-txids"]);
  if (isRecord(mempoolTxids)) {
    takeList(mempoolTxids.added);
    takeMined(mempoolTxids.mined);
  }

  const projected = unwrapJson(body["projected-block-transactions"]);
  if (isRecord(projected)) {
    takeList(projected.blockTransactions);
    const delta = unwrapJson(projected.delta);
    if (isRecord(delta)) takeList(delta.added);
  }

  const blocks: BlockHint[] = [];
  if (Array.isArray(body.blocks) && !body.block) {
    for (const item of body.blocks.slice(0, 8)) {
      const hint = parseBlockHint(item);
      if (hint) blocks.push(hint);
    }
  }

  return {
    txs,
    pending,
    mined,
    unconfirmed: mempoolSize(body),
    block: parseBlockHint(body.block),
    blocks,
  };
}

export function mempoolSize(raw: Record<string, unknown>) {
  const info = isRecord(raw.mempoolInfo)
    ? raw.mempoolInfo
    : isRecord(raw.mempool)
      ? raw.mempool
      : null;
  if (!info) return null;
  return finiteNumber(info.size) ?? finiteNumber(info.count);
}

function unwrapJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

export function parseBlockHint(raw: unknown): BlockHint | null {
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
