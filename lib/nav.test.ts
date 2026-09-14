import assert from "node:assert/strict";
import { test } from "node:test";
import {
  footerGroups,
  footerLinks,
  isReadoutPath,
  isWallPath,
  primaryNavLinks,
  wallNavLinks,
} from "./nav.ts";

test("DIRTY FIAT footer dest is /fiat, not /dirty-fiat", () => {
  const hit = footerLinks.find((link) =>
    link.label.toLowerCase().includes("fiat"),
  );
  assert.ok(hit);
  assert.equal(hit.href, "/fiat");
  assert.equal(
    footerLinks.some((link) => link.href === "/dirty-fiat"),
    false,
  );
});

test("machines nav includes GLASS", () => {
  const hit = primaryNavLinks.find((link) => link.href === "/glass");
  assert.ok(hit);
  assert.equal(hit.label, "GLASS");
});

test("primary pills have no SLAB and no extra wall dest", () => {
  const hrefs = primaryNavLinks.map((link) => link.href);
  assert.equal(hrefs.includes("/slab"), false);
  assert.equal(
    primaryNavLinks.some((link) => link.label === "SLAB"),
    false,
  );
  assert.equal(hrefs.includes("/graffiti"), false);
});

test("WALLS dropdown is Graffiti then The Slab, not a readout", () => {
  assert.deepEqual(wallNavLinks, [
    { href: "/graffiti", label: "Graffiti" },
    { href: "/slab", label: "The Slab" },
  ]);
  assert.equal(isWallPath("/graffiti"), true);
  assert.equal(isWallPath("/slab"), true);
  assert.equal(isWallPath("/story"), false);
  assert.equal(isReadoutPath("/slab"), false);
  assert.equal(isReadoutPath("/graffiti"), false);
});

test("footer machines list still has GLASS", () => {
  const machines = footerGroups.find((group) => group.id === "machines");
  assert.ok(machines);
  const hrefs = machines.links.map((link) => link.href);
  assert.ok(hrefs.includes("/glass"));
  assert.equal(hrefs.includes("/slab"), false);
});

test("footer walls list is Graffiti then The Slab", () => {
  const walls = footerGroups.find((group) => group.id === "walls");
  assert.ok(walls);
  assert.deepEqual(
    walls.links.map((link) => link.href),
    ["/graffiti", "/slab"],
  );
});

test("machines nav has one radio/jukebox/music entry", () => {
  const hits = primaryNavLinks.filter(
    (link) =>
      /radio|jukebox|music/i.test(link.label) ||
      /\/music|\/jukebox/.test(link.href),
  );
  assert.equal(hits.length, 1);
  assert.equal(hits[0].href, "/music");
});
