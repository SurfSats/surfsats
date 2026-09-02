export const SETTLE_MS = 2800;
export const SETTLE_HOLD_MS = 400;
export const SETTLE_MIN_MS = 2000;
export const SETTLE_MAX_MS = 4000;
export const SETTLE_WAIT_MS = 180;
export const SETTLE_REDUCED_SNAP_MS = 16;

export const SETTLE_TITLES = {
  waiting: "WAITING",
  settling: "SETTLING THE TAB",
  settled: "TAB SETTLED",
} as const;

export type SettlePhase = keyof typeof SETTLE_TITLES;

export type SettleFrame = {
  phase: SettlePhase;
  title: (typeof SETTLE_TITLES)[SettlePhase];
  progress: number;
  done: boolean;
};

export function clampSettleDuration(ms: number) {
  if (ms < SETTLE_MIN_MS) return SETTLE_MIN_MS;
  if (ms > SETTLE_MAX_MS) return SETTLE_MAX_MS;
  return ms;
}

export function settlePhaseAt({
  elapsed,
  duration = SETTLE_MS,
  hold = SETTLE_HOLD_MS,
  reducedMotion = false,
}: {
  elapsed: number;
  duration?: number;
  hold?: number;
  reducedMotion?: boolean;
}): SettleFrame {
  const t = elapsed < 0 ? 0 : elapsed;

  if (reducedMotion) {
    if (t < SETTLE_REDUCED_SNAP_MS) {
      return {
        phase: "waiting",
        title: SETTLE_TITLES.waiting,
        progress: 0,
        done: false,
      };
    }
    return {
      phase: "settled",
      title: SETTLE_TITLES.settled,
      progress: 1,
      done: t >= hold,
    };
  }

  const durationMs = clampSettleDuration(duration);
  if (t < SETTLE_WAIT_MS) {
    return {
      phase: "waiting",
      title: SETTLE_TITLES.waiting,
      progress: 0,
      done: false,
    };
  }
  if (t < durationMs) {
    const span = durationMs - SETTLE_WAIT_MS;
    const progress = span <= 0 ? 1 : Math.min(1, (t - SETTLE_WAIT_MS) / span);
    return {
      phase: "settling",
      title: SETTLE_TITLES.settling,
      progress,
      done: false,
    };
  }
  return {
    phase: "settled",
    title: SETTLE_TITLES.settled,
    progress: 1,
    done: t >= durationMs + hold,
  };
}
