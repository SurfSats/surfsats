import assert from "node:assert/strict";
import { test } from "node:test";
import {
  arcadeTapeText,
  clipTapeQuote,
  encodeTapeSnapshot,
  encodeTapeSse,
  formatTapeActor,
  formatTapeAge,
  formatTapeLine,
  graffitiTapeText,
  mergeTapeEvents,
  mergeTapeWithFallback,
  parseTapeEvent,
  parseTapePayload,
  radioTapeText,
  tabTapeText,
  tapeFromArcade,
  tapeFromGraffiti,
  tapeFromRadio,
  tapeFromStory,
  tapeFromTab,
  TAPE_SEED,
  publishTape,
  storyTapeText,
  subscribeTape,
} from "./settlement-tape.ts";

test("tape lines match the settlement copy", () => {
  assert.equal(
    graffitiTapeText("PLEBIAN", "HOPE"),
    "PLEBIAN sprayed 'HOPE' on Graffiti",
  );
  assert.equal(
    radioTapeText("ZOE"),
    "ZOE zapped 21 sats on Radio",
  );
  assert.equal(
    storyTapeText("anon", 48),
    "anon wrote line 48 on Story Chain",
  );
  assert.equal(arcadeTapeText("WAVE"), "WAVE zapped 21 sats on Arcade");
  assert.equal(tabTapeText("BITCOINER"), "BITCOINER sat the tab · 21 sats");
});

test("formatTapeActor falls back to anon", () => {
  assert.equal(formatTapeActor("  ZOE  "), "ZOE");
  assert.equal(formatTapeActor(""), "anon");
  assert.equal(formatTapeActor(null), "anon");
});

test("clipTapeQuote keeps short marks and trims long ones", () => {
  assert.equal(clipTapeQuote("HOPE"), "HOPE");
  assert.equal(clipTapeQuote("a very long graffiti slogan here", 10).endsWith("…"), true);
});

test("formatTapeLine appends relative age", () => {
  const now = Date.parse("2026-09-05T12:00:12Z");
  const line = formatTapeLine(
    {
      id: "1",
      machine: "graffiti",
      actor: "PLEBIAN",
      text: graffitiTapeText("PLEBIAN", "HOPE"),
      createdAt: "2026-09-05T12:00:00Z",
      href: "/graffiti",
    },
    now,
  );
  assert.equal(line, "PLEBIAN sprayed 'HOPE' on Graffiti • 12s ago");
});

test("formatTapeAge uses minutes with ago", () => {
  const now = Date.parse("2026-09-05T12:02:00Z");
  assert.equal(formatTapeAge("2026-09-05T12:00:00Z", now), "2m ago");
});

test("parseTapeEvent rejects junk and mergeTapeEvents keeps newest", () => {
  assert.equal(parseTapeEvent(null), null);
  assert.equal(parseTapeEvent({ id: "x" }), null);
  const older = parseTapeEvent({
    id: "a",
    machine: "tab",
    actor: "A",
    text: "A sat the tab · 21 sats",
    createdAt: "2026-09-05T10:00:00Z",
    href: "/tab",
  });
  const newer = parseTapeEvent({
    id: "b",
    machine: "tab",
    actor: "B",
    text: "B sat the tab · 21 sats",
    createdAt: "2026-09-05T11:00:00Z",
    href: "/tab",
  });
  assert.ok(older && newer);
  const merged = mergeTapeEvents([older], [newer, older]);
  assert.equal(merged[0].id, "b");
  assert.equal(merged.length, 2);
});

test("store mappers match the settlement copy", () => {
  const graf = tapeFromGraffiti({
    id: "m1",
    text: "HOPE",
    createdAt: "2026-09-05T12:00:00Z",
    paymentHash: "gh",
  });
  assert.equal(graf.text, "anon sprayed 'HOPE' on Graffiti");
  assert.equal(graf.id, "graffiti:gh");
  assert.equal(graf.href, "/graffiti");

  const radio = tapeFromRadio({
    id: "b1",
    createdAt: "2026-09-05T12:00:00Z",
    alias: "ZOE",
  });
  assert.equal(radio.text, "ZOE zapped 21 sats on Radio");
  assert.equal(radio.href, "/music");

  const story = tapeFromStory(
    { id: "s1", alias: "anon", createdAt: "2026-09-05T12:00:00Z" },
    48,
  );
  assert.equal(story.text, "anon wrote line 48 on Story Chain");

  assert.equal(
    tapeFromArcade({
      paymentHash: "ah",
      alias: "WAVE",
      createdAt: "2026-09-05T12:00:00Z",
    }).text,
    "WAVE zapped 21 sats on Arcade",
  );
  assert.equal(
    tapeFromTab({
      paymentHash: "th",
      alias: "PLEB",
      createdAt: "2026-09-05T12:00:00Z",
    }).href,
    "/tab",
  );
});

test("parseTapePayload reads snapshot envelopes and seed is never empty", () => {
  assert.ok(TAPE_SEED.length > 0);
  assert.equal(parseTapePayload({ events: TAPE_SEED }).length, TAPE_SEED.length);
  assert.equal(parseTapePayload(null).length, 0);
  const encoded = encodeTapeSse(TAPE_SEED[0]);
  assert.ok(encoded.startsWith("event: tape\n"));
  assert.ok(encodeTapeSnapshot(TAPE_SEED).startsWith("event: snapshot\n"));
});

test("mergeTapeWithFallback drops seed once real activity exists", () => {
  const real = tapeFromGraffiti({
    id: "live-1",
    text: "HOPE",
    createdAt: "2026-09-05T12:00:00Z",
  });
  const merged = mergeTapeWithFallback(TAPE_SEED, [real]);
  assert.equal(merged.some((event) => event.id === "seed-graf"), false);
  assert.equal(merged[0].id, real.id);
  const fallback = mergeTapeWithFallback([], []);
  assert.equal(fallback.length, TAPE_SEED.length);
});

test("publishTape notifies listeners once per id", () => {
  const seen: string[] = [];
  const unsub = subscribeTape((event) => {
    seen.push(event.id);
  });
  const event = tapeFromRadio({
    id: `bus-${Date.now()}`,
    createdAt: new Date().toISOString(),
    alias: "ZOE",
  });
  assert.equal(publishTape(event), true);
  assert.equal(publishTape(event), false);
  assert.deepEqual(seen, [event.id]);
  unsub();
});
