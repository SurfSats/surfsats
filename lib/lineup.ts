const MEMPOOL = "https://mempool.space/api";

// Sampled bodies only — never one sprite per mempool tx.
// Later: wss://mempool.space/api/v1/ws
// { action: "want", data: ["blocks", "mempool-blocks", "stats"] }
const MAX_SURFERS = 48;
const MAX_SETS = 5;

export type LineupSet = {
  index: number;
  nTx: number;
  medianFee: number;
  minFee: number;
  maxFee: number;
};

export type LineupSurfer = {
  id: string;
  fee: number;
  setIndex: number;
  seed: number;
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
  sets: LineupSet[];
  surfers: LineupSurfer[];
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
  sets: [],
  surfers: [],
};

export async function getLineupSnapshot(): Promise<LineupSnapshot> {
  const [mempool, projected, fees, tip, blocks] = await Promise.all([
    readJson<MempoolResponse>(`${MEMPOOL}/mempool`),
    readJson<ProjectedBlock[]>(`${MEMPOOL}/v1/fees/mempool-blocks`),
    readJson<FeesResponse>(`${MEMPOOL}/v1/fees/recommended`),
    readText(`${MEMPOOL}/blocks/tip/height`),
    readJson<BlockSummary[]>(`${MEMPOOL}/v1/blocks`),
  ]);

  const sets = (projected ?? []).slice(0, MAX_SETS).map((block, index) => {
    const range = block.feeRange ?? [];
    const minFee = num(range[0]) ?? num(block.medianFee) ?? 1;
    const maxFee =
      num(range[Math.max(0, range.length - 2)]) ??
      num(range[range.length - 1]) ??
      minFee;
    return {
      index,
      nTx: num(block.nTx) ?? 0,
      medianFee: num(block.medianFee) ?? minFee,
      minFee,
      maxFee: Math.max(maxFee, minFee),
    };
  });

  const fastestFee = num(fees?.fastestFee);

  return {
    fetchedAt: Date.now(),
    blockHeight: parseHeight(tip) ?? num(blocks?.[0]?.height),
    lastBlockTimestamp: num(blocks?.[0]?.timestamp),
    mempoolCount: num(mempool?.count),
    mempoolVsize: num(mempool?.vsize),
    fastestFee,
    hourFee: num(fees?.hourFee),
    feeLabel: feeEnvironment(fastestFee),
    sets,
    surfers: sampleSurfers(sets),
  };
}

export function hasLineupData(snapshot: LineupSnapshot) {
  return snapshot.sets.length > 0 || snapshot.mempoolCount !== null;
}

export function formatVsize(vsize: number) {
  if (vsize >= 1_000_000) return `${(vsize / 1_000_000).toFixed(1)} MvB`;
  if (vsize >= 1000) return `${(vsize / 1000).toFixed(0)} kvB`;
  return `${Math.round(vsize)} vB`;
}

function sampleSurfers(sets: LineupSet[]): LineupSurfer[] {
  if (sets.length === 0) return [];

  const weights = sets.map((set) => Math.max(1, Math.sqrt(set.nTx)));
  const sum = weights.reduce((total, weight) => total + weight, 0);
  const surfers: LineupSurfer[] = [];

  sets.forEach((set, index) => {
    const count = Math.max(
      3,
      Math.min(14, Math.round((weights[index] / sum) * MAX_SURFERS)),
    );

    for (let slot = 0; slot < count; slot += 1) {
      const t = count === 1 ? 0.5 : slot / (count - 1);
      const fee = set.minFee + t * (set.maxFee - set.minFee);
      const seed = hash01(`${index}:${slot}:${set.medianFee.toFixed(3)}`);
      surfers.push({
        id: `${index}-${slot}`,
        fee,
        setIndex: index,
        seed,
      });
    }
  });

  return surfers.slice(0, MAX_SURFERS);
}

function feeEnvironment(fastest: number | null) {
  if (fastest === null) return null;
  if (fastest <= 2) return "flat · cheap";
  if (fastest <= 8) return "calm";
  if (fastest <= 25) return "building";
  if (fastest <= 60) return "heavy";
  return "storm";
}

function hash01(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
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

type MempoolResponse = { count?: number; vsize?: number };
type ProjectedBlock = {
  nTx?: number;
  medianFee?: number;
  feeRange?: number[];
};
type FeesResponse = { fastestFee?: number; hourFee?: number };
type BlockSummary = { height?: number; timestamp?: number };
