export const TICKER_TICK_MS = 220;
export const TICKER_TICK_DIP = 0.35;

export type TickerTickMotion =
  | { kind: "instant" }
  | {
      kind: "flash";
      opacity: readonly [1, 0.35, 1];
      duration: typeof TICKER_TICK_MS;
      loop: false;
    };

export function tickerValueChanged(previous: string | null, next: string) {
  if (previous === null) return false;
  return previous !== next;
}

export function tickerTickMotion({
  reducedMotion,
}: {
  reducedMotion: boolean;
}): TickerTickMotion {
  if (reducedMotion) return { kind: "instant" };
  return {
    kind: "flash",
    opacity: [1, TICKER_TICK_DIP, 1],
    duration: TICKER_TICK_MS,
    loop: false,
  };
}
