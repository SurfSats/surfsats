"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/cn";
import { navLinks } from "@/lib/nav";
import { swellFromPct } from "@/lib/swell";
import type { TimechainSnapshot } from "@/lib/timechain";
import { useTimechainSnapshot } from "@/components/timechain/useTimechainSnapshot";

export function Navbar({
  initial,
}: {
  initial: TimechainSnapshot | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-cyan/20 bg-background/90">
      <div className="border-b border-magenta/25 bg-black/60">
        <Container className="flex h-7 items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-cyan/80">
          <span>sys.surfsats // online // no kyc</span>
          <span className="hidden sm:inline">
            mempool=hot <SwellTicker initial={initial} />
          </span>
        </Container>
      </div>

      <Container className="flex h-14 items-center justify-between gap-3 sm:h-16">
        <Logo />

        <nav
          className="hidden min-w-0 flex-1 items-center justify-end gap-1.5 overflow-x-auto lg:flex xl:gap-2.5"
          aria-label="Primary"
        >
          {navLinks.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "shrink-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.1em] transition-colors glitch-hover xl:text-[11px] xl:tracking-[0.12em]",
                  active
                    ? "text-sats"
                    : "text-muted hover:text-cyan",
                )}
              >
                {active ? ">" : "/"}
                {link.label.toLowerCase()}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/jukebox"
          className="btn shrink-0 px-3 py-2 text-[10px] max-xl:!hidden xl:!inline-flex"
        >
          [ drop_21_sats ]
        </Link>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center border border-cyan/40 text-cyan lg:hidden"
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
          className="border-t border-cyan/20 bg-background lg:hidden"
        >
          <Container className="flex flex-col gap-1 py-3">
            {navLinks.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "px-2 py-3 font-mono text-sm uppercase tracking-[0.14em]",
                    active
                      ? "bg-cyan/8 text-sats"
                      : "text-foreground hover:bg-cyan/6 hover:text-cyan",
                  )}
                >
                  {active ? ">" : "$"} {link.label.toLowerCase()}
                </Link>
              );
            })}
          </Container>
        </div>
      ) : null}
    </header>
  );
}

function SwellTicker({ initial }: { initial: TimechainSnapshot | null }) {
  const { snapshot } = useTimechainSnapshot(initial);
  const pct = snapshot.priceChangePct;
  if (pct === null) return <>swell=unknown</>;
  const swell = swellFromPct(pct);
  return (
    <span className={swell.direction === "up" ? "text-cyan" : "text-magenta"}>
      swell={swell.direction}
    </span>
  );
}
