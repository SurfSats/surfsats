"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function SiteChrome({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function apply() {
      const node = ref.current;
      if (!node) return;
      const height = node.getBoundingClientRect().height;
      if (height <= 0) return;
      document.documentElement.style.setProperty(
        "--site-chrome-h",
        `${Math.round(height)}px`,
      );
    }

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    window.addEventListener("resize", apply);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);

  return (
    <div ref={ref} id="site-chrome" className="sticky top-0 z-50">
      {children}
    </div>
  );
}
