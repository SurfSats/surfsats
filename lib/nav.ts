import type { NavGroup, NavLink } from "./types";

export const primaryNavLinks: NavLink[] = [
  { href: "/music", label: "Music" },
  { href: "/arcade", label: "Arcade" },
  { href: "/tab", label: "TAB" },
  { href: "/graffiti", label: "Graffiti" },
  { href: "/story", label: "Story" },
];

export const readoutNavLinks: NavLink[] = [
  { href: "/tidechain", label: "Tidechain" },
  { href: "/lineup", label: "Lineup" },
  { href: "/signal", label: "Signal" },
  { href: "/fiat", label: "DIRTY FIAT" },
];

export const kitNavLinks: NavLink[] = [
  { href: "/tools", label: "Tools" },
];

export const navGroups: NavGroup[] = [
  { id: "machines", label: "// machines", links: primaryNavLinks },
  { id: "readouts", label: "// readouts", links: readoutNavLinks },
  { id: "kit", label: "// kit", links: kitNavLinks },
];

/** Flat public destinations for footer (and any other full-list maps). */
export const navLinks: NavLink[] = navGroups.flatMap((group) => group.links);

export const footerLinks: NavLink[] = navLinks;

export const COMPACT_HEADER_PREFIXES = [
  "/graffiti",
  "/arcade",
  "/tab",
  "/story",
  "/tidechain",
  "/lineup",
] as const;

export function isCompactHeaderPath(pathname: string) {
  return COMPACT_HEADER_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function isReadoutPath(pathname: string) {
  return readoutNavLinks.some((link) => isActivePath(pathname, link.href));
}
