import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyBitcoinConnectProvider,
  bitcoinConnectInit,
} from "./bitcoin-connect.ts";
import { isWebLnAvailable, type WebLnHost, type WebLnProvider } from "./webln.ts";

function fakeProvider(): WebLnProvider {
  return {
    enable: async () => {},
    sendPayment: async () => ({ preimage: "aa" }),
  };
}

test("bitcoinConnectInit names the app SurfSats and hides balance", () => {
  assert.equal(bitcoinConnectInit.appName, "SurfSats");
  assert.equal(bitcoinConnectInit.showBalance, false);
});

test("applyBitcoinConnectProvider attaches a wallet to the host", () => {
  const host: WebLnHost = {};
  applyBitcoinConnectProvider({ host, provider: fakeProvider() });
  assert.equal(isWebLnAvailable(host), true);
});

test("applyBitcoinConnectProvider clears the host on disconnect", () => {
  const host: WebLnHost = { webln: fakeProvider() };
  applyBitcoinConnectProvider({ host, provider: null });
  assert.equal(isWebLnAvailable(host), false);
});

test("applyBitcoinConnectProvider announces webln:ready on the target", () => {
  const host: WebLnHost = {};
  const seen: string[] = [];
  const announce = {
    dispatchEvent(event: Event) {
      seen.push(event.type);
      return true;
    },
  };
  applyBitcoinConnectProvider({
    host,
    provider: fakeProvider(),
    announce,
  });
  assert.deepEqual(seen, ["webln:ready"]);
});

test("applyBitcoinConnectProvider ignores a non-provider payload", () => {
  const host: WebLnHost = {};
  applyBitcoinConnectProvider({ host, provider: { nope: true } });
  assert.equal(isWebLnAvailable(host), false);
});
