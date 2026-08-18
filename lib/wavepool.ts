export const WAVE_POOL_GOAL_SATS = 2100;
export const WAVE_POOL_STORAGE_KEY = "surfsats.wavepool.v1";

// Seed level so the pool isn't an empty tank on first visit.
// Raise this as real Lightning payments land, or leave it and let zaps fill.
export const WAVE_POOL_SEED_SATS = 504;

export const WAVE_ZAP_PRESETS = [21, 100, 210] as const;

export type WaveZap = {
  id: string;
  sats: number;
  handle: string;
  at: string;
};

export const seedZaps: WaveZap[] = [
  {
    id: "z-1",
    sats: 21,
    handle: "dawn.patrol",
    at: "2026-08-18T08:12:00.000Z",
  },
  {
    id: "z-2",
    sats: 210,
    handle: "maui.sats",
    at: "2026-08-18T09:40:00.000Z",
  },
  {
    id: "z-3",
    sats: 100,
    handle: "anon",
    at: "2026-08-18T11:05:00.000Z",
  },
  {
    id: "z-4",
    sats: 21,
    handle: "lineup.radio",
    at: "2026-08-18T12:18:00.000Z",
  },
  {
    id: "z-5",
    sats: 152,
    handle: "sats.and.salt",
    at: "2026-08-18T13:02:00.000Z",
  },
];

export function poolProgress(total: number) {
  return Math.min(1, Math.max(0, total / WAVE_POOL_GOAL_SATS));
}

export function remainingSats(total: number) {
  return Math.max(0, WAVE_POOL_GOAL_SATS - total);
}

export function isPoolComplete(total: number) {
  return total >= WAVE_POOL_GOAL_SATS;
}
