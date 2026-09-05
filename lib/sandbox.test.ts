import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SANDBOX_PRICE_SATS,
  harmonicFlowKhz,
  hexNoiseBlock,
  hydraulicAmplitude,
  hydraulicPressureKpa,
  hydraulicSpeed,
  isCrestHighlight,
  parseSandboxDocumentId,
  primaryWaveY,
  swellPeriodSec,
} from "./sandbox.ts";

test("hydraulic speed and amplitude scale with sats/sec and clamp", () => {
  assert.equal(hydraulicSpeed(0), 0.02);
  assert.equal(hydraulicSpeed(21), 0.02 + 21 / 1000);
  assert.equal(hydraulicSpeed(10_000), 0.1);
  assert.equal(hydraulicAmplitude(0), 18);
  assert.equal(hydraulicAmplitude(21), 18 + 21 * 0.8);
  assert.equal(hydraulicAmplitude(10_000), 83);
});

test("swell period, pressure, and 44.1k harmonic track throughput", () => {
  assert.equal(swellPeriodSec(21, 0), 12 + 1 * 0.4);
  assert.equal(hydraulicPressureKpa(21), 21 * 1.618);
  assert.equal(harmonicFlowKhz(21), 44.1);
  assert.equal(harmonicFlowKhz(42), 88.2);
});

test("primary wave is centered and cresting is below the trough threshold", () => {
  const height = 200;
  const amplitude = 40;
  const mid = primaryWaveY({ x: 0, step: 0, amplitude, height });
  assert.equal(mid, height / 2);
  assert.equal(
    isCrestHighlight({ y: height / 2 - amplitude * 0.8, height, amplitude }),
    true,
  );
  assert.equal(
    isCrestHighlight({ y: height / 2, height, amplitude }),
    false,
  );
});

test("hex noise block is fixed width from the glyph alphabet", () => {
  let i = 0;
  const random = () => {
    i += 1;
    return (i % 10) / 10;
  };
  const lines = hexNoiseBlock({ lines: 2, width: 8, random });
  assert.equal(lines.length, 2);
  assert.equal(lines[0].length, 8);
  assert.match(lines[0], /^[0-9A-F!@#$%^&*<>[\]{}//\-=]+$/);
});

test("sandbox document ids are stripped to a safe token", () => {
  assert.equal(parseSandboxDocumentId("DOC_9735_SWELL_MANIFESTO"), "DOC_9735_SWELL_MANIFESTO");
  assert.equal(parseSandboxDocumentId("  bad id!!  "), "BADID");
  assert.equal(parseSandboxDocumentId(""), null);
  assert.equal(SANDBOX_PRICE_SATS, 21);
});
