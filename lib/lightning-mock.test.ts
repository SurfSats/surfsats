import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MOCK_SETTLE_MS,
  canServeLightning,
  createMockInvoice,
  getMockInvoice,
  isMockPaymentHash,
  lightningMode,
} from "./lightning-mock.ts";

test("lightningMode is mock in development without a token", () => {
  assert.equal(
    lightningMode({ NODE_ENV: "development" }),
    "mock",
  );
});

test("lightningMode is alby when a token is set", () => {
  assert.equal(
    lightningMode({
      NODE_ENV: "development",
      ALBY_ACCESS_TOKEN: "secret",
    }),
    "alby",
  );
});

test("lightningMode is offline in production without a token", () => {
  assert.equal(lightningMode({ NODE_ENV: "production" }), "offline");
  assert.equal(canServeLightning({ NODE_ENV: "production" }), false);
  assert.equal(canServeLightning({ NODE_ENV: "development" }), true);
});

test("createMockInvoice returns a live BOLT11 and hash", () => {
  const invoice = createMockInvoice({
    amountSats: 21,
    description: "SurfSats Graffiti",
  });
  assert.ok(invoice.payment_request);
  assert.ok(invoice.payment_request.toLowerCase().startsWith("ln"));
  assert.ok(invoice.payment_request.length >= 80);
  assert.ok(invoice.payment_hash);
  assert.equal(isMockPaymentHash(invoice.payment_hash), true);
  assert.equal(invoice.amount, 21);
  assert.equal(invoice.settled, false);
});

test("getMockInvoice stays open, then settles after the delay", () => {
  const created = Date.parse("2026-09-05T12:00:00Z");
  const invoice = createMockInvoice({
    amountSats: 21,
    description: "SurfSats Graffiti",
    now: created,
  });
  const hash = invoice.payment_hash as string;

  const open = getMockInvoice(hash, { now: created + 1000 });
  assert.ok(open);
  assert.equal(open.settled, false);

  const paid = getMockInvoice(hash, {
    now: created + MOCK_SETTLE_MS,
  });
  assert.ok(paid);
  assert.equal(paid.settled, true);
  assert.equal(String(paid.state).toUpperCase(), "SETTLED");
  assert.equal(paid.amount, 21);
});

test("getMockInvoice recovers a restarted mock hash as settled", () => {
  const hash = "devmock00000015" + "ab".repeat(16);
  const recovered = getMockInvoice(hash, { now: Date.now() });
  assert.ok(recovered);
  assert.equal(recovered.settled, true);
  assert.equal(recovered.amount, 21);
});
