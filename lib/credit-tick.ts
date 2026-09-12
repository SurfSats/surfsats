export const CREDIT_TICK_MS = 400;
export const INVOICE_FADE_MS = 200;
export const CREDIT_TICK_EASE = "outCubic";

export type CreditTickMotion =
  | { kind: "instant" }
  | {
      kind: "count";
      duration: typeof CREDIT_TICK_MS;
      ease: typeof CREDIT_TICK_EASE;
      loop: false;
    };

export function creditTickMotion({
  reducedMotion,
}: {
  reducedMotion: boolean;
}): CreditTickMotion {
  if (reducedMotion) return { kind: "instant" };
  return {
    kind: "count",
    duration: CREDIT_TICK_MS,
    ease: CREDIT_TICK_EASE,
    loop: false,
  };
}

export function creditAt({
  from,
  to,
  t,
}: {
  from: number;
  to: number;
  t: number;
}) {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.round(from + (to - from) * u);
}
