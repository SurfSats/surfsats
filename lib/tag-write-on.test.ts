import assert from "node:assert/strict";
import { test } from "node:test";
import {
  TAG_WRITE_ON_FROM,
  TAG_WRITE_ON_MS,
  TAG_WRITE_ON_TO,
  shouldWriteOnTag,
  tagWriteOnMotion,
} from "./tag-write-on.ts";

test("only the fresh mark writes on", () => {
  assert.equal(
    shouldWriteOnTag({ markId: "a", freshId: "a" }),
    true,
  );
  assert.equal(
    shouldWriteOnTag({ markId: "a", freshId: "b" }),
    false,
  );
  assert.equal(
    shouldWriteOnTag({ markId: "a", freshId: null }),
    false,
  );
});

test("write-on is a one-shot clip reveal, 400–700ms, no loop", () => {
  const motion = tagWriteOnMotion({ reducedMotion: false });
  assert.equal(motion.kind, "clip");
  if (motion.kind !== "clip") return;
  assert.equal(TAG_WRITE_ON_MS >= 400, true);
  assert.equal(TAG_WRITE_ON_MS <= 700, true);
  assert.equal(motion.duration, TAG_WRITE_ON_MS);
  assert.equal(motion.loop, false);
  assert.equal(TAG_WRITE_ON_FROM, "inset(0 100% 0 0)");
  assert.equal(TAG_WRITE_ON_TO, "inset(0 0% 0 0)");
  assert.deepEqual(motion.clipPath, [TAG_WRITE_ON_FROM, TAG_WRITE_ON_TO]);
});

test("reduced motion leaves the tag sitting there", () => {
  const motion = tagWriteOnMotion({ reducedMotion: true });
  assert.equal(motion.kind, "instant");
  if (motion.kind !== "instant") return;
  assert.equal("clipPath" in motion, false);
  assert.equal("duration" in motion, false);
});
