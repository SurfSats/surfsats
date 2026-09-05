import assert from "node:assert/strict";
import { test } from "node:test";
import { SFX_MUTE_KEY, isSfxMuted, setSfxMuted } from "./sfx.ts";

function memoryStorage(start: Record<string, string> = {}) {
  const data = { ...start };
  return {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
  };
}

test("sfx is on by default", () => {
  assert.equal(isSfxMuted(memoryStorage()), false);
});

test("sfx mute persists on the storage key", () => {
  const storage = memoryStorage();
  setSfxMuted(true, storage);
  assert.equal(storage.getItem(SFX_MUTE_KEY), "1");
  assert.equal(isSfxMuted(storage), true);
  setSfxMuted(false, storage);
  assert.equal(isSfxMuted(storage), false);
});
