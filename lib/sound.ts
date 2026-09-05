export const MECHANICAL_LATCH = {
  durationSec: 0.04,
  startHz: 140,
  endHz: 30,
  startGain: 0.7,
  endGain: 0.01,
  closeDelayMs: 100,
  type: "square" as const,
};

export type LatchOscillator = {
  type: string;
  frequency: {
    setValueAtTime: (value: number, time: number) => void;
    exponentialRampToValueAtTime: (value: number, time: number) => void;
  };
  connect: (node: unknown) => void;
  start: (when?: number) => void;
  stop: (when?: number) => void;
};

export type LatchGain = {
  gain: {
    setValueAtTime: (value: number, time: number) => void;
    exponentialRampToValueAtTime: (value: number, time: number) => void;
  };
  connect: (node: unknown) => void;
};

export type LatchAudioContext = {
  currentTime: number;
  destination: unknown;
  createOscillator: () => LatchOscillator;
  createGain: () => LatchGain;
  close?: () => Promise<void> | void;
};

const LATCH_DEBOUNCE_MS = 80;
let lastLatchAt = 0;

export function scheduleMechanicalLatch({
  ctx,
}: {
  ctx: LatchAudioContext;
}): LatchOscillator {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  const end = now + MECHANICAL_LATCH.durationSec;

  osc.type = MECHANICAL_LATCH.type;
  osc.frequency.setValueAtTime(MECHANICAL_LATCH.startHz, now);
  osc.frequency.exponentialRampToValueAtTime(MECHANICAL_LATCH.endHz, end);

  gain.gain.setValueAtTime(MECHANICAL_LATCH.startGain, now);
  gain.gain.exponentialRampToValueAtTime(MECHANICAL_LATCH.endGain, end);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(end);
  return osc;
}

function audioContextCtor(): (new () => AudioContext) | undefined {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext ?? window.webkitAudioContext;
}

function latchMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("surfsats-sfx-muted") === "1";
  } catch {
    return false;
  }
}

export const playMechanicalLatch = (): void => {
  if (typeof window === "undefined") return;
  if (latchMuted()) return;

  const now = Date.now();
  if (now - lastLatchAt < LATCH_DEBOUNCE_MS) return;
  lastLatchAt = now;

  const Ctor = audioContextCtor();
  if (!Ctor) return;

  try {
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    scheduleMechanicalLatch({
      ctx: {
        currentTime: ctx.currentTime,
        destination: ctx.destination,
        createOscillator: () => ({
          get type() {
            return osc.type;
          },
          set type(value) {
            if (value === "square") osc.type = "square";
          },
          frequency: osc.frequency,
          connect: () => {
            osc.connect(gain);
          },
          start: () => osc.start(),
          stop: (when) => osc.stop(when),
        }),
        createGain: () => ({
          gain: gain.gain,
          connect: () => {
            gain.connect(ctx.destination);
          },
        }),
      },
    });
    window.setTimeout(() => {
      void ctx.close();
    }, MECHANICAL_LATCH.closeDelayMs);
  } catch {
    lastLatchAt = 0;
  }
};

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
