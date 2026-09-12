"use client";

import {
  createElement,
  useEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { animate } from "animejs/animation";
import { HUD_WAKE_NARROW_MQ, hudWakeMotion } from "@/lib/hud-wake";

function settle(node: HTMLElement) {
  node.classList.add("is-in");
  node.style.removeProperty("opacity");
  node.style.removeProperty("transform");
  node.style.removeProperty("translate");
}

export function HudWake({
  as: Tag = "div",
  className,
  children,
  ...rest
}: {
  as?: "div" | "header" | "nav";
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const motion = hudWakeMotion({
      narrow: window.matchMedia(HUD_WAKE_NARROW_MQ).matches,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches,
    });

    if (motion.kind === "instant") {
      settle(root);
      return;
    }

    let tween: ReturnType<typeof animate> | null = null;
    let woke = false;

    const play = () => {
      if (woke) return;
      woke = true;
      io.disconnect();
      tween = animate(root, {
        opacity: [motion.opacity[0], motion.opacity[1]],
        ...(motion.y === 0 ? {} : { translateY: [motion.y, 0] }),
        duration: motion.duration,
        ease: motion.ease,
        loop: false,
        composition: "replace",
        onComplete: () => settle(root),
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) play();
      },
      { threshold: 0.08 },
    );
    io.observe(root);

    const safety = window.setTimeout(() => {
      play();
      settle(root);
    }, motion.duration + 1200);

    return () => {
      io.disconnect();
      window.clearTimeout(safety);
      tween?.cancel();
    };
  }, []);

  return createElement(
    Tag,
    { ...rest, ref, className, "data-hud-wake": "" },
    children,
  );
}
