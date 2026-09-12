"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate } from "animejs/animation";
import { set as setStyle } from "animejs/utils";
import {
  TAG_WRITE_ON_FROM,
  tagWriteOnMotion,
} from "@/lib/tag-write-on";

const written = new Set<string>();

export function TagWriteOn({
  markId,
  children,
}: {
  markId: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (written.has(markId)) {
      node.classList.add("is-in");
      return;
    }

    const motion = tagWriteOnMotion({
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches,
    });
    if (motion.kind === "instant") {
      written.add(markId);
      node.classList.add("is-in");
      return;
    }

    const finish = () => {
      written.add(markId);
      node.classList.add("is-in");
      node.style.removeProperty("clip-path");
    };

    setStyle(node, { clipPath: TAG_WRITE_ON_FROM });
    animate(node, {
      clipPath: [motion.clipPath[0], motion.clipPath[1]],
      duration: motion.duration,
      ease: motion.ease,
      loop: false,
      onComplete: finish,
    });
    const safety = window.setTimeout(finish, motion.duration + 80);

    return () => {
      window.clearTimeout(safety);
    };
  }, [markId]);

  return (
    <div ref={ref} className="graf-inner graf-write-on">
      {children}
    </div>
  );
}
