"use client";

import { useEffect } from "react";
import { animate } from "animejs/animation";
import { stagger } from "animejs/utils";
import {
  FLOOR_ENTER_NARROW_MQ,
  floorEnterMotion,
} from "@/lib/floor-enter";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isNarrow() {
  return window.matchMedia(FLOOR_ENTER_NARROW_MQ).matches;
}

export function FloorEntrance() {
  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>("[data-floor-enter]");
    if (!items.length) return;

    const motion = floorEnterMotion({
      narrow: isNarrow(),
      reducedMotion: prefersReducedMotion(),
    });

    if (motion.kind === "instant") {
      for (const node of items) node.classList.add("is-in");
      return;
    }

    const nodes = [...items];
    const tween = animate(nodes, {
      opacity: [0, 1],
      ...(motion.y === 0 ? {} : { translateY: [motion.y, 0] }),
      duration: motion.duration,
      ease: motion.ease,
      delay: stagger(motion.stagger),
      loop: false,
      onComplete: () => {
        for (const node of nodes) {
          node.classList.add("is-in");
          node.style.removeProperty("opacity");
          node.style.removeProperty("transform");
          node.style.removeProperty("translate");
        }
      },
    });

    return () => {
      tween.pause();
      tween.cancel();
    };
  }, []);

  return null;
}
