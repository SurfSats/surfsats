"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SfxToggle } from "@/components/layout/SfxToggle";
import { MempoolFeeChip } from "@/components/telemetry/MempoolFeeChip";
import { Logo } from "@/components/ui/Logo";
import { Container } from "@/components/ui/Container";
import {
  GooeyDropSats,
  GooeyHeaderNav,
  GooeyNavPills,
} from "@/components/layout/GooeyChrome";
import { isCompactHeaderPath, navGroups } from "@/lib/nav";
import { cn } from "@/lib/cn";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const compact = isCompactHeaderPath(pathname);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className="site-nav relative z-[2] overflow-visible border-b border-cyan/20"
      data-compact={compact ? "true" : undefined}
    >
      <Container
        className={cn(
          "flex flex-nowrap items-center justify-between gap-3 overflow-visible lg:gap-5",
          compact ? "min-h-12 py-1 sm:min-h-14" : "min-h-14 py-2 sm:min-h-16",
        )}
      >
        <Logo className="shrink-0" />

        <nav
          className="hidden flex-1 flex-nowrap items-center justify-end overflow-visible lg:flex"
          aria-label="Primary"
        >
          <GooeyHeaderNav pathname={pathname} />
        </nav>

        <GooeyDropSats className="max-lg:hidden" />
        <MempoolFeeChip />
        <SfxToggle />

        <button
          type="button"
          className="inline-flex size-10 shrink-0 items-center justify-center border border-cyan/40 text-cyan lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
            {open ? (
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="square"
              />
            ) : (
              <path
                d="M5 8h14M5 12h14M5 16h14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="square"
              />
            )}
          </svg>
        </button>
      </Container>

      {open ? (
        <div
          id="mobile-nav"
          className="nav-glass-cluster border-t border-white/15 backdrop-blur-[12px] backdrop-saturate-[160%] lg:hidden"
        >
          <Container className="flex flex-col items-stretch gap-4 py-3">
            {navGroups.map((group) => (
              <div key={group.id} className="flex flex-col items-start gap-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan/70">
                  {group.label}
                </p>
                <GooeyNavPills
                  links={group.links}
                  pathname={pathname}
                  onNavigate={() => setOpen(false)}
                  className="w-full justify-start"
                />
              </div>
            ))}
            <GooeyDropSats onNavigate={() => setOpen(false)} />
          </Container>
        </div>
      ) : null}
    </header>
  );
}
