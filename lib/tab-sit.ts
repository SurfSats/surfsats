export const TAB_SIT_MS = 520;
export const TAB_SIT_Y = 10;
export const TAB_SIT_STAGGER_MS = 50;
export const TAB_SIT_EASE = "outCubic";
export const TAB_SIT_NARROW_MQ = "(max-width: 767px)";

export type TabSitMotion =
  | { kind: "instant" }
  | {
      kind: "sit";
      opacity: readonly [0.55, 1];
      y: 0 | typeof TAB_SIT_Y;
      duration: typeof TAB_SIT_MS;
      stagger: typeof TAB_SIT_STAGGER_MS;
      ease: typeof TAB_SIT_EASE;
      loop: false;
    };

export function tabSitMotion({
  narrow,
  reducedMotion,
}: {
  narrow: boolean;
  reducedMotion: boolean;
}): TabSitMotion {
  if (reducedMotion) return { kind: "instant" };
  return {
    kind: "sit",
    opacity: [0.55, 1],
    y: narrow ? 0 : TAB_SIT_Y,
    duration: TAB_SIT_MS,
    stagger: TAB_SIT_STAGGER_MS,
    ease: TAB_SIT_EASE,
    loop: false,
  };
}
