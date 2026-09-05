import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isWebLnAvailable,
  isWebLnRejection,
  payWithWebLn,
  weblnToastMessage,
  type WebLnHost,
} from "./webln.ts";

function hostWith(
  webln: WebLnHost["webln"],
): WebLnHost {
  return { webln };
}

test("isWebLnAvailable is false without a provider", () => {
  assert.equal(isWebLnAvailable(undefined), false);
  assert.equal(isWebLnAvailable({}), false);
  assert.equal(isWebLnAvailable({ webln: undefined }), false);
});

test("isWebLnAvailable is true when window.webln exists", () => {
  assert.equal(
    isWebLnAvailable(
      hostWith({
        enable: async () => {},
        sendPayment: async () => ({ preimage: "aa" }),
      }),
    ),
    true,
  );
});

test("payWithWebLn fails cleanly when WebLN is missing", async () => {
  const result = await payWithWebLn({ host: {}, invoice: "lnbc1abc" });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("expected miss");
  assert.equal(result.reason, "missing");
  assert.equal(weblnToastMessage(result), "No WebLN wallet");
});

test("payWithWebLn enables the provider then sendPayment", async () => {
  const calls: string[] = [];
  const result = await payWithWebLn({
    host: hostWith({
      enable: async () => {
        calls.push("enable");
      },
      sendPayment: async (bolt11) => {
        calls.push(`pay:${bolt11}`);
        return { preimage: "deadbeef" };
      },
    }),
    invoice: "lnbc1testinvoice",
  });
  assert.deepEqual(calls, ["enable", "pay:lnbc1testinvoice"]);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("expected pay");
  assert.equal(result.preimage, "deadbeef");
});

test("payWithWebLn treats user denial as rejected", async () => {
  const result = await payWithWebLn({
    host: hostWith({
      enable: async () => {
        throw new Error("User rejected");
      },
      sendPayment: async () => ({ preimage: "" }),
    }),
    invoice: "lnbc1abc",
  });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("expected reject");
  assert.equal(result.reason, "rejected");
  assert.equal(weblnToastMessage(result), "Zap cancelled");
});

test("payWithWebLn treats sendPayment cancel as rejected", async () => {
  const result = await payWithWebLn({
    host: hostWith({
      enable: async () => {},
      sendPayment: async () => {
        throw new Error("Payment cancelled by user");
      },
    }),
    invoice: "lnbc1abc",
  });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("expected reject");
  assert.equal(result.reason, "rejected");
  assert.equal(weblnToastMessage(result), "Zap cancelled");
});

test("payWithWebLn maps other wallet errors to failed", async () => {
  const result = await payWithWebLn({
    host: hostWith({
      enable: async () => {},
      sendPayment: async () => {
        throw new Error("insufficient balance");
      },
    }),
    invoice: "lnbc1abc",
  });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("expected fail");
  assert.equal(result.reason, "failed");
  assert.equal(weblnToastMessage(result), "Wallet could not send the zap");
});

test("isWebLnRejection catches wallet denial shapes", () => {
  assert.equal(isWebLnRejection(new Error("User denied")), true);
  assert.equal(isWebLnRejection({ message: "cancelled", code: 4001 }), true);
  assert.equal(isWebLnRejection(new Error("insufficient balance")), false);
  assert.equal(isWebLnRejection("nope"), false);
});
