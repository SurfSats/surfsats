import assert from "node:assert/strict";
import { test } from "node:test";
import {
  lightningAddressToLnurlp,
  lnurlCallbackUrl,
  parseLnurlInvoice,
  parseLnurlPayRequest,
} from "./lnurl-pay.ts";

test("lightning address maps to lnurlp well-known URL", () => {
  assert.equal(
    lightningAddressToLnurlp("noderunnersradio@getalby.com"),
    "https://getalby.com/.well-known/lnurlp/noderunnersradio",
  );
  assert.equal(lightningAddressToLnurlp("not-an-address"), null);
});

test("lnurl callback includes amount msats within bounds", () => {
  const request = parseLnurlPayRequest({
    tag: "payRequest",
    callback: "https://getalby.com/lnurlp/noderunnersradio/callback",
    minSendable: 1000,
    maxSendable: 21_000_000,
    commentAllowed: 255,
  });
  assert.ok(request);
  const url = lnurlCallbackUrl(request, 21, "SurfSats V4V boost");
  assert.ok(url);
  assert.ok(url.includes("amount=21000"));
  assert.ok(url.includes("comment=SurfSats"));
  assert.equal(lnurlCallbackUrl(request, 0), null);
});

test("maxSendable 0 is treated as unbounded", () => {
  const request = parseLnurlPayRequest({
    tag: "payRequest",
    callback: "https://getalby.com/lnurlp/noderunnersradio/callback",
    minSendable: 1000,
    maxSendable: 0,
    commentAllowed: 0,
  });
  assert.ok(request);
  assert.ok(lnurlCallbackUrl(request, 21));
});

test("parseLnurlInvoice requires a bolt11 pr", () => {
  assert.equal(
    parseLnurlInvoice({ pr: "lnbc21n1abc" }),
    "lnbc21n1abc",
  );
  assert.equal(parseLnurlInvoice({ status: "ERROR", reason: "nope" }), null);
  assert.equal(parseLnurlInvoice({ pr: "not-an-invoice" }), null);
});
