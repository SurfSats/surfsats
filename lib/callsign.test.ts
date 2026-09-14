import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CALLSIGN_MACHINES,
  CALLSIGN_MAX,
  CALLSIGN_MIN,
  CALLSIGN_RESERVED,
  CALLSIGN_STORAGE_KEY,
  applyCallsignSighting,
  glassChipLabel,
  isCallsignMachine,
  isReservedCallsign,
  mergeCallsignMachines,
  migrateGlassFromArcade,
  nextGlassFromEtch,
  parseCallsignEtch,
  parseGlassCache,
  sanitizeCallsign,
} from "./callsign.ts";
import { ARCADE_ALIAS_MAX, ARCADE_ALIAS_MIN, sanitizeAlias } from "./arcade.ts";

test("sanitizeCallsign trims, uppercases, and turns spaces into underscores", () => {
  assert.deepEqual(sanitizeCallsign("  hope two  "), {
    ok: true,
    callsign: "HOPE_TWO",
  });
  assert.deepEqual(sanitizeCallsign("ZoE"), { ok: true, callsign: "ZOE" });
  assert.deepEqual(sanitizeCallsign("HOPE-2"), { ok: true, callsign: "HOPE-2" });
});

test("sanitizeCallsign enforces 2–16 A-Z 0-9 _ -", () => {
  assert.equal(CALLSIGN_MIN, 2);
  assert.equal(CALLSIGN_MAX, 16);
  assert.equal(sanitizeCallsign("H").ok, false);
  assert.equal(sanitizeCallsign("A".repeat(17)).ok, false);
  assert.equal(sanitizeCallsign("HOPE!").ok, false);
  assert.equal(sanitizeCallsign("hope.two").ok, false);
  assert.equal(sanitizeCallsign("_OK").ok, true);
  assert.equal(sanitizeCallsign("-OK").ok, true);
});

test("reserved callsigns cannot be etched", () => {
  for (const name of CALLSIGN_RESERVED) {
    const result = sanitizeCallsign(name);
    assert.equal(result.ok, false, name);
    assert.equal(isReservedCallsign(name.toLowerCase()), true);
  }
  assert.deepEqual(
    [...CALLSIGN_RESERVED].sort(),
    ["ADMIN", "ANON", "GLASS", "NULL", "ROOT", "SURFSATS", "SYS", "TAPE"].sort(),
  );
});

test("sanitizeAlias is a wrapper around sanitizeCallsign", () => {
  assert.equal(ARCADE_ALIAS_MIN, CALLSIGN_MIN);
  assert.equal(ARCADE_ALIAS_MAX, CALLSIGN_MAX);
  assert.deepEqual(sanitizeAlias("  hope  "), { ok: true, alias: "HOPE" });
  assert.equal(sanitizeAlias("ANON").ok, false);
  assert.equal(sanitizeAlias("h").ok, false);
});

test("glass chip copy stays CALLSIGN / NOT ETCHED / ON THE GLASS", () => {
  assert.equal(glassChipLabel(null), "CALLSIGN —");
  assert.equal(
    glassChipLabel({ callsign: "HOPE", etched: false }),
    "HOPE · NOT ETCHED",
  );
  assert.equal(
    glassChipLabel({
      callsign: "HOPE",
      etched: true,
    }),
    "HOPE · ON THE GLASS",
  );
  assert.equal(CALLSIGN_STORAGE_KEY, "surfsats.callsign.v1");
});

test("parseGlassCache keeps only a sanitized callsign and local etch flags", () => {
  const parsed = parseGlassCache({
    callsign: " hope",
    etched: true,
    etchedAt: "2026-09-13T00:00:00.000Z",
    etchHash: "abc123",
    playerId: "player-1",
    email: "nope@example.com",
    ip: "1.2.3.4",
    npub: "npub1nope",
    totalSats: 2100,
  });
  assert.deepEqual(parsed, {
    callsign: "HOPE",
    etched: true,
    etchedAt: "2026-09-13T00:00:00.000Z",
    etchHash: "abc123",
    playerId: "player-1",
  });
  assert.equal(parseGlassCache({ callsign: "ANON", etched: true }), null);
  assert.equal(parseGlassCache(null), null);
});

test("name collisions share one wall row and never auto-rename", () => {
  const first = applyCallsignSighting(null, {
    callsign: "HOPE",
    paymentHash: "hash-a",
    machine: "graffiti",
    at: "2026-09-13T01:00:00.000Z",
    blockHeight: 910000,
  });
  assert.equal(first.callsign, "HOPE");
  assert.equal(first.firstPaymentHash, "hash-a");
  assert.equal(first.firstMachine, "graffiti");
  assert.deepEqual(first.machines, ["graffiti"]);
  assert.equal(first.blockHeight, 910000);

  const second = applyCallsignSighting(first, {
    callsign: "HOPE",
    paymentHash: "hash-b",
    machine: "arcade",
    at: "2026-09-13T02:00:00.000Z",
    blockHeight: 910100,
  });
  assert.equal(second.callsign, "HOPE");
  assert.equal(second.firstPaymentHash, "hash-a");
  assert.equal(second.firstMachine, "graffiti");
  assert.equal(second.createdAt, first.createdAt);
  assert.equal(second.blockHeight, 910000);
  assert.equal(second.lastSeenAt, "2026-09-13T02:00:00.000Z");
  assert.deepEqual(second.machines, ["graffiti", "arcade"]);
  assert.notEqual(second.callsign, "HOPE_2");
});

test("parseCallsignEtch and machine list include slab", () => {
  assert.deepEqual(CALLSIGN_MACHINES, [
    "graffiti",
    "arcade",
    "story",
    "tab",
    "radio",
    "slab",
    "pleb-box",
  ]);
  assert.equal(isCallsignMachine("graffiti"), true);
  assert.equal(isCallsignMachine("slab"), true);
  assert.equal(isCallsignMachine("pleb-box"), true);
  assert.equal(isCallsignMachine("bottle"), false);
  assert.deepEqual(mergeCallsignMachines(["arcade"], "arcade"), ["arcade"]);
  assert.deepEqual(mergeCallsignMachines(["arcade"], "tab"), ["arcade", "tab"]);

  const etch = parseCallsignEtch({
    callsign: "hope",
    firstPaymentHash: "hh",
    firstMachine: "graffiti",
    createdAt: "2026-09-13T01:00:00.000Z",
    lastSeenAt: "2026-09-13T01:00:00.000Z",
    machines: ["graffiti", "nope"],
  });
  assert.ok(etch);
  assert.equal(etch.callsign, "HOPE");
  assert.deepEqual(etch.machines, ["graffiti"]);
  assert.equal(parseCallsignEtch({ callsign: "HOPE" }), null);
});

test("arcade alias migrates onto local glass once", () => {
  const migrated = migrateGlassFromArcade(null, {
    playerId: "player-1",
    alias: "hope",
  });
  assert.deepEqual(migrated, {
    callsign: "HOPE",
    etched: false,
    playerId: "player-1",
  });
  const kept = migrateGlassFromArcade(
    { callsign: "ZOE", etched: true },
    { playerId: "player-1", alias: "HOPE" },
  );
  assert.equal(kept?.callsign, "ZOE");
  assert.equal(kept?.etched, true);
});

test("a settled etch marks local glass without renaming collisions", () => {
  const etched = nextGlassFromEtch(
    { callsign: "HOPE", etched: false, playerId: "player-1" },
    {
      callsign: "HOPE",
      firstPaymentHash: "hash-a",
      createdAt: "2026-09-13T01:00:00.000Z",
    },
  );
  assert.deepEqual(etched, {
    callsign: "HOPE",
    etched: true,
    etchedAt: "2026-09-13T01:00:00.000Z",
    etchHash: "hash-a",
    playerId: "player-1",
  });
});
