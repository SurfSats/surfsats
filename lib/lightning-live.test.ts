import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isSettlementEventName,
  parseSettlementPayload,
} from "./lightning-live.ts";

test("isSettlementEventName accepts invoice_paid and settled", () => {
  assert.equal(isSettlementEventName("invoice_paid"), true);
  assert.equal(isSettlementEventName("settled"), true);
  assert.equal(isSettlementEventName("invoice.settled"), true);
  assert.equal(isSettlementEventName("INVOICE_PAID"), true);
  assert.equal(isSettlementEventName("ping"), false);
});

test("parseSettlementPayload reads a flat invoice_paid message", () => {
  const event = parseSettlementPayload({
    type: "invoice_paid",
    payment_hash: "abc123",
    preimage: "deadbeef",
  });
  assert.ok(event);
  assert.equal(event.type, "invoice_paid");
  assert.equal(event.paymentHash, "abc123");
  assert.equal(event.preimage, "deadbeef");
});

test("parseSettlementPayload reads nested settled payloads", () => {
  const event = parseSettlementPayload({
    event: "settled",
    data: {
      paymentHash: "fff",
      payment_preimage: "aa",
    },
  });
  assert.ok(event);
  assert.equal(event.type, "settled");
  assert.equal(event.paymentHash, "fff");
  assert.equal(event.preimage, "aa");
});

test("parseSettlementPayload reads an invoice object", () => {
  const event = parseSettlementPayload({
    type: "invoice.settled",
    invoice: {
      payment_hash: "hash1",
      r_preimage: "pre1",
      settled: true,
    },
  });
  assert.ok(event);
  assert.equal(event.paymentHash, "hash1");
  assert.equal(event.preimage, "pre1");
});

test("parseSettlementPayload ignores unrelated traffic", () => {
  assert.equal(parseSettlementPayload(null), null);
  assert.equal(parseSettlementPayload({ type: "pong" }), null);
  assert.equal(
    parseSettlementPayload({ type: "invoice_paid", payment_hash: "" }),
    null,
  );
});
