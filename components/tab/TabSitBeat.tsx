"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate } from "animejs/animation";
import { stagger } from "animejs/utils";
import { TAB_SIT_NARROW_MQ, tabSitMotion } from "@/lib/tab-sit";

function clearNode(node: HTMLElement) {
  node.style.removeProperty("opacity");
  node.style.removeProperty("transform");
  node.style.removeProperty("translate");
}

export function TabSitBeat({
  beat,
  children,
}: {
  beat: number;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (beat <= 0) return;
    const root = rootRef.current;
    if (!root) return;

    const motion = tabSitMotion({
      narrow: window.matchMedia(TAB_SIT_NARROW_MQ).matches,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches,
    });
    if (motion.kind === "instant") return;

    const travel = [...root.querySelectorAll<HTMLElement>("[data-tab-sit]")];
    const fade = [...root.querySelectorAll<HTMLElement>("[data-tab-sit-fade]")];
    const all = [...travel, ...fade];
    if (!all.length) return;

    if (travel.length) {
      animate(travel, {
        opacity: [motion.opacity[0], motion.opacity[1]],
        ...(motion.y === 0 ? {} : { translateY: [motion.y, 0] }),
        duration: motion.duration,
        ease: motion.ease,
        delay: stagger(motion.stagger),
        loop: false,
        composition: "replace",
        onComplete: () => {
          for (const node of travel) clearNode(node);
        },
      });
    }
    if (fade.length) {
      animate(fade, {
        opacity: [motion.opacity[0], motion.opacity[1]],
        duration: motion.duration,
        ease: motion.ease,
        delay: stagger(motion.stagger, { start: motion.stagger }),
        loop: false,
        composition: "replace",
        onComplete: () => {
          for (const node of fade) clearNode(node);
        },
      });
    }

    const safety = window.setTimeout(() => {
      for (const node of all) clearNode(node);
    }, motion.duration + motion.stagger * Math.max(all.length, 1) + 80);

    return () => window.clearTimeout(safety);
  }, [beat]);

  return (
    <div ref={rootRef} className="tab-sit-stage">
      {children}
    </div>
  );
}
