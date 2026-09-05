import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSandboxDocumentId, SANDBOX_PRICE_SATS } from "./sandbox.ts";
import {
  DROP_21_DOCUMENT_ID,
  DROP_21_SATS,
  drop21DocumentId,
  drop21Presentation,
  parseDrop21Invoice,
} from "./drop-21.ts";

test("global drop is a 21-sat sandbox document", () => {
  assert.equal(DROP_21_SATS, 21);
  assert.equal(DROP_21_SATS, SANDBOX_PRICE_SATS);
  assert.equal(drop21DocumentId(), "DROP_21_GLOBAL");
  assert.equal(parseSandboxDocumentId(DROP_21_DOCUMENT_ID), "DROP_21_GLOBAL");
});

test("connected wallets zap; disconnected wallets open the QR", () => {
  assert.equal(drop21Presentation(true), "zap");
  assert.equal(drop21Presentation(false), "qr");
});

test("parseDrop21Invoice reads a minted sandbox invoice", () => {
  const parsed = parseDrop21Invoice({
    payment_request: "lnbc21n1mockinvoice",
    payment_hash: "ab".repeat(32),
    amount: 21,
  });
  assert.ok(parsed);
  assert.equal(parsed.bolt11, "lnbc21n1mockinvoice");
  assert.equal(parsed.hash, "ab".repeat(32));
  assert.equal(parsed.amountSats, 21);
});

test("parseDrop21Invoice rejects junk and non-bolt11", () => {
  assert.equal(parseDrop21Invoice(null), null);
  assert.equal(parseDrop21Invoice({ payment_request: "not-ln", payment_hash: "x" }), null);
  assert.equal(
    parseDrop21Invoice({ payment_request: "lnbc21n1ok", payment_hash: "" }),
    null,
  );
});
