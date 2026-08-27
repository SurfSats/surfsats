const TREASURY_URL =
  "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page[size]=8&fields=record_date,tot_pub_debt_out_amt,debt_held_public_amt,intragov_hold_amt";

export const FIAT_CACHE_MS = 10 * 60 * 1000;
export const BTC_HARD_CAP = 21_000_000;
const MS_DAY = 86_400_000;

export type FiatDebtSnapshot = {
  totPubDebtOutAmt: number;
  recordDate: string;
  dollarsPerSecond: number;
  fetchedAt: number;
};

type TreasuryRow = {
  record_date: string;
  tot_pub_debt_out_amt: number;
};

let cache: { at: number; snapshot: FiatDebtSnapshot } | null = null;

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/,/g, "").trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseRows(payload: unknown): TreasuryRow[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  const rows: TreasuryRow[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const recordDate =
      typeof record.record_date === "string" ? record.record_date.trim() : "";
    const total = asNumber(record.tot_pub_debt_out_amt);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(recordDate) || total === null) continue;
    rows.push({ record_date: recordDate, tot_pub_debt_out_amt: total });
  }

  rows.sort((a, b) => (a.record_date < b.record_date ? 1 : a.record_date > b.record_date ? -1 : 0));
  return rows;
}

function utcDay(value: string) {
  return Date.parse(`${value}T00:00:00Z`);
}

export function dollarsPerSecondFromRows(rows: TreasuryRow[]) {
  const daily: number[] = [];

  for (let i = 0; i < rows.length - 1; i += 1) {
    const newer = rows[i];
    const older = rows[i + 1];
    const newerMs = utcDay(newer.record_date);
    const olderMs = utcDay(older.record_date);
    if (!Number.isFinite(newerMs) || !Number.isFinite(olderMs)) continue;

    const days = (newerMs - olderMs) / MS_DAY;
    if (days < 0.5 || days > 1.5) continue;

    const delta = newer.tot_pub_debt_out_amt - older.tot_pub_debt_out_amt;
    if (Math.abs(delta) < 1) continue;
    daily.push(delta / days);
  }

  if (daily.length) {
    const mean = daily.reduce((sum, n) => sum + n, 0) / daily.length;
    return mean / 86_400;
  }

  if (rows.length >= 2) {
    const newest = rows[0];
    const oldest = rows[rows.length - 1];
    const elapsedSec = (utcDay(newest.record_date) - utcDay(oldest.record_date)) / 1000;
    if (elapsedSec > 0) {
      const delta = newest.tot_pub_debt_out_amt - oldest.tot_pub_debt_out_amt;
      if (Math.abs(delta) >= 1) return delta / elapsedSec;
    }
  }

  return 0;
}

export async function getFiatDebt(): Promise<FiatDebtSnapshot | null> {
  if (cache && Date.now() - cache.at < FIAT_CACHE_MS) {
    return cache.snapshot;
  }

  try {
    const response = await fetch(TREASURY_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return cache?.snapshot ?? null;

    const rows = parseRows(await response.json());
    const latest = rows[0];
    if (!latest) return cache?.snapshot ?? null;

    const snapshot: FiatDebtSnapshot = {
      totPubDebtOutAmt: latest.tot_pub_debt_out_amt,
      recordDate: latest.record_date,
      dollarsPerSecond: dollarsPerSecondFromRows(rows),
      fetchedAt: Date.now(),
    };
    cache = { at: Date.now(), snapshot };
    return snapshot;
  } catch {
    return cache?.snapshot ?? null;
  }
}

export function formatDebtUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.floor(value)));
}

export function formatPrinterSpeed(value: number) {
  const n = Math.max(0, value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n >= 10 ? 0 : 2,
    minimumFractionDigits: n >= 10 ? 0 : 2,
  }).format(n);
}

export function formatCapUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value)));
}

export function formatHardCap(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    value,
  );
}
