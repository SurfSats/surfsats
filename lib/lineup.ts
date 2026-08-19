const MEMPOOL = "https://mempool.space/api";

export const BLOCK_CAPACITY_VSIZE = 1_500_000;
const MAX_PACKETS = 150;
const TYPICAL_VSIZE = 220;

export type AssemblyPacket = {
  id: string;
  txid: string | null;
  fee: number;
  feeRate: number;
  vsize: number;
  firstSeen: number | null;
  inTemplate: boolean;
};

export type FeeBand = {
  id: string;
  label: string;
  min: number;
  max: number | null;
  count: number;
  vsize: number;
};

export type LineupSnapshot = {
  fetchedAt: number;
  blockHeight: number | null;
  lastBlockTimestamp: number | null;
  mempoolCount: number | null;
  mempoolVsize: number | null;
  fastestFee: number | null;
  hourFee: number | null;
  feeLabel: string | null;
  nextBlockVsize: number | null;
  nextBlockNtx: number | null;
  nextBlockMedianFee: number | null;
  capacityVsize: number;
  packets: AssemblyPacket[];
  bands: FeeBand[];
};

export const emptyLineup: LineupSnapshot = {
  fetchedAt: 0,
  blockHeight: null,
  lastBlockTimestamp: null,
  mempoolCount: null,
  mempoolVsize: null,
  fastestFee: null,
  hourFee: null,
  feeLabel: null,
  nextBlockVsize: null,
  nextBlockNtx: null,
  nextBlockMedianFee: null,
  capacityVsize: BLOCK_CAPACITY_VSIZE,
  packets: [],
  bands: [],
};

const FEE_BANDS: Array<{ id: string; label: string; min: number; max: number | null }> = [
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
  const [mempool, projected, fees, tip, blocks, recent] = await Promise.all([
    readJson<MempoolResponse>(`${MEMPOOL}/mempool`),
    readJson<ProjectedBlock[]>(`${MEMPOOL}/v1/fees/mempool-blocks`),
    readJson<FeesResponse>(`${MEMPOOL}/v1/fees/recommended`),
    readText(`${MEMPOOL}/blocks/tip/height`),
    readJson<BlockSummary[]>(`${MEMPOOL}/v1/blocks`),
    readJson<RecentTx[]>(`${MEMPOOL}/mempool/recent`),
  ]);

  const next = projected?.[0];
  const nextBlockVsize = num(next?.blockVSize);
  const nextBlockNtx = num(next?.nTx);
  const nextBlockMedianFee = num(next?.medianFee);
  const fastestFee = num(fees?.fastestFee);

  const liveTxs = await hydrateRecent(recent ?? []);
  const histogram = mempool?.fee_histogram ?? [];
  const bands = buildBands(histogram, projected ?? []);
  const packets = assemblePackets(liveTxs, bands, nextBlockVsize);

  return {
    fetchedAt: Date.now(),
    blockHeight: parseHeight(tip) ?? num(blocks?.[0]?.height),
    lastBlockTimestamp: num(blocks?.[0]?.timestamp),
    mempoolCount: num(mempool?.count),
    mempoolVsize: num(mempool?.vsize),
    fastestFee,
    hourFee: num(fees?.hourFee),
    feeLabel: feeEnvironment(fastestFee),
    nextBlockVsize,
    nextBlockNtx,
    nextBlockMedianFee,
    capacityVsize: BLOCK_CAPACITY_VSIZE,
    packets,
    bands,
  };
}

export function hasLineupData(snapshot: LineupSnapshot) {
  return snapshot.packets.length > 0 || snapshot.mempoolCount !== null;
}

export function formatVsize(vsize: number) {
  if (vsize >= 1_000_000) return `${(vsize / 1_000_000).toFixed(2)} vMB`;
  if (vsize >= 1000) return `${(vsize / 1000).toFixed(1)} kvB`;
  return `${Math.round(vsize)} vB`;
}

export function formatVmb(vsize: number) {
  return (vsize / 1_000_000).toFixed(2);
}

export function feeColor(rate: number) {
  if (rate >= 200) return "#3dfff3";
  if (rate >= 50) return "#ff7a18";
  if (rate >= 20) return "#ff9a3c";
  if (rate >= 10) return "#d946ef";
  return "#7c3aed";
}

export function feeBandColor(min: number) {
  return feeColor(min === 0 ? 3 : min);
}

export function shortTxid(txid: string) {
  return `${txid.slice(0, 8)}…${txid.slice(-8)}`;
}

export function mempoolUrl(txid: string) {
  return `https://mempool.space/tx/${txid}`;
}

function assemblePackets(
  live: AssemblyPacket[],
  bands: FeeBand[],
  nextBlockVsize: number | null,
) {
  const sampled: AssemblyPacket[] = [];
  const liveBudget = live.length;
  const remaining = Math.max(24, MAX_PACKETS - liveBudget);
  const totalV = bands.reduce((sum, band) => sum + band.vsize, 0) || 1;

  for (const band of bands) {
    if (sampled.length >= remaining) break;
    const share = band.vsize / totalV;
    const n = Math.max(
      band.vsize > 0 ? 1 : 0,
      Math.round(share * remaining),
    );
    const piece = Math.max(80, band.vsize / Math.max(1, n));
    const mid =
      band.max === null ? band.min * 1.4 : (band.min + band.max) / 2;
    for (let i = 0; i < n && sampled.length < remaining; i += 1) {
      const jitter = ((i * 17) % 11) / 11;
      sampled.push({
        id: `sample-${band.id}-${i}`,
        txid: null,
        fee: Math.round(piece * (mid + jitter)),
        feeRate: Math.max(0.1, mid * (0.92 + jitter * 0.16)),
        vsize: Math.round(piece),
        firstSeen: null,
        inTemplate: false,
      });
    }
  }

  const merged = [...live, ...sampled].sort((a, b) => b.feeRate - a.feeRate);
  const fillTo = nextBlockVsize && nextBlockVsize > 0 ? nextBlockVsize : BLOCK_CAPACITY_VSIZE;
  let acc = 0;
  return merged.map((packet) => {
    const inTemplate = acc < fillTo;
    acc += packet.vsize;
    return { ...packet, inTemplate };
  });
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
    const nTx = num(block.nTx) ?? 0;
    const vsize = num(block.blockVSize) ?? 0;
    const median = num(block.medianFee) ?? 1;
    const band = bands.find((item) =>
      item.max === null ? median >= item.min : median >= item.min && median < item.max,
    );
    if (!band) continue;
    band.count += nTx;
    band.vsize += vsize;
  }
  return bands;
}

async function hydrateRecent(recent: RecentTx[]): Promise<AssemblyPacket[]> {
  const packets = recent.flatMap((tx) => {
    const vsize = num(tx.vsize);
    const fee = num(tx.fee);
    if (!tx.txid || fee === null || !vsize) return [];
    const packet: AssemblyPacket = {
      id: tx.txid,
      txid: tx.txid,
      fee,
      feeRate: fee / vsize,
      vsize,
      firstSeen: null,
      inTemplate: false,
    };
    return [packet];
  });

  const times = await readTimes(
    packets.map((packet) => packet.txid).filter(Boolean) as string[],
  );
  return packets.map((packet, index) => ({
    ...packet,
    firstSeen: times[index] ?? null,
  }));
}

async function readTimes(txids: string[]) {
  if (txids.length === 0) return [];
  const query = txids.map((id) => `txId[]=${encodeURIComponent(id)}`).join("&");
  const times = await readJson<number[]>(
    `${MEMPOOL}/v1/transaction-times?${query}`,
  );
  return Array.isArray(times) ? times : [];
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
      headers: {
        Accept: "application/json",
        "User-Agent": "SurfSatsLineup/1.0",
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
      headers: { "User-Agent": "SurfSatsLineup/1.0" },
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
type ProjectedBlock = {
  nTx?: number;
  medianFee?: number;
  feeRange?: number[];
  blockVSize?: number;
  totalFees?: number;
};
type FeesResponse = { fastestFee?: number; hourFee?: number };
type BlockSummary = { height?: number; timestamp?: number };
type RecentTx = {
  txid?: string;
  fee?: number;
  vsize?: number;
  value?: number;
};
