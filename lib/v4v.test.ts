import assert from "node:assert/strict";
import { test } from "node:test";
import {
  V4V_LN_ADDRESS,
  V4V_PRESETS,
  isV4vPreset,
  v4vRecipient,
} from "./v4v.ts";

test("V4V presets are 21, 100, and 210 sats", () => {
  assert.deepEqual([...V4V_PRESETS], [21, 100, 210]);
  assert.equal(isV4vPreset(21), true);
  assert.equal(isV4vPreset(22), false);
});

test("boosts default to Noderunners Radio lightning address", () => {
  assert.equal(V4V_LN_ADDRESS, "noderunnersradio@getalby.com");
  assert.equal(v4vRecipient(null), V4V_LN_ADDRESS);
  assert.equal(v4vRecipient("dj@wavlake.com"), "dj@wavlake.com");
});
