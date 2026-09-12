export const FLOOR_ENTER_MS = 420;
export const FLOOR_ENTER_STAGGER_MS = 60;
export const FLOOR_ENTER_STAGGER_NARROW_MS = 36;
export const FLOOR_ENTER_Y = 12;
export const FLOOR_ENTER_EASE = "outCubic";
export const FLOOR_ENTER_NARROW_MQ = "(max-width: 767px)";

export type FloorEnterMotion =
  | { kind: "instant" }
  | {
      kind: "tween";
      opacity: readonly [0, 1];
      y: 0 | typeof FLOOR_ENTER_Y;
      duration: typeof FLOOR_ENTER_MS;
      stagger: typeof FLOOR_ENTER_STAGGER_MS | typeof FLOOR_ENTER_STAGGER_NARROW_MS;
      ease: typeof FLOOR_ENTER_EASE;
      loop: false;
    };

export function floorEnterMotion({
  narrow,
  reducedMotion,
}: {
  narrow: boolean;
  reducedMotion: boolean;
}): FloorEnterMotion {
  if (reducedMotion) return { kind: "instant" };
  return {
    kind: "tween",
    opacity: [0, 1],
    y: narrow ? 0 : FLOOR_ENTER_Y,
    duration: FLOOR_ENTER_MS,
    stagger: narrow ? FLOOR_ENTER_STAGGER_NARROW_MS : FLOOR_ENTER_STAGGER_MS,
    ease: FLOOR_ENTER_EASE,
    loop: false,
  };
}
