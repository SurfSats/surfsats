import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { readoutNavLinks } from "@/lib/nav";

export type ReadoutName = "tidechain" | "chain" | "lineup" | "signal" | "fiat";

const HREF: Record<ReadoutName, string> = {
  tidechain: "/tidechain",
  chain: "/chain",
  lineup: "/lineup",
  signal: "/signal",
  fiat: "/fiat",
};

export function ReadoutShell({
  name,
  strip,
  className,
  children,
}: {
  name: ReadoutName;
  strip?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const current = HREF[name];

  return (
    <div
      className={cn("readout-page", `readout-page--${name}`, className)}
      data-readout={name}
    >
      {strip ? <header className="readout-strip">{strip}</header> : null}
      <nav className="readout-sibs" aria-label="Readouts">
        {readoutNavLinks.map((link, index) => {
          const on = link.href === current;
          return (
            <span key={link.href} className="readout-sib">
              {index > 0 ? (
                <span className="readout-sib-dot" aria-hidden="true">
                  ·
                </span>
              ) : null}
              <Link
                href={link.href}
                aria-current={on ? "page" : undefined}
                className={on ? "is-on" : undefined}
              >
                {link.label}
              </Link>
            </span>
          );
        })}
      </nav>
      <div className="readout-body">{children}</div>
    </div>
  );
}
