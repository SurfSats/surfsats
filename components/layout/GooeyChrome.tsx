"use client";

import Link from "next/link";
import { useState } from "react";
import { Liquid } from "liquid-gooey";
import { cn } from "@/lib/cn";
import { navLinks } from "@/lib/nav";

const NAV_MORPH = {
  shape: true as const,
  contentBlur: 0,
  speed: 1.35,
};

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

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
      blur={7}
      contrast={12}
      fill="var(--panel)"
      waviness={0.6}
      filterPadding={32}
      shadow="inset 0 0 0 1px rgba(61, 255, 243, 0.22)"
      className={cn("flex min-w-0 flex-wrap items-center gap-1.5", className)}
    >
      {navLinks.map((link) => {
        const active = isActivePath(pathname, link.href);
        const hot = active || hovered === link.href;

        return (
          <Liquid.Item
            key={link.href}
            morph={{
              ...NAV_MORPH,
              bounce: hot ? 0.45 : 0.28,
              advanced: { bridgeGrow: hot ? 8 : 2 },
            }}
            radius={999}
          >
            <Link
              href={link.href}
              onClick={onNavigate}
              onPointerEnter={() => setHovered(link.href)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(link.href)}
              onBlur={() => setHovered(null)}
              className={cn(
                "inline-flex origin-center items-center rounded-full bg-transparent px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] xl:text-[11px] xl:tracking-[0.12em]",
                hot && "scale-110",
                active ? "text-sats" : hot ? "text-cyan" : "text-muted",
              )}
            >
              {link.label}
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
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const melt = pressed ? "press" : hovered ? "hover" : "rest";

  return (
    <Liquid
      blur={3}
      contrast={14}
      fill="var(--sats)"
      waviness={melt === "rest" ? 0.3 : 1.8}
      filterPadding={28}
      shadow="3px 3px 0 var(--magenta)"
      className={cn("relative z-10 inline-flex shrink-0", className)}
    >
      <Liquid.Item
        morph={{
          shape: true,
          contentBlur: 0,
          bounce: 0.55,
          speed: 1.6,
        }}
        radius={melt === "press" ? 16 : melt === "hover" ? 12 : 2}
      >
        <Link
          href="/jukebox"
          onClick={onNavigate}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => {
            setHovered(false);
            setPressed(false);
          }}
          onPointerDown={() => setPressed(true)}
          onPointerUp={() => setPressed(false)}
          onFocus={() => setHovered(true)}
          onBlur={() => {
            setHovered(false);
            setPressed(false);
          }}
          className={cn(
            "inline-flex origin-center items-center justify-center bg-transparent px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#08080b]",
            melt === "press" && "scale-95 rounded-2xl",
            melt === "hover" && "scale-105 rounded-xl",
            melt === "rest" && "rounded-sm",
          )}
        >
          [ drop_21_sats ]
        </Link>
      </Liquid.Item>
    </Liquid>
  );
}
