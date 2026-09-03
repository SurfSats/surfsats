const MEMPOOL = "https://mempool.space/api";
const HALVING_INTERVAL = 210_000;
const EPOCH_LENGTH = 2016;
const SATS_PER_BTC = 100_000_000;

export type PriceDirection = "up" | "down" | "flat";
export type FeeTone = "floor" | "calm" | "building" | "heavy";

export type TimechainSnapshot = {
  fetchedAt: number;
  priceUsd: number | null;
  priceUsdYesterday: number | null;
  priceChangePct: number | null;
  priceDirection: PriceDirection | null;
  satsPerDollar: number | null;
  blockHeight: number | null;
  lastBlockTimestamp: number | null;
  hashrateEh: number | null;
  difficulty: number | null;
  difficultyChangePct: number | null;
  remainingBlocksToRetarget: number | null;
  difficultyProgressPercent: number | null;
  blocksToHalving: number | null;
  nextHalvingHeight: number | null;
  halvingProgressPercent: number | null;
  supplyIssued: number | null;
  supplyPercent: number | null;
  blocksLast24h: number | null;
  fastestFee: number | null;
  hourFee: number | null;
  feeLabel: string | null;
  avgIntervalMs: number | null;
  epochStart: number | null;
  epochEnd: number | null;
  epochBlocksDone: number | null;
  epochLength: number;
  subsidyBtc: number | null;
  daysToHalving: number | null;
  satsChange24h: number | null;
  satsChange30d: number | null;
  hashrateChangePct: number | null;
  hashrateSpark: number[];
  mempoolCount: number | null;
};

export const emptySnapshot: TimechainSnapshot = {
  fetchedAt: 0,
  priceUsd: null,
  priceUsdYesterday: null,
  priceChangePct: null,
  priceDirection: null,
  satsPerDollar: null,
  blockHeight: null,
  lastBlockTimestamp: null,
  hashrateEh: null,
  difficulty: null,
  difficultyChangePct: null,
  remainingBlocksToRetarget: null,
  difficultyProgressPercent: null,
  blocksToHalving: null,
  nextHalvingHeight: null,
  halvingProgressPercent: null,
  supplyIssued: null,
  supplyPercent: null,
  blocksLast24h: null,
  fastestFee: null,
  hourFee: null,
  feeLabel: null,
  avgIntervalMs: null,
  epochStart: null,
  epochEnd: null,
  epochBlocksDone: null,
  epochLength: EPOCH_LENGTH,
  subsidyBtc: null,
  daysToHalving: null,
  satsChange24h: null,
  satsChange30d: null,
  hashrateChangePct: null,
  hashrateSpark: [],
  mempoolCount: null,
};

// Wave Pool will key visuals off snapshot.priceDirection / priceChangePct.
export async function getTimechainSnapshot(): Promise<TimechainSnapshot> {
  const nowSec = Math.floor(Date.now() / 1000);
  const yesterday = nowSec - 86_400;
  const monthAgo = nowSec - 30 * 86_400;

  const [
    prices,
    historical,
    historical30,
    tip,
    blocks,
    difficulty,
    hashrate,
    fees,
    mempool,
  ] = await Promise.all([
    readJson<PricesResponse>(`${MEMPOOL}/v1/prices`),
    readJson<HistoricalResponse>(
      `${MEMPOOL}/v1/historical-price?currency=USD&timestamp=${yesterday}`,
    ),
    readJson<HistoricalResponse>(
      `${MEMPOOL}/v1/historical-price?currency=USD&timestamp=${monthAgo}`,
    ),
    readText(`${MEMPOOL}/blocks/tip/height`),
    readJson<BlockSummary[]>(`${MEMPOOL}/v1/blocks`),
    readJson<DifficultyResponse>(`${MEMPOOL}/v1/difficulty-adjustment`),
    readJson<HashrateResponse>(`${MEMPOOL}/v1/mining/hashrate/3d`),
    readJson<FeesResponse>(`${MEMPOOL}/v1/fees/recommended`),
    readJson<MempoolResponse>(`${MEMPOOL}/mempool`),
  ]);

  const priceUsd = num(prices?.USD);
  const priceUsdYesterday = num(historical?.prices?.[0]?.USD);
  const priceUsd30d = num(historical30?.prices?.[0]?.USD);
  const priceChangePct =
    priceUsd !== null && priceUsdYesterday && priceUsdYesterday > 0
      ? ((priceUsd - priceUsdYesterday) / priceUsdYesterday) * 100
      : null;

  const satsPerDollar =
    priceUsd && priceUsd > 0 ? Math.round(SATS_PER_BTC / priceUsd) : null;
  const satsYesterday =
    priceUsdYesterday && priceUsdYesterday > 0
      ? SATS_PER_BTC / priceUsdYesterday
      : null;
  const sats30d =
    priceUsd30d && priceUsd30d > 0 ? SATS_PER_BTC / priceUsd30d : null;

  const blockHeight = parseHeight(tip) ?? num(blocks?.[0]?.height);
  const lastBlockTimestamp = num(blocks?.[0]?.timestamp);
  const remaining = num(difficulty?.remainingBlocks);
  const avgIntervalMs = num(difficulty?.timeAvg);

  const nextHalvingHeight =
    blockHeight !== null
      ? (Math.floor(blockHeight / HALVING_INTERVAL) + 1) * HALVING_INTERVAL
      : null;
  const blocksToHalving =
    blockHeight !== null && nextHalvingHeight !== null
      ? nextHalvingHeight - blockHeight
      : null;

  const epochEnd =
    num(difficulty?.nextRetargetHeight) ??
    (blockHeight !== null && remaining !== null
      ? blockHeight + remaining
      : null);
  const epochStart = epochEnd !== null ? epochEnd - EPOCH_LENGTH : null;
  const epochBlocksDone =
    remaining !== null ? EPOCH_LENGTH - remaining : null;

  const currentEh = hashrate?.currentHashrate
    ? hashrate.currentHashrate / 1e18
    : null;
  const spark = (hashrate?.hashrates ?? [])
    .map((row) => (row.avgHashrate ? row.avgHashrate / 1e18 : null))
    .filter((value): value is number => value !== null)
    .slice(-24);
  const ehYesterday = spark.length >= 8 ? spark[Math.max(0, spark.length - 8)] : null;

  const fastestFee = num(fees?.fastestFee);
  const intervalSec = avgIntervalMs && avgIntervalMs > 0 ? avgIntervalMs / 1000 : 600;

  return {
    fetchedAt: Date.now(),
    priceUsd,
    priceUsdYesterday,
    priceChangePct,
    priceDirection: directionFrom(priceChangePct),
    satsPerDollar,
    blockHeight,
    lastBlockTimestamp,
    hashrateEh: currentEh,
    difficulty: num(hashrate?.currentDifficulty),
    difficultyChangePct: num(difficulty?.difficultyChange),
    remainingBlocksToRetarget: remaining,
    difficultyProgressPercent: num(difficulty?.progressPercent),
    blocksToHalving,
    nextHalvingHeight,
    halvingProgressPercent:
      blockHeight !== null
        ? ((blockHeight % HALVING_INTERVAL) / HALVING_INTERVAL) * 100
        : null,
    supplyIssued: blockHeight !== null ? issuedSupply(blockHeight) : null,
    supplyPercent:
      blockHeight !== null
        ? (issuedSupply(blockHeight) / 21_000_000) * 100
        : null,
    blocksLast24h: estimateBlocksLast24h(avgIntervalMs),
    fastestFee,
    hourFee: num(fees?.hourFee),
    feeLabel: feeEnvironment(fastestFee),
    avgIntervalMs,
    epochStart,
    epochEnd,
    epochBlocksDone,
    epochLength: EPOCH_LENGTH,
    subsidyBtc: blockHeight !== null ? subsidyAt(blockHeight) : null,
    daysToHalving:
      blocksToHalving !== null
        ? (blocksToHalving * intervalSec) / 86_400
        : null,
    satsChange24h:
      satsPerDollar !== null && satsYesterday
        ? ((satsPerDollar - satsYesterday) / satsYesterday) * 100
        : null,
    satsChange30d:
      satsPerDollar !== null && sats30d
        ? ((satsPerDollar - sats30d) / sats30d) * 100
        : null,
    hashrateChangePct:
      currentEh !== null && ehYesterday && ehYesterday > 0
        ? ((currentEh - ehYesterday) / ehYesterday) * 100
        : null,
    hashrateSpark: spark,
    mempoolCount: num(mempool?.count),
  };
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatUsdPrecise(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatInterval(ms: number) {
  return formatBlockAge(ms / 1000);
}

export function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    value,
  );
}

export function formatHashrate(eh: number) {
  return `${eh.toFixed(1)} EH/s`;
}

export function formatDifficulty(value: number) {
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)} T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} B`;
  return formatInteger(value);
}

export function formatChange(pct: number) {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatBlockAge(seconds: number) {
  if (seconds < 0) return "0s";
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  if (minutes < 60) return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export function hasLiveData(snapshot: TimechainSnapshot) {
  return (
    snapshot.priceUsd !== null ||
    snapshot.blockHeight !== null ||
    snapshot.hashrateEh !== null
  );
}

type PricesResponse = { USD?: number };
type HistoricalResponse = { prices?: Array<{ USD?: number }> };
type BlockSummary = { height?: number; timestamp?: number };
type DifficultyResponse = {
  difficultyChange?: number;
  remainingBlocks?: number;
  progressPercent?: number;
  timeAvg?: number;
  nextRetargetHeight?: number;
};
type HashrateResponse = {
  currentHashrate?: number;
  currentDifficulty?: number;
  hashrates?: Array<{ timestamp?: number; avgHashrate?: number }>;
};
type FeesResponse = { fastestFee?: number; hourFee?: number };
type MempoolResponse = { count?: number };

function directionFrom(pct: number | null): PriceDirection | null {
  if (pct === null) return null;
  if (pct > 0.05) return "up";
  if (pct < -0.05) return "down";
  return "flat";
}

export function feeTone(fastest: number | null): FeeTone {
  if (fastest === null || fastest <= 1) return "floor";
  if (fastest <= 8) return "calm";
  if (fastest <= 25) return "building";
  return "heavy";
}

function feeEnvironment(fastest: number | null) {
  if (fastest === null) return null;
  return feeTone(fastest);
}

function subsidyAt(height: number) {
  const era = Math.floor(height / HALVING_INTERVAL);
  return 50 / 2 ** era;
}

function issuedSupply(height: number) {
  let reward = 50;
  let issued = 0;
  let remaining = height;
  while (remaining > 0 && reward > 0) {
    const era = Math.min(remaining, HALVING_INTERVAL);
    issued += era * reward;
    remaining -= era;
    reward /= 2;
  }
  return issued;
}

function estimateBlocksLast24h(timeAvgMs: number | null) {
  if (!timeAvgMs || timeAvgMs <= 0) return null;
  return Math.round(86_400_000 / timeAvgMs);
}

function num(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseHeight(value: string | null) {
  if (!value) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

async function readJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "SurfSatsTimechain/1.0" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 20 },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function readText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "SurfSatsTimechain/1.0" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 20 },
    });
    if (!response.ok) return null;
    return response.text();
  } catch {
    return null;
  }
}
