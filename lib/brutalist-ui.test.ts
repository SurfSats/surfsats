import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BRUTALIST_BUTTON_SIZE_CLASS,
  BRUTALIST_BUTTON_VARIANT_CLASS,
  HEX_STREAM_DEFAULT_TAG,
  TERMINAL_CARD_STATUS_CLASS,
  randomHexSnippet,
} from "./brutalist-ui.ts";

test("terminal card status maps idle, active, warning, and live", () => {
  assert.match(TERMINAL_CARD_STATUS_CLASS.idle, /bg-zinc-raw/);
  assert.match(TERMINAL_CARD_STATUS_CLASS.active, /bg-violet/);
  assert.match(TERMINAL_CARD_STATUS_CLASS.warning, /bg-amber/);
  assert.match(TERMINAL_CARD_STATUS_CLASS.live, /bg-terminal-green/);
  assert.match(TERMINAL_CARD_STATUS_CLASS.live, /animate-pulse/);
});

test("brutalist button sizes cover sm md lg", () => {
  assert.match(BRUTALIST_BUTTON_SIZE_CLASS.sm, /text-xs/);
  assert.match(BRUTALIST_BUTTON_SIZE_CLASS.md, /text-sm/);
  assert.match(BRUTALIST_BUTTON_SIZE_CLASS.lg, /text-base/);
});

test("brutalist button variants keep violet primary and amber invert", () => {
  assert.match(BRUTALIST_BUTTON_VARIANT_CLASS.primary, /bg-violet/);
  assert.match(BRUTALIST_BUTTON_VARIANT_CLASS.secondary, /border-zinc-raw/);
  assert.match(BRUTALIST_BUTTON_VARIANT_CLASS.amber, /bg-amber/);
  assert.match(BRUTALIST_BUTTON_VARIANT_CLASS.ghost, /bg-transparent/);
  assert.match(BRUTALIST_BUTTON_VARIANT_CLASS.danger, /text-red-500/);
});

test("randomHexSnippet is 0x plus eight uppercase hex chars", () => {
  let i = 0;
  const values = [0, 0.5, 0.999, 0.25, 0.75, 0.1, 0.9, 0.4];
  const snippet = randomHexSnippet(() => values[i++] ?? 0);
  assert.match(snippet, /^0x[0-9A-F]{8}$/);
  assert.equal(snippet, "0x08F4C1E6");
});

test("hex stream default tag is the 44.1k telemetry line", () => {
  assert.equal(HEX_STREAM_DEFAULT_TAG, "HEX_FLOW // 44.1KHZ");
});
