const MEMPOOL = "https://mempool.space/api";
const SATS_PER_BTC = 100_000_000;
export const TYPICAL_TX_VBYTES = 140;
export const BLOCK_VSIZE = 1_000_000;
const POLL_REVALIDATE = 20;

export type FeeChipId = "now" | "next" | "half" | "hour" | "floor";

export type FeeChip = {
  id: FeeChipId;
  label: string;
  satVb: number | null;
};

export type ProjectedBlock = {
  index: number;
  blockSize: number;
  blockVSize: number;
  nTx: number;
  totalFees: number;
  medianFee: number;
  feeMin: number;
  feeMax: number;
};

export type MinedBlock = {
  height: number;
  hash: string;
  timestamp: number;
  txCount: number;
  medianFee: number | null;
  totalFees: number | null;
  pool: string | null;
};

export type LineupSnapshot = {
  fetchedAt: number;
  fastestFee: number | null;
  halfHourFee: number | null;
  hourFee: number | null;
  economyFee: number | null;
  minimumFee: number | null;
  mempoolCount: number | null;
  mempoolVsize: number | null;
  mempoolTotalFee: number | null;
  priceUsd: number | null;
  projected: ProjectedBlock[];
  recent: MinedBlock[];
  progressPercent: number | null;
  remainingBlocks: number | null;
  estimatedRetargetDate: number | null;
  timeAvg: number | null;
};

export const emptyLineup: LineupSnapshot = {
  fetchedAt: 0,
  fastestFee: null,
  halfHourFee: null,
  hourFee: null,
  economyFee: null,
  minimumFee: null,
  mempoolCount: null,
  mempoolVsize: null,
  mempoolTotalFee: null,
  priceUsd: null,
  projected: [],
  recent: [],
  progressPercent: null,
  remainingBlocks: null,
  estimatedRetargetDate: null,
  timeAvg: null,
};

export async function getLineupSnapshot(): Promise<LineupSnapshot> {
  const [fees, projectedRaw, mempool, blocks, difficulty, prices] =
    await Promise.all([
      readJson<FeesResponse>(`${MEMPOOL}/v1/fees/recommended`),
      readJson<ProjectedRaw[]>(`${MEMPOOL}/v1/fees/mempool-blocks`),
      readJson<MempoolResponse>(`${MEMPOOL}/mempool`),
      readJson<BlockRaw[]>(`${MEMPOOL}/v1/blocks`),
      readJson<DifficultyResponse>(`${MEMPOOL}/v1/difficulty-adjustment`),
      readJson<PricesResponse>(`${MEMPOOL}/v1/prices`),
    ]);

  const projected = (projectedRaw ?? []).flatMap((block, index) => {
    const blockVSize = num(block.blockVSize);
    const nTx = num(block.nTx);
    const medianFee = num(block.medianFee);
    const totalFees = num(block.totalFees);
    const blockSize = num(block.blockSize);
    if (
      blockVSize === null ||
      nTx === null ||
      medianFee === null ||
      totalFees === null
    ) {
      return [];
    }
    const range = Array.isArray(block.feeRange)
      ? block.feeRange.map(num).filter((value): value is number => value !== null)
      : [];
    return [
      {
        index,
        blockSize: blockSize ?? blockVSize,
        blockVSize,
        nTx,
        totalFees,
        medianFee,
        feeMin: range[0] ?? medianFee,
        feeMax: range[range.length - 1] ?? medianFee,
      },
    ];
  });

  const recent = (blocks ?? []).slice(0, 8).flatMap((block) => {
    const height = num(block.height);
    const hash = typeof block.id === "string" ? block.id : null;
    const timestamp = num(block.timestamp);
    const txCount = num(block.tx_count);
    if (height === null || !hash || timestamp === null || txCount === null) {
      return [];
    }
    return [
      {
        height,
        hash,
        timestamp,
        txCount,
        medianFee: num(block.extras?.medianFee),
        totalFees: num(block.extras?.totalFees),
        pool:
          typeof block.extras?.pool?.name === "string"
            ? block.extras.pool.name
            : null,
      },
    ];
  });

  return {
    fetchedAt: Date.now(),
    fastestFee: num(fees?.fastestFee),
    halfHourFee: num(fees?.halfHourFee),
    hourFee: num(fees?.hourFee),
    economyFee: num(fees?.economyFee),
    minimumFee: num(fees?.minimumFee),
    mempoolCount: num(mempool?.count),
    mempoolVsize: num(mempool?.vsize),
    mempoolTotalFee: num(mempool?.total_fee),
    priceUsd: num(prices?.USD),
    projected,
    recent,
    progressPercent: num(difficulty?.progressPercent),
    remainingBlocks: num(difficulty?.remainingBlocks),
    estimatedRetargetDate: toMs(num(difficulty?.estimatedRetargetDate)),
    timeAvg: num(difficulty?.timeAvg),
  };
}

export function feeChips(snapshot: LineupSnapshot): FeeChip[] {
  return [
    { id: "now", label: "NOW", satVb: snapshot.fastestFee },
    { id: "next", label: "NEXT BLOCK", satVb: snapshot.halfHourFee },
    { id: "half", label: "~30m", satVb: snapshot.hourFee },
    { id: "hour", label: "~1h", satVb: snapshot.economyFee },
    { id: "floor", label: "FLOOR", satVb: snapshot.minimumFee },
  ];
}

export function hasLineupData(snapshot: LineupSnapshot) {
  return (
    snapshot.fastestFee !== null ||
    snapshot.mempoolCount !== null ||
    snapshot.projected.length > 0 ||
    snapshot.recent.length > 0
  );
}

export function formatVmb(vsize: number) {
  const vmb = vsize / 1_000_000;
  if (vmb >= 10) return vmb.toFixed(1);
  return vmb.toFixed(2);
}

export function formatSatVb(value: number) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value - Math.round(value)) < 1e-6) return String(Math.round(value));
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

export function formatBtcFromSats(sats: number) {
  const btc = sats / SATS_PER_BTC;
  if (btc >= 1) return `${btc.toFixed(3)} BTC`;
  if (btc >= 0.01) return `${btc.toFixed(4)} BTC`;
  if (btc >= 0.0001) return `${btc.toFixed(6)} BTC`;
  return `${Math.round(sats).toLocaleString("en-US")} sats`;
}

export function feeUsd(satVb: number, priceUsd: number) {
  return ((satVb * TYPICAL_TX_VBYTES) / SATS_PER_BTC) * priceUsd;
}

export function formatFeeUsd(usd: number) {
  if (usd >= 1) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(usd);
  }
  if (usd >= 0.01) {
    return `$${usd.toFixed(2)}`;
  }
  return `$${usd.toFixed(3)}`;
}

function toMs(value: number | null) {
  if (value === null) return null;
  return value > 1e12 ? value : value * 1000;
}

function num(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function readJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "SurfSatsWell/1.0",
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: POLL_REVALIDATE },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

type FeesResponse = {
  fastestFee?: number;
  halfHourFee?: number;
  hourFee?: number;
  economyFee?: number;
  minimumFee?: number;
};
type MempoolResponse = {
  count?: number;
  vsize?: number;
  total_fee?: number;
};
type ProjectedRaw = {
  nTx?: number;
  medianFee?: number;
  blockVSize?: number;
  blockSize?: number;
  totalFees?: number;
  feeRange?: number[];
};
type BlockRaw = {
  id?: string;
  height?: number;
  timestamp?: number;
  tx_count?: number;
  extras?: {
    medianFee?: number;
    totalFees?: number;
    pool?: { name?: string };
  };
};
type DifficultyResponse = {
  progressPercent?: number;
  remainingBlocks?: number;
  estimatedRetargetDate?: number;
  timeAvg?: number;
};
type PricesResponse = { USD?: number };
