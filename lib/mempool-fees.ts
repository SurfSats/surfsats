export const MEMPOOL_TIP_URL = "https://mempool.space/api/blocks/tip/height";
export const MEMPOOL_FEES_URL = "https://mempool.space/api/v1/fees/recommended";
export const MEMPOOL_POLL_MS = 30_000;

export type MempoolFees = {
  fastestFee: number | null;
  halfHourFee: number | null;
  minimumFee: number | null;
};

export type MempoolTelemetry = MempoolFees & {
  tipHeight: number | null;
};

export const emptyMempoolTelemetry: MempoolTelemetry = {
  tipHeight: null,
  fastestFee: null,
  halfHourFee: null,
  minimumFee: null,
};

function asFee(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
}

export function parseTipHeight(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? Math.floor(parsed) : null;
  }
  return null;
}

export function parseMempoolFees(value: unknown): MempoolFees {
  if (!value || typeof value !== "object") {
    return { fastestFee: null, halfHourFee: null, minimumFee: null };
  }
  const record = value as Record<string, unknown>;
  return {
    fastestFee: asFee(record.fastestFee),
    halfHourFee: asFee(record.halfHourFee),
    minimumFee: asFee(record.minimumFee),
  };
}

export function formatSatVb(sats: number | null) {
  if (sats === null) return "-- SAT/VB";
  return `${sats} SAT/VB`;
}

export function shouldPulseOnTip(prev: number | null, next: number | null) {
  return prev !== null && next !== null && next > prev;
}

export async function fetchMempoolTelemetry(): Promise<MempoolTelemetry> {
  const [tipRes, feeRes] = await Promise.all([
    fetch(MEMPOOL_TIP_URL, { cache: "no-store" }),
    fetch(MEMPOOL_FEES_URL, { cache: "no-store" }),
  ]);
  const tipText = tipRes.ok ? await tipRes.text() : "";
  const feesJson = feeRes.ok ? await feeRes.json() : null;
  return {
    tipHeight: parseTipHeight(tipText),
    ...parseMempoolFees(feesJson),
  };
}
