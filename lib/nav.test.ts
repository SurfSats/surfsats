import assert from "node:assert/strict";
import { test } from "node:test";
import { footerLinks, kitNavLinks, primaryNavLinks } from "./nav.ts";

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

test("machines nav has one radio/jukebox/music entry", () => {
  const hits = primaryNavLinks.filter(
    (link) =>
      /radio|jukebox|music/i.test(link.label) ||
      /\/music|\/jukebox/.test(link.href),
  );
  assert.equal(hits.length, 1);
  assert.equal(hits[0].href, "/music");
});

test("kit nav includes the sandbox", () => {
  const hit = kitNavLinks.find((link) => link.href === "/sandbox");
  assert.ok(hit);
  assert.equal(hit.label, "Sandbox");
});
