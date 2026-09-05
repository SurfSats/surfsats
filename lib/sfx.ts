export const SFX_MUTE_KEY = "surfsats-sfx-muted";
export const SFX_EVENT = "surfsats-sfx";

export type SfxStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function defaultStorage(): SfxStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isSfxMuted(storage: SfxStorage | null = defaultStorage()) {
  if (!storage) return false;
  return storage.getItem(SFX_MUTE_KEY) === "1";
}

export function setSfxMuted(
  muted: boolean,
  storage: SfxStorage | null = defaultStorage(),
) {
  if (!storage) return;
  storage.setItem(SFX_MUTE_KEY, muted ? "1" : "0");
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(SFX_EVENT, { detail: { muted } }),
    );
  }
}

export function playSettleChime() {
  if (typeof window === "undefined") return;
  if (isSfxMuted()) return;
  const AudioCtx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.12, now);
  master.connect(ctx.destination);

  function blip(freq: number, start: number, dur: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.9, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  blip(880, now, 0.07);
  blip(1174, now + 0.07, 0.08);
  blip(1568, now + 0.14, 0.16);

  window.setTimeout(() => {
    void ctx.close();
  }, 500);
}
