export const HUD_WAKE_MS = 400;
export const HUD_WAKE_Y = 8;
export const HUD_WAKE_EASE = "outCubic";
export const HUD_WAKE_NARROW_MQ = "(max-width: 767px)";

export type HudWakeMotion =
  | { kind: "instant" }
  | {
      kind: "wake";
      opacity: readonly [0, 1];
      y: 0 | typeof HUD_WAKE_Y;
      duration: typeof HUD_WAKE_MS;
      ease: typeof HUD_WAKE_EASE;
      loop: false;
    };

export function hudWakeMotion({
  narrow,
  reducedMotion,
}: {
  narrow: boolean;
  reducedMotion: boolean;
}): HudWakeMotion {
  if (reducedMotion) return { kind: "instant" };
  return {
    kind: "wake",
    opacity: [0, 1],
    y: narrow ? 0 : HUD_WAKE_Y,
    duration: HUD_WAKE_MS,
    ease: HUD_WAKE_EASE,
    loop: false,
  };
}
