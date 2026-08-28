const MEMPOOL = "https://mempool.space/api";

export const BLOCK_CAPACITY_VSIZE = 1_500_000;
const TYPICAL_VSIZE = 220;

export type FeeBand = {
  id: string;
  label: string;
  min: number;
  max: number | null;
  count: number;
  vsize: number;
};

export type ProjectedBlock = {
  blockVSize: number;
  nTx: number;
  medianFee: number;
  totalFees: number;
};

export type LineupSnapshot = {
  fetchedAt: number;
  blockHeight: number | null;
  lastBlockTimestamp: number | null;
  mempoolCount: number | null;
  mempoolVsize: number | null;
  fastestFee: number | null;
  halfHourFee: number | null;
  hourFee: number | null;
  economyFee: number | null;
  nextBlockVsize: number | null;
  nextBlockNtx: number | null;
  nextBlockMedianFee: number | null;
  capacityVsize: number;
  projected: ProjectedBlock[];
  bands: FeeBand[];
};

export const emptyLineup: LineupSnapshot = {
  fetchedAt: 0,
  blockHeight: null,
  lastBlockTimestamp: null,
  mempoolCount: null,
  mempoolVsize: null,
  fastestFee: null,
  halfHourFee: null,
  hourFee: null,
  economyFee: null,
  nextBlockVsize: null,
  nextBlockNtx: null,
  nextBlockMedianFee: null,
  capacityVsize: BLOCK_CAPACITY_VSIZE,
  projected: [],
  bands: [],
};

export const FEE_BANDS: Array<{
  id: string;
  label: string;
  min: number;
  max: number | null;
}> = [
  { id: "0-5", label: "0–5", min: 0, max: 5 },
  { id: "5-10", label: "5–10", min: 5, max: 10 },
  { id: "10-20", label: "10–20", min: 10, max: 20 },
  { id: "20-50", label: "20–50", min: 20, max: 50 },
  { id: "50-100", label: "50–100", min: 50, max: 100 },
  { id: "100-200", label: "100–200", min: 100, max: 200 },
  { id: "200-500", label: "200–500", min: 200, max: 500 },
  { id: "500+", label: "500+", min: 500, max: null },
];

export async function getLineupSnapshot(): Promise<LineupSnapshot> {
  const [mempool, projectedRaw, fees, tip, blocks] = await Promise.all([
    readJson<MempoolResponse>(`${MEMPOOL}/mempool`),
    readJson<ProjectedBlockRaw[]>(`${MEMPOOL}/v1/fees/mempool-blocks`),
    readJson<FeesResponse>(`${MEMPOOL}/v1/fees/recommended`),
    readText(`${MEMPOOL}/blocks/tip/height`),
    readJson<BlockSummary[]>(`${MEMPOOL}/v1/blocks`),
  ]);

  const projected = (projectedRaw ?? []).slice(0, 5).flatMap((block) => {
    const blockVSize = num(block.blockVSize);
    const nTx = num(block.nTx);
    const medianFee = num(block.medianFee);
    const totalFees = num(block.totalFees);
    if (blockVSize === null || nTx === null || medianFee === null) return [];
    return [
      {
        blockVSize,
        nTx,
        medianFee,
        totalFees: totalFees ?? 0,
      },
    ];
  });

  const next = projected[0];

  return {
    fetchedAt: Date.now(),
    blockHeight: parseHeight(tip) ?? num(blocks?.[0]?.height),
    lastBlockTimestamp: num(blocks?.[0]?.timestamp),
    mempoolCount: num(mempool?.count),
    mempoolVsize: num(mempool?.vsize),
    fastestFee: num(fees?.fastestFee),
    halfHourFee: num(fees?.halfHourFee),
    hourFee: num(fees?.hourFee),
    economyFee: num(fees?.economyFee),
    nextBlockVsize: next?.blockVSize ?? null,
    nextBlockNtx: next?.nTx ?? null,
    nextBlockMedianFee: next?.medianFee ?? null,
    capacityVsize: BLOCK_CAPACITY_VSIZE,
    projected,
    bands: buildBands(mempool?.fee_histogram ?? [], projected),
  };
}

export function hasLineupData(snapshot: LineupSnapshot) {
  return snapshot.mempoolCount !== null || snapshot.bands.some((band) => band.vsize > 0);
}

export function formatVmb(vsize: number) {
  return (vsize / 1_000_000).toFixed(2);
}

export function feeBandColor(min: number) {
  if (min >= 100) return "#F7931A";
  if (min >= 20) return "#c47d24";
  if (min >= 5) return "#5d7a78";
  return "#4a5558";
}

export function bandMidRate(band: FeeBand) {
  return band.max === null ? band.min * 1.4 : (band.min + band.max) / 2;
}

function buildBands(
  histogram: Array<[number, number] | number[]>,
  projected: ProjectedBlock[],
): FeeBand[] {
  const bands = FEE_BANDS.map((band) => ({
    ...band,
    count: 0,
    vsize: 0,
  }));

  if (histogram.length > 0) {
    for (const row of histogram) {
      const rate = num(row[0]);
      const vsize = num(row[1]);
      if (rate === null || vsize === null) continue;
      const band = bands.find((item) =>
        item.max === null ? rate >= item.min : rate >= item.min && rate < item.max,
      );
      if (!band) continue;
      band.vsize += vsize;
      band.count += Math.max(1, Math.round(vsize / TYPICAL_VSIZE));
    }
    return bands;
  }

  for (const block of projected) {
    const band = bands.find((item) =>
      item.max === null
        ? block.medianFee >= item.min
        : block.medianFee >= item.min && block.medianFee < item.max,
    );
    if (!band) continue;
    band.count += block.nTx;
    band.vsize += block.blockVSize;
  }
  return bands;
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
      headers: {
        Accept: "application/json",
        "User-Agent": "SurfSatsWell/1.0",
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 12 },
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
      headers: { "User-Agent": "SurfSatsWell/1.0" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 12 },
    });
    if (!response.ok) return null;
    return response.text();
  } catch {
    return null;
  }
}

type MempoolResponse = {
  count?: number;
  vsize?: number;
  fee_histogram?: Array<[number, number] | number[]>;
};
type ProjectedBlockRaw = {
  nTx?: number;
  medianFee?: number;
  blockVSize?: number;
  totalFees?: number;
};
type FeesResponse = {
  fastestFee?: number;
  halfHourFee?: number;
  hourFee?: number;
  economyFee?: number;
};
type BlockSummary = { height?: number; timestamp?: number };
