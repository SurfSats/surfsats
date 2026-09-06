export const SETTLE_MS = 2800;
export const SETTLE_HOLD_MS = 400;
export const SETTLE_MIN_MS = 2000;
export const SETTLE_MAX_MS = 4000;
export const SETTLE_SETTLING_AT = 1600;
export const SETTLE_SETTLED_AT = 2200;
export const SETTLE_WAIT_MS = 280;
export const SETTLE_REDUCED_SNAP_MS = 16;

export const SETTLE_TITLES = {
  waiting: "WAITING",
  settling: "SETTLING THE TAB",
  settled: "TAB SETTLED",
} as const;

export type SettlePhase = keyof typeof SETTLE_TITLES;

export type SettleMachine = "arcade" | "tab" | "graffiti" | "story" | "drop";

export const SETTLE_SUBTITLES = {
  arcade: {
    waiting: "scan the sheet · nothing moves yet",
    settling: "invoice paid · credits catching up",
    settled: "21 sats cleared · three credits",
  },
  tab: {
    waiting: "one stool · unpaid",
    settling: "invoice paid · stool is yours",
    settled: "21 sats cleared · door is open",
  },
  graffiti: {
    waiting: "can in hand · wall unpaid",
    settling: "invoice paid · can is live",
    settled: "21 sats cleared · on the wall",
  },
  story: {
    waiting: "one line · not inscribed",
    settling: "invoice paid · line hitting the book",
    settled: "21 sats cleared · inscribed",
  },
  drop: {
    waiting: "21 off the rail · unpaid",
    settling: "invoice paid · 21 leaving the dock",
    settled: "21 sats cleared · dropped",
  },
} as const satisfies Record<SettleMachine, Record<SettlePhase, string>>;

export type SettleFrame = {
  phase: SettlePhase;
  title: (typeof SETTLE_TITLES)[SettlePhase];
  done: boolean;
};

export function clampSettleDuration(ms: number) {
  if (ms < SETTLE_MIN_MS) return SETTLE_MIN_MS;
  if (ms > SETTLE_MAX_MS) return SETTLE_MAX_MS;
  return ms;
}

export function scaledBeat(at: number, duration = SETTLE_MS) {
  return (at / SETTLE_MS) * clampSettleDuration(duration);
}

export function settleCopy({
  machine,
  phase,
}: {
  machine: SettleMachine;
  phase: SettlePhase;
}) {
  return {
    title: SETTLE_TITLES[phase],
    subtitle: SETTLE_SUBTITLES[machine][phase],
  };
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
        done: false,
      };
    }
    return {
      phase: "settled",
      title: SETTLE_TITLES.settled,
      done: t >= hold,
    };
  }

  const durationMs = clampSettleDuration(duration);
  const settlingAt = scaledBeat(SETTLE_SETTLING_AT, durationMs);
  const settledAt = scaledBeat(SETTLE_SETTLED_AT, durationMs);

  if (t < settlingAt) {
    return {
      phase: "waiting",
      title: SETTLE_TITLES.waiting,
      done: false,
    };
  }
  if (t < settledAt) {
    return {
      phase: "settling",
      title: SETTLE_TITLES.settling,
      done: false,
    };
  }
  return {
    phase: "settled",
    title: SETTLE_TITLES.settled,
    done: t >= durationMs + hold,
  };
}
