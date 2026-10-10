import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { windowBalance, type BalanceStep } from "./salvador-chart.ts";
import { ONBTC_ADDRESSES, ONBTC_WALLET_URL } from "./onbtc.ts";

export type { BalanceStep };

/**
 * Public API first. On paths where that anycast prefix drops TCP/443, the desk
 * spreads the same API across mempool.space backends so one node is not flooded.
 */
const MEMPOOL_ROOTS = [
  "https://mempool.space/api",
  "https://node202.va1.mempool.space/api",
  "https://node210.va1.mempool.space/api",
  "https://node201.fra.mempool.space/api",
  "https://node205.fra.mempool.space/api",
  "https://node203.sv1.mempool.space/api",
  "https://node205.tk7.mempool.space/api",
] as const;
const MEMPOOL = MEMPOOL_ROOTS[0];
const MEMPOOL_SITE = "https://mempool.space";
const SPOT_URL = "https://api.coinbase.com/v2/prices/BTC-USD/spot";

export const SATS_PER_BTC = 100_000_000;
export const ONE_BTC_SATS = 100_000_000;
/** Labeled headcount for the per-person figure. */
export const SALVADOR_POPULATION = 6_300_000;

/** El Salvador civil time is UTC-6 year round. */
const SV_SHIFT_MS = 6 * 60 * 60 * 1000;
/** A visit inside this window is served from the last pull and does not call mempool. */
export const SALVADOR_REVALIDATE_MS = 6 * 60 * 60 * 1000;
const PAGE_CAP = 120;
const POOL = 2;
const READ_ATTEMPTS = MEMPOOL_ROOTS.length;
const CACHE_PATH = join(tmpdir(), "surfsats-salvador-history.json");

export { ONBTC_WALLET_URL };

export type WalletTx = {
  txid: string;
  confirmed: boolean;
  time: number | null;
  netSats: number;
};

export type StackPoint = {
  time: number;
  balanceSats: number;
};

export type AddressLoad = {
  address: string;
  balanceSats: number | null;
  txs: WalletTx[] | null;
};

export type AddressRow = {
  address: string;
  balanceSats: number | null;
  stale: boolean;
};

export type SalvadorInflow = {
  txid: string;
  time: number | null;
  amountSats: number;
  confirmed: boolean;
};

export type SalvadorDesk = {
  fetchedAt: number;
  totalSats: number | null;
  totalStale: boolean;
  priceUsd: number | null;
  priceStale: boolean;
  usd: number | null;
  satsPerPerson: number | null;
  streakDays: number | null;
  historyStale: boolean;
  historyKnown: boolean;
  latest: SalvadorInflow | null;
  addresses: AddressRow[];
  stack: StackPoint[];
  steps: BalanceStep[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function svDayKey(unixSec: number) {
  return new Date(unixSec * 1000 - SV_SHIFT_MS).toISOString().slice(0, 10);
}

export function previousSvDay(day: string) {
  const ms = Date.parse(`${day}T00:00:00Z`);
  return new Date(ms - 86_400_000).toISOString().slice(0, 10);
}

export function mempoolAddressUrl(address: string) {
  return `${MEMPOOL_SITE}/address/${address}`;
}

export function mempoolTxUrl(txid: string) {
  return `${MEMPOOL_SITE}/tx/${txid}`;
}

export function parseBalance(payload: unknown) {
  if (!isRecord(payload) || !isRecord(payload.chain_stats)) return null;
  const funded = payload.chain_stats.funded_txo_sum;
  const spent = payload.chain_stats.spent_txo_sum;
  if (typeof funded !== "number" || typeof spent !== "number") return null;
  if (!Number.isInteger(funded) || !Number.isInteger(spent)) return null;
  if (funded < 0 || spent < 0 || spent > funded) return null;
  return funded - spent;
}

export function parseSpotUsd(payload: unknown) {
  if (!isRecord(payload) || !isRecord(payload.data)) return null;
  const amount = payload.data.amount;
  if (typeof amount !== "string" && typeof amount !== "number") return null;
  const price = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(price) || price <= 0) return null;
  return price;
}

function movedSats(value: unknown) {
  if (!isRecord(value)) return null;
  const sats = value.value;
  if (typeof sats !== "number" || !Number.isInteger(sats) || sats < 0) return null;
  const address =
    typeof value.scriptpubkey_address === "string" ? value.scriptpubkey_address : null;
  return { address, value: sats };
}

export function parseWalletTx(item: unknown, addresses: ReadonlySet<string>): WalletTx | null {
  if (!isRecord(item)) return null;
  if (typeof item.txid !== "string" || !/^[a-fA-F0-9]{64}$/.test(item.txid)) return null;
  if (!Array.isArray(item.vin) || !Array.isArray(item.vout)) return null;

  const status = isRecord(item.status) ? item.status : null;
  const confirmed = status?.confirmed === true;
  const blockTime =
    status && typeof status.block_time === "number" && Number.isFinite(status.block_time)
      ? Math.floor(status.block_time)
      : null;
  if (confirmed && blockTime === null) return null;

  let netSats = 0;
  for (const output of item.vout) {
    const moved = movedSats(output);
    if (!moved) return null;
    if (moved.address && addresses.has(moved.address)) netSats += moved.value;
  }
  for (const input of item.vin) {
    if (!isRecord(input)) return null;
    if (!isRecord(input.prevout)) continue;
    const moved = movedSats(input.prevout);
    if (!moved) return null;
    if (moved.address && addresses.has(moved.address)) netSats -= moved.value;
  }

  return {
    txid: item.txid,
    confirmed,
    time: confirmed ? blockTime : null,
    netSats,
  };
}

export function dedupeWalletTxs(txs: readonly WalletTx[]) {
  const byId = new Map<string, WalletTx>();
  for (const tx of txs) {
    const prior = byId.get(tx.txid);
    if (prior && prior.netSats !== tx.netSats) return null;
    if (!prior) byId.set(tx.txid, tx);
  }
  return [...byId.values()];
}

export function oneBtcInflows(txs: readonly WalletTx[]): SalvadorInflow[] {
  const hits: SalvadorInflow[] = [];
  for (const tx of txs) {
    if (tx.netSats !== ONE_BTC_SATS) continue;
    hits.push({
      txid: tx.txid,
      time: tx.time,
      amountSats: tx.netSats,
      confirmed: tx.confirmed,
    });
  }
  return hits;
}

export function latestOneBtcInflow(hits: readonly SalvadorInflow[]) {
  let best: SalvadorInflow | null = null;
  for (const hit of hits) {
    if (!hit.confirmed) {
      if (!best || best.confirmed) best = hit;
      continue;
    }
    if (best && !best.confirmed) continue;
    if (hit.time === null) continue;
    if (!best || best.time === null || hit.time > best.time) best = hit;
  }
  return best;
}

export function countStreakDays(hits: readonly SalvadorInflow[], nowSec: number) {
  const days = new Set<string>();
  for (const hit of hits) {
    days.add(svDayKey(hit.time ?? nowSec));
  }
  const today = svDayKey(nowSec);
  let cursor: string | null = days.has(today)
    ? today
    : days.has(previousSvDay(today))
      ? previousSvDay(today)
      : null;
  if (!cursor) return 0;

  let count = 0;
  while (cursor && days.has(cursor) && count < 20_000) {
    count += 1;
    cursor = previousSvDay(cursor);
  }
  return count;
}

export function stackFromTxs(txs: readonly WalletTx[]) {
  const confirmed = txs.filter((tx) => tx.confirmed);
  if (confirmed.some((tx) => tx.time === null)) return null;

  const ordered = [...confirmed].sort((a, b) => {
    const at = a.time ?? 0;
    const bt = b.time ?? 0;
    if (at !== bt) return at - bt;
    if (a.txid < b.txid) return -1;
    if (a.txid > b.txid) return 1;
    return 0;
  });

  let balanceSats = 0;
  const raw: StackPoint[] = [];
  for (const tx of ordered) {
    if (tx.time === null) return null;
    balanceSats += tx.netSats;
    raw.push({ time: tx.time, balanceSats });
  }

  return { points: dailyCloses(raw), endSats: balanceSats };
}

export function dailyCloses(points: readonly StackPoint[]) {
  const last = new Map<string, StackPoint>();
  const order: string[] = [];
  for (const point of points) {
    const day = svDayKey(point.time);
    if (!last.has(day)) order.push(day);
    last.set(day, point);
  }
  const closes: StackPoint[] = [];
  for (const day of order) {
    const point = last.get(day);
    if (point) closes.push(point);
  }
  return closes;
}

export function satsPerSalvadoran(totalSats: number) {
  return totalSats / SALVADOR_POPULATION;
}

export function reserveUsd(totalSats: number, priceUsd: number) {
  return (totalSats / SATS_PER_BTC) * priceUsd;
}

export function formatBtc(sats: number) {
  const negative = sats < 0;
  const abs = negative ? -sats : sats;
  const whole = Math.floor(abs / SATS_PER_BTC);
  const frac = abs % SATS_PER_BTC;
  const wholeText = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(whole);
  return `${negative ? "-" : ""}${wholeText}.${frac.toString().padStart(8, "0")}`;
}

export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatSats(amount: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(amount),
  );
}

export function formatPopulation(count: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(count);
}

const svTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/El_Salvador",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatSvTime(unixSec: number) {
  return `${svTime.format(new Date(unixSec * 1000))} SV`;
}

export function formatAsOf(fetchedAtMs: number) {
  if (!Number.isFinite(fetchedAtMs)) return "as of —";
  return `as of ${formatSvTime(Math.floor(fetchedAtMs / 1000))}`;
}

export function truncateMiddle(value: string, head: number, tail: number) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function formatStreakChip(streak: number | null, historyStale: boolean) {
  if (streak === null) return "STALE · —";
  const unit = streak === 1 ? "DAY" : "DAYS";
  return `${historyStale ? "STALE" : "LIVE"} · ${streak} ${unit}`;
}

function sumBalances(rows: readonly AddressRow[]) {
  let sum = 0;
  for (const row of rows) {
    if (row.balanceSats === null) return null;
    sum += row.balanceSats;
  }
  return sum;
}

function blankDesk(fetchedAt: number): SalvadorDesk {
  return {
    fetchedAt,
    totalSats: null,
    totalStale: true,
    priceUsd: null,
    priceStale: true,
    usd: null,
    satsPerPerson: null,
    streakDays: null,
    historyStale: true,
    historyKnown: false,
    latest: null,
    addresses: ONBTC_ADDRESSES.map((address) => ({
      address,
      balanceSats: null,
      stale: true,
    })),
    stack: [],
    steps: [],
  };
}

export function assembleSalvadorDesk(input: {
  loads: readonly AddressLoad[];
  priceUsd: number | null;
  nowSec: number;
  previous: SalvadorDesk | null;
  fetchedAt: number;
}): SalvadorDesk {
  const byAddress = new Map(input.loads.map((load) => [load.address, load]));
  const previousByAddress = new Map(
    (input.previous?.addresses ?? []).map((row) => [row.address, row]),
  );

  const addresses: AddressRow[] = ONBTC_ADDRESSES.map((address) => {
    const load = byAddress.get(address);
    if (load && load.balanceSats !== null) {
      return { address, balanceSats: load.balanceSats, stale: false };
    }
    const prior = previousByAddress.get(address);
    if (prior && prior.balanceSats !== null) {
      return { address, balanceSats: prior.balanceSats, stale: true };
    }
    return { address, balanceSats: null, stale: true };
  });

  const totalSats = sumBalances(addresses);
  const totalStale = totalSats === null || addresses.some((row) => row.stale);

  let priceUsd = input.priceUsd;
  let priceStale = false;
  if (priceUsd === null && input.previous?.priceUsd !== null && input.previous?.priceUsd !== undefined) {
    priceUsd = input.previous.priceUsd;
    priceStale = true;
  } else if (priceUsd === null) {
    priceStale = true;
  }

  const usd =
    totalSats !== null && priceUsd !== null ? reserveUsd(totalSats, priceUsd) : null;
  const satsPerPerson = totalSats !== null ? satsPerSalvadoran(totalSats) : null;

  const historyComplete = ONBTC_ADDRESSES.every((address) => {
    const load = byAddress.get(address);
    return load !== undefined && load.txs !== null;
  });

  let streakDays: number | null = null;
  let latest: SalvadorInflow | null = null;
  let stack: StackPoint[] = [];
  let steps: BalanceStep[] = [];
  let historyKnown = false;
  let historyStale = false;

  if (historyComplete) {
    const flat: WalletTx[] = [];
    for (const address of ONBTC_ADDRESSES) {
      const load = byAddress.get(address);
      if (load?.txs) flat.push(...load.txs);
    }
    const unique = dedupeWalletTxs(flat);
    const stacked = unique ? stackFromTxs(unique) : null;
    const windowed = unique ? windowBalance(unique, input.nowSec) : null;
    const matches =
      unique !== null &&
      stacked !== null &&
      windowed !== null &&
      totalSats !== null &&
      stacked.endSats === totalSats &&
      windowed[windowed.length - 1]?.balanceSats === totalSats &&
      !totalStale;

    if (matches && unique && stacked && windowed) {
      const hits = oneBtcInflows(unique);
      streakDays = countStreakDays(hits, input.nowSec);
      latest = latestOneBtcInflow(hits);
      stack = stacked.points;
      steps = windowed;
      historyKnown = true;
      historyStale = false;
    }
  }

  if (!historyKnown && input.previous?.historyKnown) {
    streakDays = input.previous.streakDays;
    latest = input.previous.latest ? { ...input.previous.latest } : null;
    stack = input.previous.stack.slice();
    steps = input.previous.steps.map((step) => ({ ...step }));
    historyKnown = true;
    historyStale = true;
  } else if (!historyKnown) {
    historyStale = true;
  }

  return {
    fetchedAt: input.fetchedAt,
    totalSats,
    totalStale,
    priceUsd,
    priceStale,
    usd,
    satsPerPerson,
    streakDays,
    historyStale,
    historyKnown,
    latest,
    addresses,
    stack,
    steps,
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let inFlight = 0;
const slots: Array<() => void> = [];

async function withSlot<T>(run: () => Promise<T>) {
  if (inFlight >= POOL) {
    await new Promise<void>((resolve) => slots.push(resolve));
  }
  inFlight += 1;
  try {
    return await run();
  } finally {
    inFlight -= 1;
    const next = slots.shift();
    if (next) next();
  }
}

type HostState = {
  down: boolean;
  pinned: boolean;
  cursor: number;
  cooled: boolean[];
};

function isMempoolUrl(url: string) {
  return MEMPOOL_ROOTS.some((root) => url.startsWith(root));
}

function coolRoot(host: HostState, index: number) {
  host.cooled[index] = true;
  if (index === 0) host.pinned = false;
}

function chooseRoot(host: HostState) {
  if (host.pinned && !host.cooled[0]) return 0;
  for (let step = 0; step < MEMPOOL_ROOTS.length; step += 1) {
    const index = (host.cursor + step) % MEMPOOL_ROOTS.length;
    if (!host.cooled[index]) {
      host.cursor = (index + 1) % MEMPOOL_ROOTS.length;
      return index;
    }
  }
  host.down = true;
  return null;
}

function mempoolUrl(url: string, index: number) {
  const root = MEMPOOL_ROOTS[index] ?? MEMPOOL;
  for (const candidate of MEMPOOL_ROOTS) {
    if (url.startsWith(candidate)) return root + url.slice(candidate.length);
  }
  return url;
}

function named(value: unknown, name: string) {
  return isRecord(value) && value.name === name;
}

function connectFailed(error: unknown) {
  if (named(error, "ConnectTimeoutError")) return true;
  const cause = isRecord(error) && "cause" in error ? error.cause : error;
  if (named(cause, "ConnectTimeoutError")) return true;
  if (!isRecord(cause) || typeof cause.code !== "string") return false;
  return (
    cause.code === "UND_ERR_CONNECT_TIMEOUT" ||
    cause.code === "UND_ERR_SOCKET" ||
    cause.code === "ENOTFOUND" ||
    cause.code === "ECONNREFUSED" ||
    cause.code === "ECONNRESET" ||
    cause.code === "ETIMEDOUT"
  );
}

async function readJson(url: string, fetchImpl: typeof fetch, host: HostState) {
  const mempool = isMempoolUrl(url);
  if (host.down && mempool) return null;

  for (let attempt = 0; attempt < READ_ATTEMPTS; attempt += 1) {
    const index = mempool ? chooseRoot(host) : null;
    if (mempool && index === null) return null;
    const target = index === null ? url : mempoolUrl(url, index);
    try {
      const response = await withSlot(() =>
        fetchImpl(target, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(20_000),
        }),
      );
      if (response.status === 429 || response.status >= 500) {
        if (index !== null) coolRoot(host, index);
        const retryAfter = Number(response.headers.get("retry-after"));
        const backoff =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 400 * (attempt + 1);
        await wait(backoff);
        continue;
      }
      if (!response.ok) return null;
      const body: unknown = await response.json();
      return body;
    } catch (error) {
      if (index !== null && connectFailed(error)) {
        coolRoot(host, index);
        if (host.down) return null;
      }
      await wait(300 * (attempt + 1));
    }
  }
  return null;
}

async function fetchChainTxs(
  address: string,
  fetchImpl: typeof fetch,
  host: HostState,
  known: ReadonlySet<string>,
) {
  const pages: unknown[] = [];
  const seen = new Set<string>();
  let url = `${MEMPOOL}/address/${address}/txs/chain`;

  for (let page = 0; page < PAGE_CAP; page += 1) {
    if (host.down) return null;
    const payload = await readJson(url, fetchImpl, host);
    if (!Array.isArray(payload)) return null;
    if (payload.length === 0) break;

    let added = 0;
    let overlapped = false;
    let lastId = "";
    for (const item of payload) {
      if (!isRecord(item) || typeof item.txid !== "string") return null;
      lastId = item.txid;
      if (known.has(item.txid)) overlapped = true;
      if (seen.has(item.txid) || known.has(item.txid)) continue;
      seen.add(item.txid);
      pages.push(item);
      added += 1;
    }
    if (!lastId || added === 0 || overlapped || payload.length < 10) break;
    await wait(80);
    url = `${MEMPOOL}/address/${address}/txs/chain/${lastId}`;
  }

  return pages;
}

function isWalletTx(value: unknown): value is WalletTx {
  if (!isRecord(value)) return false;
  if (typeof value.txid !== "string" || !/^[a-fA-F0-9]{64}$/.test(value.txid)) return false;
  if (typeof value.confirmed !== "boolean") return false;
  if (value.time !== null && (typeof value.time !== "number" || !Number.isInteger(value.time))) {
    return false;
  }
  return typeof value.netSats === "number" && Number.isInteger(value.netSats);
}

async function fetchAddress(
  address: string,
  fetchImpl: typeof fetch,
  addresses: ReadonlySet<string>,
  host: HostState,
  cached: readonly WalletTx[] | undefined,
): Promise<AddressLoad> {
  try {
    const info = await readJson(`${MEMPOOL}/address/${address}`, fetchImpl, host);
    const balanceSats = info === null ? null : parseBalance(info);
    const known = new Set((cached ?? []).map((tx) => tx.txid));
    const chain = await fetchChainTxs(address, fetchImpl, host, known);
    if (chain === null) return { address, balanceSats, txs: null };

    const mempool = host.down
      ? []
      : await readJson(`${MEMPOOL}/address/${address}/txs/mempool`, fetchImpl, host);
    const pending = Array.isArray(mempool) ? mempool : [];
    const txs: WalletTx[] = [...(cached ?? [])];
    for (const item of [...chain, ...pending]) {
      const tx = parseWalletTx(item, addresses);
      if (!tx) return { address, balanceSats, txs: null };
      txs.push(tx);
    }
    const unique = dedupeWalletTxs(txs);
    if (!unique) return { address, balanceSats, txs: null };
    return { address, balanceSats, txs: unique };
  } catch {
    return { address, balanceSats: null, txs: null };
  }
}

async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
) {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return out;
}

async function fetchPrice(fetchImpl: typeof fetch, host: HostState) {
  const payload = await readJson(SPOT_URL, fetchImpl, host);
  if (payload === null) return null;
  return parseSpotUsd(payload);
}

type SavedHistory = {
  fetchedAt: number;
  priceUsd: number | null;
  loads: AddressLoad[];
};

export function parseSavedHistory(payload: unknown): SavedHistory | null {
  if (!isRecord(payload) || !Array.isArray(payload.loads)) return null;
  if (typeof payload.fetchedAt !== "number" || !Number.isFinite(payload.fetchedAt)) return null;
  if (payload.priceUsd !== null && (typeof payload.priceUsd !== "number" || payload.priceUsd <= 0)) {
    return null;
  }
  if (payload.loads.length !== ONBTC_ADDRESSES.length) return null;

  const loads: AddressLoad[] = [];
  for (let index = 0; index < ONBTC_ADDRESSES.length; index += 1) {
    const item = payload.loads[index];
    const address = ONBTC_ADDRESSES[index];
    if (!isRecord(item) || item.address !== address) return null;
    if (typeof item.balanceSats !== "number" || !Number.isInteger(item.balanceSats) || item.balanceSats < 0) {
      return null;
    }
    if (!Array.isArray(item.txs)) return null;
    const txs: WalletTx[] = [];
    for (const tx of item.txs) {
      if (!isWalletTx(tx)) return null;
      txs.push(tx);
    }
    loads.push({ address, balanceSats: item.balanceSats, txs });
  }

  return {
    fetchedAt: payload.fetchedAt,
    priceUsd: payload.priceUsd,
    loads,
  };
}

function readSaved(path: string) {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    return parseSavedHistory(parsed);
  } catch {
    return null;
  }
}

function writeSaved(path: string, saved: SavedHistory) {
  try {
    writeFileSync(path, JSON.stringify(saved));
  } catch {
    // The desk still renders. The next request fetches again.
  }
}

function deskFromSaved(saved: SavedHistory, nowMs: number) {
  return assembleSalvadorDesk({
    loads: saved.loads,
    priceUsd: saved.priceUsd,
    nowSec: Math.floor(nowMs / 1000),
    previous: null,
    fetchedAt: saved.fetchedAt,
  });
}

async function pickRoot(fetchImpl: typeof fetch, host: HostState) {
  try {
    const response = await fetchImpl(`${MEMPOOL}/blocks/tip/height`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
    if (response.ok) {
      host.pinned = true;
      return;
    }
  } catch {
    // The public anycast did not connect. Later reads use the backends.
  }
  coolRoot(host, 0);
}

async function syncSalvador(
  previous: SalvadorDesk | null,
  nowMs: number,
  fetchImpl: typeof fetch,
  known: ReadonlyMap<string, readonly WalletTx[]>,
) {
  const addresses = new Set<string>(ONBTC_ADDRESSES);
  const host: HostState = {
    down: false,
    pinned: false,
    cursor: 1,
    cooled: MEMPOOL_ROOTS.map(() => false),
  };
  await pickRoot(fetchImpl, host);
  const [priceUsd, loads] = await Promise.all([
    fetchPrice(fetchImpl, host),
    mapPool(ONBTC_ADDRESSES, POOL, (address) =>
      fetchAddress(address, fetchImpl, addresses, host, known.get(address)),
    ),
  ]);

  return {
    loads,
    desk: assembleSalvadorDesk({
      loads,
      priceUsd,
      nowSec: Math.floor(nowMs / 1000),
      previous,
      fetchedAt: nowMs,
    }),
  };
}

export async function loadSalvadorDesk(
  previous: SalvadorDesk | null,
  nowMs: number,
  fetchImpl: typeof fetch,
) {
  const synced = await syncSalvador(previous, nowMs, fetchImpl, new Map());
  return synced.desk;
}

function deskStale(desk: SalvadorDesk) {
  return desk.totalStale || desk.priceStale || desk.historyStale;
}

function staleDesk(previous: SalvadorDesk | null, now: number) {
  if (!previous) return blankDesk(now);
  return {
    ...previous,
    totalStale: true,
    priceStale: true,
    historyStale: true,
    addresses: previous.addresses.map((row) => ({
      ...row,
      stale: true,
    })),
  };
}

type DeskSlot = {
  storedAt: number;
  desk: SalvadorDesk | null;
  pending: Promise<SalvadorDesk> | null;
};

const deskSlots = new Map<string, DeskSlot>();

function slotFor(path: string) {
  const found = deskSlots.get(path);
  if (found) return found;
  const created: DeskSlot = { storedAt: 0, desk: null, pending: null };
  deskSlots.set(path, created);
  return created;
}

async function readOrPull(
  now: number,
  fetchImpl: typeof fetch,
  path: string,
  previousHint: SalvadorDesk | null,
) {
  const saved = readSaved(path);
  const savedDesk = saved ? deskFromSaved(saved, now) : null;
  if (
    saved &&
    savedDesk &&
    now - saved.fetchedAt < SALVADOR_REVALIDATE_MS &&
    !deskStale(savedDesk)
  ) {
    return { desk: savedDesk, storedAt: saved.fetchedAt };
  }

  const previous = previousHint ?? savedDesk;
  const known = new Map<string, readonly WalletTx[]>();
  if (saved) {
    for (const load of saved.loads) {
      if (load.txs) known.set(load.address, load.txs);
    }
  }

  let desk: SalvadorDesk;
  try {
    const synced = await syncSalvador(previous, now, fetchImpl, known);
    desk = synced.desk;
    if (
      !deskStale(desk) &&
      desk.historyKnown &&
      synced.loads.every((load) => load.txs && load.balanceSats !== null)
    ) {
      writeSaved(path, {
        fetchedAt: desk.fetchedAt,
        priceUsd: desk.priceUsd,
        loads: synced.loads,
      });
    }
  } catch {
    desk = staleDesk(previous, now);
  }

  if (previous && deskStale(desk)) {
    return { desk: { ...desk, fetchedAt: previous.fetchedAt }, storedAt: now };
  }
  return { desk, storedAt: now };
}

export function clearSalvadorCache(path: string) {
  deskSlots.delete(path);
}

export async function getSalvadorDesk(override?: {
  now?: number;
  fetchImpl?: typeof fetch;
  cachePath?: string;
}) {
  const path = override?.cachePath ?? CACHE_PATH;
  const now = override?.now ?? Date.now();
  const fetchImpl = override?.fetchImpl ?? fetch;
  const slot = slotFor(path);

  if (slot.desk && now - slot.storedAt < SALVADOR_REVALIDATE_MS) return slot.desk;
  if (slot.pending) return slot.pending;

  slot.pending = readOrPull(now, fetchImpl, path, slot.desk)
    .then((result) => {
      slot.desk = result.desk;
      slot.storedAt = result.storedAt;
      return result.desk;
    })
    .finally(() => {
      slot.pending = null;
    });
  return slot.pending;
}
