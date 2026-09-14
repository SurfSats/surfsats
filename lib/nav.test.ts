import assert from "node:assert/strict";
import { test } from "node:test";
import { footerGroups, footerLinks, primaryNavLinks } from "./nav.ts";

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

test("machines nav has SLAB after GRAFFITI and before STORY", () => {
  const hrefs = primaryNavLinks.map((link) => link.href);
  const graffitiAt = hrefs.indexOf("/graffiti");
  assert.ok(graffitiAt >= 0);
  assert.equal(hrefs[graffitiAt + 1], "/slab");
  assert.equal(hrefs[graffitiAt + 2], "/story");
  const hit = primaryNavLinks.find((link) => link.href === "/slab");
  assert.ok(hit);
  assert.equal(hit.label, "SLAB");
});

test("footer machines list has GLASS next to GRAFFITI", () => {
  const machines = footerGroups.find((group) => group.id === "machines");
  assert.ok(machines);
  const hrefs = machines.links.map((link) => link.href);
  const graffitiAt = hrefs.indexOf("/graffiti");
  assert.ok(graffitiAt >= 0);
  assert.equal(hrefs[graffitiAt + 1], "/glass");
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
