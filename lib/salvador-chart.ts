export const STACK_WINDOW_SEC = 30 * 24 * 60 * 60;
const FLAT_PAD_SATS = 100_000_000;

export const STACK_CHART = {
  width: 640,
  height: 232,
  padX: 8,
  padY: 16,
} as const;

export type BalanceStep = {
  time: number;
  balanceSats: number;
  txid: string | null;
  deltaSats: number | null;
};

type TimedMove = {
  txid: string;
  confirmed: boolean;
  time: number | null;
  netSats: number;
};

export function windowBalance(txs: readonly TimedMove[], nowSec: number): BalanceStep[] | null {
  const confirmed = txs.filter((tx) => tx.confirmed);
  if (confirmed.some((tx) => tx.time === null)) return null;

  const ordered = [...confirmed].sort((a, b) => {
    const at = a.time ?? 0;
    const bt = b.time ?? 0;
    if (at !== bt) return at - bt;
    if (a.txid < b.txid) return -1;
    if (a.txid > b.txid) return 1;
    return 0;
  });

  const start = nowSec - STACK_WINDOW_SEC;
  let balanceSats = 0;
  let open = 0;
  const inside: BalanceStep[] = [];

  for (const tx of ordered) {
    if (tx.time === null) return null;
    balanceSats += tx.netSats;
    if (tx.time < start) {
      open = balanceSats;
      continue;
    }
    if (tx.netSats === 0) continue;
    inside.push({
      time: tx.time,
      balanceSats,
      txid: tx.txid,
      deltaSats: tx.netSats,
    });
  }

  const steps: BalanceStep[] = [
    { time: start, balanceSats: open, txid: null, deltaSats: null },
    ...inside,
  ];
  const last = steps[steps.length - 1];
  const right = Math.max(nowSec, last ? last.time : nowSec);
  if (!last || last.time < right || last.balanceSats !== balanceSats) {
    steps.push({ time: right, balanceSats, txid: null, deltaSats: null });
  }
  return steps;
}

export type StackMark = { x: number; y: number };

export function stackChartMarks(steps: readonly { time: number; balanceSats: number }[]) {
  if (steps.length === 0) return null;
  let yMin = steps[0].balanceSats;
  let yMax = yMin;
  for (const step of steps) {
    if (step.balanceSats < yMin) yMin = step.balanceSats;
    if (step.balanceSats > yMax) yMax = step.balanceSats;
  }
  if (yMax === yMin) {
    yMin -= FLAT_PAD_SATS;
    yMax += FLAT_PAD_SATS;
  }

  const { width, height, padX, padY } = STACK_CHART;
  const t0 = steps[0].time;
  const t1 = steps[steps.length - 1].time;
  const dt = t1 - t0 || 1;
  const ySpan = yMax - yMin;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const marks: StackMark[] = steps.map((step) => ({
    x: padX + ((step.time - t0) / dt) * innerW,
    y: padY + ((yMax - step.balanceSats) / ySpan) * innerH,
  }));
  return { marks, yMin, yMax, innerH };
}

export function stackChartPaths(marks: readonly StackMark[]) {
  const first = marks[0];
  if (!first) return null;
  let line = `M${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
  for (let index = 1; index < marks.length; index += 1) {
    const mark = marks[index];
    line += ` H${mark.x.toFixed(2)} V${mark.y.toFixed(2)}`;
  }
  const last = marks[marks.length - 1] ?? first;
  const base = STACK_CHART.height - STACK_CHART.padY;
  const fill = `${line} L${last.x.toFixed(2)} ${base.toFixed(2)} L${first.x.toFixed(2)} ${base.toFixed(2)} Z`;
  return { line, fill };
}

export function stepAtX(
  steps: readonly { txid: string | null }[],
  marks: readonly StackMark[],
  x: number,
) {
  let found: number | null = null;
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const mark = marks[index];
    if (!step?.txid || !mark) continue;
    if (mark.x <= x + 0.01) found = index;
  }
  return found;
}
