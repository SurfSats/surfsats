/** One bitcoin, in sats. Moscow Time is this divided by the dollar price. */
export const FIAT_SATS_PER_BTC = 100_000_000;

export const FIAT_CHART = {
  width: 640,
  height: 200,
  padX: 8,
  padY: 14,
} as const;

export type PricePoint = {
  time: number;
  priceUsd: number;
};

export type FiatPriceHistory = {
  fetchedAt: number;
  stale: boolean;
  points: PricePoint[];
};

export type ChartMark = { x: number; y: number };

export function moscowSats(priceUsd: number) {
  return FIAT_SATS_PER_BTC / priceUsd;
}

export function parseCandles(payload: unknown): PricePoint[] | null {
  if (!Array.isArray(payload)) return null;
  const points: PricePoint[] = [];
  for (const row of payload) {
    if (!Array.isArray(row) || row.length < 5) return null;
    const time = row[0];
    const close = row[4];
    if (typeof time !== "number" || !Number.isInteger(time)) return null;
    if (typeof close !== "number" || !Number.isFinite(close) || close <= 0) return null;
    points.push({ time, priceUsd: close });
  }
  if (points.length < 2) return null;
  points.sort((a, b) => a.time - b.time);
  return points;
}

function logMarks(values: readonly number[], times: readonly number[]) {
  let min = values[0] ?? 1;
  let max = min;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (min === max) {
    min /= 2;
    max *= 2;
  }

  const { width, height, padX, padY } = FIAT_CHART;
  const t0 = times[0] ?? 0;
  const t1 = times[times.length - 1] ?? t0;
  const dt = t1 - t0 || 1;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const lo = Math.log(min);
  const span = Math.log(max) - lo || 1;

  return values.map((value, index) => {
    const time = times[index] ?? t0;
    return {
      x: padX + ((time - t0) / dt) * innerW,
      y: padY + (1 - (Math.log(value) - lo) / span) * innerH,
    };
  });
}

export function fiatChartLines(points: readonly PricePoint[]) {
  if (points.length < 2) return null;
  const ordered = [...points].sort((a, b) => a.time - b.time);
  const times = ordered.map((point) => point.time);
  const prices = ordered.map((point) => point.priceUsd);
  if (prices.some((price) => price <= 0)) return null;
  const moscow = prices.map((price) => moscowSats(price));
  return {
    price: logMarks(prices, times),
    moscow: logMarks(moscow, times),
  };
}

export function linePoints(marks: readonly ChartMark[]) {
  return marks.map((mark) => `${mark.x.toFixed(2)},${mark.y.toFixed(2)}`).join(" ");
}
