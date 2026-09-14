import assert from "node:assert/strict";
import { test } from "node:test";
import { WAVE_RUNNER_LIVE, isWaveRunnerDeepLink } from "./arcade.ts";

test("wave runner is hidden in phase 0", () => {
  assert.equal(WAVE_RUNNER_LIVE, false);
});

test("wave runner deep links do not boot the hidden cabinet", () => {
  assert.equal(isWaveRunnerDeepLink("waverunner"), true);
  assert.equal(isWaveRunnerDeepLink("wave-runner"), true);
  assert.equal(isWaveRunnerDeepLink("wave"), true);
  assert.equal(isWaveRunnerDeepLink("WAVE_RUNNER"), true);
  assert.equal(isWaveRunnerDeepLink("retro"), false);
  assert.equal(isWaveRunnerDeepLink("pong"), false);
  assert.equal(isWaveRunnerDeepLink(""), false);
});
