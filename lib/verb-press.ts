export const VERB_PRESS_SCALE = 0.97;
export const VERB_PRESS_MS = 80;
export const VERB_PRESS_EASE = "outCubic";

export const verbPressProps = {
  "data-verb-press": "",
} as const;

export type VerbPressMotion =
  | { kind: "instant" }
  | {
      kind: "press";
      scale: typeof VERB_PRESS_SCALE;
      duration: typeof VERB_PRESS_MS;
      ease: typeof VERB_PRESS_EASE;
      loop: false;
    };

export function verbPressMotion({
  reducedMotion,
}: {
  reducedMotion: boolean;
}): VerbPressMotion {
  if (reducedMotion) return { kind: "instant" };
  return {
    kind: "press",
    scale: VERB_PRESS_SCALE,
    duration: VERB_PRESS_MS,
    ease: VERB_PRESS_EASE,
    loop: false,
  };
}
