export const TAG_WRITE_ON_MS = 560;
export const TAG_WRITE_ON_FROM = "inset(0 100% 0 0)";
export const TAG_WRITE_ON_TO = "inset(0 0% 0 0)";
export const TAG_WRITE_ON_EASE = "outCubic";

export type TagWriteOnMotion =
  | { kind: "instant" }
  | {
      kind: "clip";
      clipPath: readonly [typeof TAG_WRITE_ON_FROM, typeof TAG_WRITE_ON_TO];
      duration: typeof TAG_WRITE_ON_MS;
      ease: typeof TAG_WRITE_ON_EASE;
      loop: false;
    };

export function shouldWriteOnTag({
  markId,
  freshId,
}: {
  markId: string;
  freshId: string | null | undefined;
}) {
  return Boolean(freshId) && freshId === markId;
}

export function tagWriteOnMotion({
  reducedMotion,
}: {
  reducedMotion: boolean;
}): TagWriteOnMotion {
  if (reducedMotion) return { kind: "instant" };
  return {
    kind: "clip",
    clipPath: [TAG_WRITE_ON_FROM, TAG_WRITE_ON_TO],
    duration: TAG_WRITE_ON_MS,
    ease: TAG_WRITE_ON_EASE,
    loop: false,
  };
}
