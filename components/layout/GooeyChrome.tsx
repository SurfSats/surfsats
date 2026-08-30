"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Liquid } from "liquid-gooey";
import { cn } from "@/lib/cn";
import {
  isActivePath,
  isReadoutPath,
  kitNavLinks,
  primaryNavLinks,
  readoutNavLinks,
} from "@/lib/nav";
import type { NavLink } from "@/lib/types";

const GLASS_SILHOUETTE = "rgba(255,255,255,0.14)";
const DROP_SILHOUETTE = "rgba(255,122,24,0.42)";

const NAV_MORPH = {
  shape: true as const,
  contentBlur: 0,
  bounce: 0.22,
  speed: 1.4,
};

const pillLayout =
  "inline-flex h-[30px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-solid px-3 font-mono text-[10px] font-medium uppercase leading-none tracking-[0.06em] lg:h-[34px] xl:text-[11px]";

function pillMorph(hovering: boolean) {
  return {
    ...NAV_MORPH,
    advanced: {
      blobInset: hovering ? 0 : 2,
      bridgeGrow: hovering ? 4 : 0,
    },
  };
}

export function GooeyNavPills({
  links,
  pathname,
  onNavigate,
  className,
}: {
  links: NavLink[];
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
      {links.map((link) => {
        const active = isActivePath(pathname, link.href);
        const hovering = !active && hovered === link.href;

        return (
          <Liquid.Item
            key={link.href}
            morph={pillMorph(hovering)}
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

export function GooeyHeaderNav({
  pathname,
  className,
}: {
  pathname: string;
  className?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [readoutsOpen, setReadoutsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const readoutActive = isReadoutPath(pathname);
  const readoutHovering = !readoutActive && (hovered === "readouts" || readoutsOpen);
  const menuId = useId();

  useEffect(() => {
    setReadoutsOpen(false);
  }, [pathname]);

  const hoverHandlers = (key: string) => ({
    onPointerEnter: () => setHovered(key),
    onPointerLeave: () => setHovered(null),
    onFocus: () => setHovered(key),
    onBlur: () => setHovered(null),
  });

  return (
    <div
      className={cn(
        "relative flex shrink-0 flex-nowrap items-center overflow-visible",
        className,
      )}
    >
      <Liquid
        blur={4}
        contrast={16}
        fill={GLASS_SILHOUETTE}
        shadow="inset 0 1px 0 rgba(255,255,255,0.4)"
        waviness={0}
        filterPadding={20}
        className="flex flex-nowrap items-center gap-1.5 overflow-visible xl:gap-2"
      >
        {primaryNavLinks.map((link) => {
          const active = isActivePath(pathname, link.href);
          const hovering = !active && hovered === link.href;

          return (
            <Liquid.Item
              key={link.href}
              morph={pillMorph(hovering)}
              radius={999}
            >
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
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

        <Liquid.Item morph={pillMorph(readoutHovering)} radius={999}>
          <button
            ref={triggerRef}
            type="button"
            id={`${menuId}-trigger`}
            aria-expanded={readoutsOpen}
            aria-haspopup="menu"
            aria-controls={menuId}
            aria-current={readoutActive ? "page" : undefined}
            onClick={() => setReadoutsOpen((value) => !value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setReadoutsOpen(true);
              }
            }}
            {...hoverHandlers("readouts")}
            className={cn(
              pillLayout,
              "nav-glass backdrop-blur-[10px] backdrop-saturate-[160%]",
            )}
          >
            <span className="relative z-[2] inline-flex items-center gap-1">
              Readouts
              <span aria-hidden="true">{readoutsOpen ? "▴" : "▾"}</span>
            </span>
          </button>
        </Liquid.Item>

        {kitNavLinks.map((link) => {
          const active = isActivePath(pathname, link.href);
          const hovering = !active && hovered === link.href;

          return (
            <Liquid.Item
              key={link.href}
              morph={pillMorph(hovering)}
              radius={999}
            >
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                {...hoverHandlers(link.href)}
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

      <ReadoutsMenu
        id={menuId}
        open={readoutsOpen}
        pathname={pathname}
        triggerRef={triggerRef}
        onClose={() => setReadoutsOpen(false)}
      />
    </div>
  );
}

function ReadoutsMenu({
  id,
  open,
  pathname,
  triggerRef,
  onClose,
}: {
  id: string;
  open: boolean;
  pathname: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLUListElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 6,
      left: rect.right,
    });
  }, [triggerRef]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        triggerRef.current?.focus();
        return;
      }

      if (event.key === "Tab") {
        onClose();
        return;
      }

      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

      const items = menuRef.current?.querySelectorAll<HTMLElement>(
        "[role='menuitem']",
      );
      if (!items?.length) return;

      event.preventDefault();
      const current = Array.from(items).indexOf(
        document.activeElement as HTMLElement,
      );
      let next = current;
      if (event.key === "ArrowDown") {
        next = current < 0 ? 0 : (current + 1) % items.length;
      } else {
        next = current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length;
      }
      items[next]?.focus();
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onClose();
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, onClose, triggerRef]);

  if (!open || !coords || typeof document === "undefined") return null;

  return createPortal(
    <ul
      ref={menuRef}
      id={id}
      role="menu"
      aria-labelledby={`${id}-trigger`}
      className="fixed z-[60] min-w-[11.5rem] border border-cyan/45 bg-black/90 py-1 shadow-[0_10px_28px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[12px] backdrop-saturate-[160%]"
      style={{
        top: coords.top,
        left: coords.left,
        transform: "translateX(-100%)",
      }}
    >
      {readoutNavLinks.map((link) => {
        const active = isActivePath(pathname, link.href);
        return (
          <li key={link.href} role="none">
            <Link
              role="menuitem"
              tabIndex={-1}
              href={link.href}
              aria-current={active ? "page" : undefined}
              onClick={onClose}
              className={cn(
                "block px-3 py-2 font-mono text-[10px] uppercase tracking-[0.06em] hover:bg-white/10 hover:text-cyan xl:text-[11px]",
                active ? "bg-white/8 text-sats" : "text-foreground/90",
              )}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>,
    document.body,
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
