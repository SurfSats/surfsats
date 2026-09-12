"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs/animation";
import { formatCredits } from "@/lib/arcade";
import { creditTickMotion } from "@/lib/credit-tick";

export function CreditLed({ credits }: { credits: number }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const prev = useRef<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const from = prev.current;
    prev.current = credits;
    const shown = formatCredits(credits);

    if (from === null || from === credits) {
      node.textContent = shown;
      return;
    }

    const motion = creditTickMotion({
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches,
    });
    if (motion.kind === "instant") {
      node.textContent = shown;
      return;
    }

    const state = { n: from };
    animate(state, {
      n: credits,
      duration: motion.duration,
      ease: motion.ease,
      loop: false,
      onUpdate: () => {
        node.textContent = formatCredits(Math.round(state.n));
      },
      onComplete: () => {
        node.textContent = shown;
      },
    });
  }, [credits]);

  return (
    <p ref={ref} className="cab-led-num" data-credit-led="">
      {formatCredits(credits)}
    </p>
  );
}
