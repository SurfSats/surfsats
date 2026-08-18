const MEMPOOL = "https://mempool.space/api";
const HALVING_INTERVAL = 210_000;
const SATS_PER_BTC = 100_000_000;

export type PriceDirection = "up" | "down" | "flat";

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
  blocksToHalving: number | null;
  nextHalvingHeight: number | null;
  fastestFee: number | null;
  hourFee: number | null;
  feeLabel: string | null;
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
  blocksToHalving: null,
  nextHalvingHeight: null,
  fastestFee: null,
  hourFee: null,
  feeLabel: null,
};

// Wave Pool will key visuals off snapshot.priceDirection / priceChangePct.
export async function getTimechainSnapshot(): Promise<TimechainSnapshot> {
  const yesterday = Math.floor(Date.now() / 1000) - 86_400;

  const [prices, historical, tip, blocks, difficulty, hashrate, fees] =
    await Promise.all([
      readJson<PricesResponse>(`${MEMPOOL}/v1/prices`),
      readJson<HistoricalResponse>(
        `${MEMPOOL}/v1/historical-price?currency=USD&timestamp=${yesterday}`,
      ),
      readText(`${MEMPOOL}/blocks/tip/height`),
      readJson<BlockSummary[]>(`${MEMPOOL}/v1/blocks`),
      readJson<DifficultyResponse>(`${MEMPOOL}/v1/difficulty-adjustment`),
      readJson<HashrateResponse>(`${MEMPOOL}/v1/mining/hashrate/3d`),
      readJson<FeesResponse>(`${MEMPOOL}/v1/fees/recommended`),
    ]);

  const priceUsd = num(prices?.USD);
  const priceUsdYesterday = num(historical?.prices?.[0]?.USD);
  const priceChangePct =
    priceUsd !== null && priceUsdYesterday && priceUsdYesterday > 0
      ? ((priceUsd - priceUsdYesterday) / priceUsdYesterday) * 100
      : null;

  const blockHeight = parseHeight(tip) ?? num(blocks?.[0]?.height);
  const lastBlockTimestamp = num(blocks?.[0]?.timestamp);

  const nextHalvingHeight =
    blockHeight !== null
      ? (Math.floor(blockHeight / HALVING_INTERVAL) + 1) * HALVING_INTERVAL
      : null;

  const fastestFee = num(fees?.fastestFee);

  return {
    fetchedAt: Date.now(),
    priceUsd,
    priceUsdYesterday,
    priceChangePct,
    priceDirection: directionFrom(priceChangePct),
    satsPerDollar:
      priceUsd && priceUsd > 0 ? Math.round(SATS_PER_BTC / priceUsd) : null,
    blockHeight,
    lastBlockTimestamp,
    hashrateEh: hashrate?.currentHashrate
      ? hashrate.currentHashrate / 1e18
      : null,
    difficulty: num(hashrate?.currentDifficulty),
    difficultyChangePct: num(difficulty?.difficultyChange),
    remainingBlocksToRetarget: num(difficulty?.remainingBlocks),
    blocksToHalving:
      blockHeight !== null && nextHalvingHeight !== null
        ? nextHalvingHeight - blockHeight
        : null,
    nextHalvingHeight,
    fastestFee,
    hourFee: num(fees?.hourFee),
    feeLabel: feeEnvironment(fastestFee),
  };
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
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
};
type HashrateResponse = {
  currentHashrate?: number;
  currentDifficulty?: number;
};
type FeesResponse = { fastestFee?: number; hourFee?: number };

function directionFrom(pct: number | null): PriceDirection | null {
  if (pct === null) return null;
  if (pct > 0.05) return "up";
  if (pct < -0.05) return "down";
  return "flat";
}

function feeEnvironment(fastest: number | null) {
  if (fastest === null) return null;
  if (fastest <= 2) return "flat · cheap";
  if (fastest <= 8) return "calm";
  if (fastest <= 25) return "building";
  if (fastest <= 60) return "heavy";
  return "storm";
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
