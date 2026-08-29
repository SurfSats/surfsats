"use client";

import Link from "next/link";
import { useState } from "react";
import { Liquid } from "liquid-gooey";
import { cn } from "@/lib/cn";
import { navLinks } from "@/lib/nav";

const GLASS_SILHOUETTE = "rgba(255,255,255,0.14)";
const DROP_SILHOUETTE = "rgba(255,122,24,0.42)";

const NAV_MORPH = {
  shape: true as const,
  contentBlur: 0,
  bounce: 0.22,
  speed: 1.4,
};

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

const pillLayout =
  "inline-flex h-[30px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-solid px-3 font-mono text-[10px] font-medium uppercase leading-none tracking-[0.06em] lg:h-[34px] xl:text-[11px]";

export function GooeyNavPills({
  pathname,
  onNavigate,
  className,
}: {
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <Liquid
      blur={4}
      contrast={16}
      fill={GLASS_SILHOUETTE}
      shadow="inset 0 1px 0 rgba(255,255,255,0.4)"
      waviness={0}
      filterPadding={20}
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-2 overflow-visible",
        className,
      )}
    >
      {navLinks.map((link) => {
        const active = isActivePath(pathname, link.href);
        const hovering = !active && hovered === link.href;

        return (
          <Liquid.Item
            key={link.href}
            morph={{
              ...NAV_MORPH,
              advanced: {
                blobInset: hovering ? 0 : 2,
                bridgeGrow: hovering ? 4 : 0,
              },
            }}
            radius={999}
          >
            <Link
              href={link.href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              onPointerEnter={() => setHovered(link.href)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(link.href)}
              onBlur={() => setHovered(null)}
              className={cn(
                pillLayout,
                "nav-glass backdrop-blur-[10px] backdrop-saturate-[160%]",
              )}
            >
              <span className="relative z-[2]">{link.label}</span>
            </Link>
          </Liquid.Item>
        );
      })}
    </Liquid>
  );
}

export function GooeyDropSats({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <Liquid
      blur={3}
      contrast={16}
      fill={DROP_SILHOUETTE}
      shadow="inset 0 1px 0 rgba(255,255,255,0.4)"
      waviness={0}
      filterPadding={20}
      className={cn("relative z-10 inline-flex shrink-0", className)}
    >
      <Liquid.Item
        morph={{
          shape: true,
          contentBlur: 0,
          bounce: 0.3,
          speed: 1.6,
        }}
        radius={999}
      >
        <Link
          href="/jukebox"
          onClick={onNavigate}
          className={cn(
            pillLayout,
            "nav-glass nav-glass-drop font-semibold backdrop-blur-[10px] backdrop-saturate-[160%]",
          )}
        >
          <span className="relative z-[2]">[ drop_21_sats ]</span>
        </Link>
      </Liquid.Item>
    </Liquid>
  );
}
