export const DECK_WIPE_MS = 200;
export const DECK_WIPE_X = 12;
export const DECK_WIPE_EASE = "outCubic";
export const DECK_WIPE_NARROW_MQ = "(max-width: 767px)";

export type DeckWipeMotion =
  | { kind: "instant" }
  | {
      kind: "wipe";
      opacity: readonly [0, 1];
      x: 0 | typeof DECK_WIPE_X;
      duration: typeof DECK_WIPE_MS;
      ease: typeof DECK_WIPE_EASE;
      loop: false;
    };

export function deckWipeMotion({
  narrow,
  reducedMotion,
}: {
  narrow: boolean;
  reducedMotion: boolean;
}): DeckWipeMotion {
  if (reducedMotion) return { kind: "instant" };
  return {
    kind: "wipe",
    opacity: [0, 1],
    x: narrow ? 0 : DECK_WIPE_X,
    duration: DECK_WIPE_MS,
    ease: DECK_WIPE_EASE,
    loop: false,
  };
}
