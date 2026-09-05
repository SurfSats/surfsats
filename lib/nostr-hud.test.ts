import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HYDROGRAPHIC_RELAYS,
  MAX_HUD_EVENTS,
  nextHandshakeRelays,
  parseZapSats,
  shouldPlayZapLatch,
  toHudEvent,
  truncatePubkey,
} from "./nostr-hud.ts";

test("hydrographic pool is damus, nos.lol, and primal", () => {
  assert.deepEqual(HYDROGRAPHIC_RELAYS, [
    "wss://relay.damus.io",
    "wss://nos.lol",
    "wss://relay.primal.net",
  ]);
  assert.equal(MAX_HUD_EVENTS, 20);
});

test("truncatePubkey keeps 8 head and 4 tail", () => {
  const pk = "a".repeat(32) + "b".repeat(32);
  assert.equal(truncatePubkey(pk), "aaaaaaaa...bbbb");
  assert.equal(truncatePubkey("short"), "short");
});

test("parseZapSats reads millisats from the amount tag", () => {
  assert.equal(
    parseZapSats({
      kind: 9735,
      tags: [["amount", "21000"]],
      content: "",
    }),
    21,
  );
});

test("parseZapSats reads sats from a bolt11 tag", () => {
  assert.equal(
    parseZapSats({
      kind: 9735,
      tags: [["bolt11", "lnbc210n1pdeadbeef"]],
      content: "",
    }),
    21,
  );
});

test("parseZapSats reads millisats from the description JSON", () => {
  assert.equal(
    parseZapSats({
      kind: 9735,
      tags: [["description", JSON.stringify({ amount: 21000 })]],
      content: "",
    }),
    21,
  );
});

test("parseZapSats ignores notes and junk zaps", () => {
  assert.equal(
    parseZapSats({
      kind: 1,
      tags: [["amount", "21000"]],
      content: "gm",
    }),
    null,
  );
  assert.equal(
    parseZapSats({
      kind: 9735,
      tags: [["description", "not-json"]],
      content: "",
    }),
    null,
  );
});

test("toHudEvent maps a zap with sats and a note without", () => {
  const zap = toHudEvent({
    id: "01ab",
    pubkey: "c".repeat(64),
    kind: 9735,
    created_at: 1_700_000_000,
    content: "",
    tags: [["amount", "21000"]],
  });
  assert.equal(zap.sats, 21);
  assert.equal(zap.kind, 9735);
  assert.equal(zap.pubkey.length, 64);

  const note = toHudEvent({
    id: "02cd",
    pubkey: "d".repeat(64),
    kind: 1,
    created_at: 1_700_000_001,
    content: "hello #Bitcoin",
    tags: [["t", "Bitcoin"]],
  });
  assert.equal(note.sats, null);
  assert.equal(note.content, "hello #Bitcoin");
});

test("nextHandshakeRelays prefers live pool sockets", () => {
  assert.deepEqual(
    nextHandshakeRelays(
      new Map([
        ["wss://relay.damus.io", true],
        ["wss://nos.lol", false],
      ]),
      ["wss://nos.lol"],
    ),
    ["wss://relay.damus.io"],
  );
});

test("nextHandshakeRelays keeps traffic-proven relays when status lags empty", () => {
  assert.deepEqual(
    nextHandshakeRelays(new Map(), [
      "wss://relay.damus.io",
      "wss://nos.lol",
      "wss://relay.damus.io",
    ]),
    ["wss://relay.damus.io", "wss://nos.lol"],
  );
});

test("shouldPlayZapLatch only fires live kind 9735 with sats", () => {
  assert.equal(
    shouldPlayZapLatch({ live: false, paused: false, kind: 9735, sats: 21 }),
    false,
  );
  assert.equal(
    shouldPlayZapLatch({ live: true, paused: true, kind: 9735, sats: 21 }),
    false,
  );
  assert.equal(
    shouldPlayZapLatch({ live: true, paused: false, kind: 1, sats: 21 }),
    false,
  );
  assert.equal(
    shouldPlayZapLatch({ live: true, paused: false, kind: 9735, sats: null }),
    false,
  );
  assert.equal(
    shouldPlayZapLatch({ live: true, paused: false, kind: 9735, sats: 21 }),
    true,
  );
});
