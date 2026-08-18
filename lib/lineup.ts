const MEMPOOL = "https://mempool.space/api";

// Atmosphere dots only — never one sprite per mempool tx.
// Interactive surfers come from /mempool/recent and accumulate in the client.
// Later: wss://mempool.space/api/v1/ws
// { action: "want", data: ["blocks", "mempool-blocks", "stats"] }
const MAX_GHOSTS = 36;
const MAX_SETS = 5;
const MAX_LIVE_TX = 36;

export type LineupSet = {
  index: number;
  nTx: number;
  medianFee: number;
  minFee: number;
  maxFee: number;
};

export type LineupSurfer = {
  id: string;
  txid: string | null;
  fee: number;
  feeRate: number;
  vsize: number | null;
  value: number | null;
  firstSeen: number | null;
  setIndex: number;
  seed: number;
  interactive: boolean;
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
  ghosts: LineupSurfer[];
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
  ghosts: [],
};

export async function getLineupSnapshot(): Promise<LineupSnapshot> {
  const [mempool, projected, fees, tip, blocks, recent] = await Promise.all([
    readJson<MempoolResponse>(`${MEMPOOL}/mempool`),
    readJson<ProjectedBlock[]>(`${MEMPOOL}/v1/fees/mempool-blocks`),
    readJson<FeesResponse>(`${MEMPOOL}/v1/fees/recommended`),
    readText(`${MEMPOOL}/blocks/tip/height`),
    readJson<BlockSummary[]>(`${MEMPOOL}/v1/blocks`),
    readJson<RecentTx[]>(`${MEMPOOL}/mempool/recent`),
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
  const surfers = await hydrateRecent(recent ?? [], sets);

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
    surfers,
    ghosts: sampleGhosts(sets),
  };
}

export function mergeLineupSurfers(
  current: LineupSurfer[],
  incoming: LineupSurfer[],
  sets: LineupSet[],
) {
  const map = new Map<string, LineupSurfer>();
  for (const surfer of current) {
    if (surfer.txid) map.set(surfer.txid, surfer);
  }
  for (const surfer of incoming) {
    if (!surfer.txid) continue;
    const prior = map.get(surfer.txid);
    map.set(surfer.txid, {
      ...surfer,
      firstSeen: surfer.firstSeen ?? prior?.firstSeen ?? null,
    });
  }

  return [...map.values()]
    .map((surfer) => ({
      ...surfer,
      setIndex: setIndexForFee(surfer.feeRate, sets),
    }))
    .sort((a, b) => b.feeRate - a.feeRate)
    .slice(0, MAX_LIVE_TX);
}

export function hasLineupData(snapshot: LineupSnapshot) {
  return snapshot.sets.length > 0 || snapshot.mempoolCount !== null;
}

export function formatVsize(vsize: number) {
  if (vsize >= 1_000_000) return `${(vsize / 1_000_000).toFixed(1)} MvB`;
  if (vsize >= 1000) return `${(vsize / 1000).toFixed(0)} kvB`;
  return `${Math.round(vsize)} vB`;
}

export function formatBtc(sats: number) {
  return `${(sats / 100_000_000).toFixed(sats >= 100_000_000 ? 2 : 4)} BTC`;
}

export function shortTxid(txid: string) {
  return `${txid.slice(0, 8)}…${txid.slice(-8)}`;
}

export function mempoolUrl(txid: string) {
  return `https://mempool.space/tx/${txid}`;
}

async function hydrateRecent(recent: RecentTx[], sets: LineupSet[]) {
  const surfers = recent.flatMap((tx) => {
    const vsize = num(tx.vsize);
    const fee = num(tx.fee);
    if (!tx.txid || fee === null || !vsize) return [];
    const feeRate = fee / vsize;
    const surfer: LineupSurfer = {
      id: tx.txid,
      txid: tx.txid,
      fee,
      feeRate,
      vsize,
      value: num(tx.value),
      firstSeen: null,
      setIndex: setIndexForFee(feeRate, sets),
      seed: hash01(tx.txid),
      interactive: true,
    };
    return [surfer];
  });

  const times = await readTimes(surfers.map((surfer) => surfer.txid).filter(Boolean) as string[]);
  return surfers.map((surfer, index) => ({
    ...surfer,
    firstSeen: times[index] ?? null,
  }));
}

async function readTimes(txids: string[]) {
  if (txids.length === 0) return [];
  const query = txids.map((id) => `txId[]=${encodeURIComponent(id)}`).join("&");
  const times = await readJson<number[]>(`${MEMPOOL}/v1/transaction-times?${query}`);
  return Array.isArray(times) ? times : [];
}

function sampleGhosts(sets: LineupSet[]): LineupSurfer[] {
  if (sets.length === 0) return [];

  const weights = sets.map((set) => Math.max(1, Math.sqrt(set.nTx)));
  const sum = weights.reduce((total, weight) => total + weight, 0);
  const ghosts: LineupSurfer[] = [];

  sets.forEach((set, index) => {
    const count = Math.max(
      2,
      Math.min(10, Math.round((weights[index] / sum) * MAX_GHOSTS)),
    );

    for (let slot = 0; slot < count; slot += 1) {
      const t = count === 1 ? 0.5 : slot / (count - 1);
      const feeRate = set.minFee + t * (set.maxFee - set.minFee);
      const seed = hash01(`ghost:${index}:${slot}:${set.medianFee.toFixed(3)}`);
      ghosts.push({
        id: `ghost-${index}-${slot}`,
        txid: null,
        fee: 0,
        feeRate,
        vsize: null,
        value: null,
        firstSeen: null,
        setIndex: index,
        seed,
        interactive: false,
      });
    }
  });

  return ghosts.slice(0, MAX_GHOSTS);
}

function setIndexForFee(feeRate: number, sets: LineupSet[]) {
  for (const set of sets) {
    if (feeRate >= set.minFee) return set.index;
  }
  return Math.max(sets.length - 1, 0);
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
type RecentTx = {
  txid?: string;
  fee?: number;
  vsize?: number;
  value?: number;
};
