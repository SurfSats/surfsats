"use client";

import Link from "next/link";
import { useState } from "react";
import { Liquid } from "liquid-gooey";
import { cn } from "@/lib/cn";
import { navLinks } from "@/lib/nav";

const ORANGE = "#F7931A";
const INK = "#08080b";
const SHELL = "#111116";
const LABEL = "#e2c4a4";
const LABEL_HOT = "#eceae4";
const STROKE_HOT = "#ffb347";
const HOVER_FILL = `color-mix(in srgb, ${ORANGE} 52%, ${SHELL})`;

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
      fill={ORANGE}
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
              className={pillLayout}
              style={{
                background: active ? ORANGE : hovering ? HOVER_FILL : SHELL,
                borderColor: hovering ? STROKE_HOT : ORANGE,
                color: active ? INK : hovering ? LABEL_HOT : LABEL,
              }}
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
  const squash = pressed ? "press" : hovered ? "hover" : "rest";

  return (
    <Liquid
      blur={3}
      contrast={16}
      fill={ORANGE}
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
            pillLayout,
            "origin-center font-semibold",
            squash === "press" && "scale-95",
            squash === "hover" && "scale-105",
          )}
          style={{ background: ORANGE, borderColor: ORANGE, color: INK }}
        >
          [ drop_21_sats ]
        </Link>
      </Liquid.Item>
    </Liquid>
  );
}
