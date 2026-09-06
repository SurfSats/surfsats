import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyZapToNotes,
  noteMatchesAnchor,
  parseProfileLud16,
  prependThreadNote,
  toThreadNote,
  zapTargetEventId,
} from "./zap-threads.ts";

const note = {
  id: "note1",
  pubkey: "pk1",
  kind: 1,
  created_at: 10,
  content: "dispatch",
  tags: [
    ["t", "surfsats_dispatches"],
    ["r", "surfsats_dispatches"],
  ],
};

test("notes match #t or #r anchor tags", () => {
  assert.equal(noteMatchesAnchor(note.tags, "surfsats_dispatches"), true);
  assert.equal(noteMatchesAnchor(note.tags, "surfsats_story_chain"), false);
});

test("zaps add real sats onto the tagged note", () => {
  const thread = prependThreadNote([], toThreadNote(note)!);
  const zapped = applyZapToNotes(thread, {
    id: "zap1",
    pubkey: "zapper",
    kind: 9735,
    created_at: 11,
    content: "",
    tags: [
      ["e", "note1"],
      ["amount", "21000"],
    ],
  });
  assert.equal(zapped[0].sats, 21);
  assert.equal(zapTargetEventId([["e", "note1"]]), "note1");
});

test("unrelated zaps do not mint a note", () => {
  const thread = prependThreadNote([], toThreadNote(note)!);
  const next = applyZapToNotes(thread, {
    id: "zap2",
    pubkey: "zapper",
    kind: 9735,
    created_at: 11,
    content: "",
    tags: [
      ["e", "other"],
      ["amount", "21000"],
    ],
  });
  assert.equal(next[0].sats, 0);
});

test("profile lud16 is read from kind 0 JSON", () => {
  assert.equal(
    parseProfileLud16(JSON.stringify({ lud16: "radio@getalby.com" })),
    "radio@getalby.com",
  );
  assert.equal(parseProfileLud16("not-json"), null);
});
