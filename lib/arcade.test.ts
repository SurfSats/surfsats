import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ARCADE_MACHINE_PLEB,
  PLEB_BOX_ATTRACT,
  PLEB_BOX_GAMES,
  PLEB_BOX_HOW,
  PLEB_BOX_LABEL,
  PLEB_BOX_RULES,
  WAVE_RUNNER_LIVE,
  isPlebBoxDeepLink,
  isPlebBoxGameId,
  isWaveRunnerDeepLink,
  parseArcadeMachine,
  plebInvoiceFromSubmit,
} from "./arcade.ts";

test("wave runner stays hidden", () => {
  assert.equal(WAVE_RUNNER_LIVE, false);
});

test("wave runner deep links do not boot the hidden cabinet", () => {
  assert.equal(isWaveRunnerDeepLink("waverunner"), true);
  assert.equal(isWaveRunnerDeepLink("wave-runner"), true);
  assert.equal(isWaveRunnerDeepLink("wave"), true);
  assert.equal(isWaveRunnerDeepLink("WAVE_RUNNER"), true);
  assert.equal(isWaveRunnerDeepLink("retro"), false);
  assert.equal(isWaveRunnerDeepLink("pong"), false);
  assert.equal(isWaveRunnerDeepLink("pleb-box"), false);
  assert.equal(isWaveRunnerDeepLink(""), false);
});

test("pleb box is the arcade machine id and has three dead tabs", () => {
  assert.equal(ARCADE_MACHINE_PLEB, "pleb-box");
  assert.equal(parseArcadeMachine("pleb-box"), "pleb-box");
  assert.equal(parseArcadeMachine("retro"), "retro");
  assert.deepEqual(
    PLEB_BOX_GAMES.map((game) => game.id),
    ["noodle", "laser", "yeet"],
  );
  assert.equal(isPlebBoxGameId("noodle"), true);
  assert.equal(isPlebBoxGameId("laser"), true);
  assert.equal(isPlebBoxGameId("yeet"), true);
  assert.equal(isPlebBoxGameId("wave-runner"), false);
});

test("pleb box deep links land on the box, not wave runner", () => {
  assert.equal(isPlebBoxDeepLink("pleb-box"), true);
  assert.equal(isPlebBoxDeepLink("pleb"), true);
  assert.equal(isPlebBoxDeepLink("noodle"), true);
  assert.equal(isPlebBoxDeepLink("LASER"), true);
  assert.equal(isPlebBoxDeepLink("yeet"), true);
  assert.equal(isPlebBoxDeepLink("waverunner"), false);
  assert.equal(isPlebBoxDeepLink("retro"), false);
});

test("pleb invoice opens only after an explicit submit of a full valid callsign", () => {
  assert.equal(plebInvoiceFromSubmit("HO", { explicit: false }).open, false);
  assert.equal(plebInvoiceFromSubmit("HOPE", { explicit: false }).open, false);
  assert.equal(plebInvoiceFromSubmit("H", { explicit: true }).open, false);
  assert.equal(plebInvoiceFromSubmit("ANON", { explicit: true }).open, false);
  assert.equal(plebInvoiceFromSubmit("", { explicit: true }).open, false);
  const two = plebInvoiceFromSubmit("HO", { explicit: true });
  assert.equal(two.open, true);
  if (two.open) assert.equal(two.alias, "HO");
  const hope = plebInvoiceFromSubmit("  hope  ", { explicit: true });
  assert.equal(hope.open, true);
  if (hope.open) assert.equal(hope.alias, "HOPE");
});

test("pleb box copy names the three tabs and skips forbidden words", () => {
  assert.equal(PLEB_BOX_LABEL, "PLEB BOX");
  assert.match(PLEB_BOX_ATTRACT, /INSERT 21 SATS · NOODLE · LASER · YEET/);
  assert.equal(
    PLEB_BOX_HOW,
    "21 SATS. 3 CREDITS. ONE BOX. NOODLE GROWS. LASER CLEARS. YEET FLIES.",
  );
  assert.equal(
    PLEB_BOX_RULES,
    "no accounts. callsign on the glass. isolated from Retro.",
  );
  const blob = [
    PLEB_BOX_LABEL,
    PLEB_BOX_ATTRACT,
    PLEB_BOX_HOW,
    PLEB_BOX_RULES,
    ...PLEB_BOX_GAMES.map((game) => `${game.label} ${game.line}`),
  ].join(" ");
  assert.doesNotMatch(
    blob,
    /\b(surf|wave|swell|barrel|rider|username|NFT|treasury payout)\b/i,
  );
});
