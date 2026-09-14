import type { NavGroup, NavLink } from "./types";

export const primaryNavLinks: NavLink[] = [
  { href: "/music", label: "Radio" },
  { href: "/arcade", label: "Arcade" },
  { href: "/tab", label: "TAB" },
  { href: "/graffiti", label: "Graffiti" },
  { href: "/slab", label: "SLAB" },
  { href: "/story", label: "Story" },
  { href: "/glass", label: "GLASS" },
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

export const footerGroups: NavGroup[] = navGroups.map((group) => {
  if (group.id === "kit") {
    return {
      ...group,
      links: [...group.links, { href: "/about", label: "About" }],
    };
  }
  if (group.id === "machines") {
    const links = group.links.filter((link) => link.href !== "/glass");
    const graffitiAt = links.findIndex((link) => link.href === "/graffiti");
    const glass = group.links.find((link) => link.href === "/glass");
    if (glass && graffitiAt >= 0) {
      links.splice(graffitiAt + 1, 0, glass);
    }
    return { ...group, links };
  }
  return group;
});

export const footerLinks: NavLink[] = footerGroups.flatMap((group) => group.links);

export const COMPACT_HEADER_PREFIXES = [
  "/graffiti",
  "/slab",
  "/arcade",
  "/tab",
  "/story",
  "/glass",
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
