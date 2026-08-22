"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/cn";
import { RADIO_NAV } from "@/lib/music";

export function RadioNav() {
  const [active, setActive] = useState<string>(RADIO_NAV[0].id);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (RADIO_NAV.some((item) => item.id === hash)) {
      setActive(hash);
    }

    const nodes = RADIO_NAV.map((item) => document.getElementById(item.id)).filter(
      (node): node is HTMLElement => Boolean(node),
    );
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (hit?.target.id) setActive(hit.target.id);
      },
      {
        root: null,
        rootMargin: "-28% 0px -58% 0px",
        threshold: [0.08, 0.2, 0.4, 0.7],
      },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="radio-subnav sticky z-40 border-y border-cyan/20 bg-background/92 backdrop-blur-md">
      <Container>
        <nav
          aria-label="Surf Radio sections"
          className="flex gap-1 overflow-x-auto py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {RADIO_NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={active === item.id ? "location" : undefined}
              onClick={() => setActive(item.id)}
              className={cn(
                "shrink-0 border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors",
                active === item.id
                  ? "border-sats bg-sats/15 text-sats"
                  : "border-transparent text-muted hover:border-cyan/30 hover:text-cyan",
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </Container>
    </div>
  );
}
