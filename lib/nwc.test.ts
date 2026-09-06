import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NWC_STORAGE_KEY,
  clearNwcUri,
  extractPreimage,
  hexToBytes,
  isValidNwcUri,
  loadNwcUri,
  nwcIsConnected,
  parseNwcUri,
  payWithNWC,
  saveNwcUri,
  type NwcEvent,
  type NwcTransport,
} from "./nwc.ts";

const SECRET = "ab".repeat(32);
const PUBKEY = "cd".repeat(32);
const PREIMAGE = "ef".repeat(32);
const URI = `nostr+walletconnect://${PUBKEY}?relay=wss://relay.damus.io&secret=${SECRET}&lud16=radio@getalby.com`;

function memory() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

test("parseNwcUri reads pubkey, relay, secret, and lud16", () => {
  const parsed = parseNwcUri(URI);
  assert.ok(parsed);
  assert.equal(parsed.pubkey, PUBKEY);
  assert.deepEqual(parsed.relays, ["wss://relay.damus.io"]);
  assert.equal(parsed.secret, SECRET);
  assert.equal(parsed.lud16, "radio@getalby.com");
  assert.equal(isValidNwcUri(URI), true);
});

test("parseNwcUri rejects missing secret or relay", () => {
  assert.equal(
    parseNwcUri(`nostr+walletconnect://${PUBKEY}?secret=${SECRET}`),
    null,
  );
  assert.equal(
    parseNwcUri(`nostr+walletconnect://${PUBKEY}?relay=wss://relay.damus.io`),
    null,
  );
  assert.equal(isValidNwcUri("nostr+walletconnect://not-hex"), false);
});

test("persist connection string under surfsats_nwc_secret", () => {
  const storage = memory();
  assert.equal(saveNwcUri(URI, storage), true);
  assert.equal(storage.getItem(NWC_STORAGE_KEY), URI);
  assert.equal(loadNwcUri(storage), URI);
  assert.equal(nwcIsConnected(storage), true);
  clearNwcUri(storage);
  assert.equal(loadNwcUri(storage), "");
  assert.equal(nwcIsConnected(storage), false);
});

test("extractPreimage requires a 64-char hex result", () => {
  assert.equal(
    extractPreimage(JSON.stringify({ result: { preimage: PREIMAGE } })),
    PREIMAGE,
  );
  assert.equal(
    extractPreimage(JSON.stringify({ error: { message: "no_route" } })),
    null,
  );
  assert.equal(
    extractPreimage(JSON.stringify({ result: { preimage: "short" } })),
    null,
  );
});

test("payWithNWC latches only after a decrypted preimage", async () => {
  let latched = 0;
  const request: NwcEvent = {
    id: "req1",
    pubkey: "aa".repeat(32),
    kind: 23194,
    created_at: 1,
    content: "enc",
    tags: [["p", PUBKEY]],
    sig: "00",
  };
  const transport: NwcTransport = {
    loadUri: () => URI,
    getPublicKey: () => "11".repeat(32),
    makeRequest: async () => request,
    publish: async () => {},
    subscribe: (_relays, filter, handlers) => {
      assert.deepEqual(filter["#e"], ["req1"]);
      queueMicrotask(() => {
        handlers.onevent({
          id: "res1",
          pubkey: PUBKEY,
          kind: 23195,
          created_at: 2,
          content: "cipher",
          tags: [],
          sig: "00",
        });
      });
      return { close() {} };
    },
    decrypt: () => JSON.stringify({ result: { preimage: PREIMAGE } }),
    latch: () => {
      latched += 1;
    },
    timeoutMs: 1000,
  };

  const paid = await payWithNWC("lnbc21n1abc", transport);
  assert.equal(paid.preimage, PREIMAGE);
  assert.equal(latched, 1);
});

test("payWithNWC does not latch on wallet error", async () => {
  let latched = 0;
  const transport: NwcTransport = {
    loadUri: () => URI,
    getPublicKey: () => "11".repeat(32),
    makeRequest: async () => ({
      id: "req2",
      pubkey: "aa".repeat(32),
      kind: 23194,
      created_at: 1,
      content: "enc",
      tags: [],
      sig: "00",
    }),
    publish: async () => {},
    subscribe: (_relays, _filter, handlers) => {
      queueMicrotask(() => {
        handlers.onevent({
          id: "res2",
          pubkey: PUBKEY,
          kind: 23195,
          created_at: 2,
          content: "cipher",
          tags: [],
          sig: "00",
        });
      });
      return { close() {} };
    },
    decrypt: () => JSON.stringify({ error: { message: "insufficient_balance" } }),
    latch: () => {
      latched += 1;
    },
    timeoutMs: 1000,
  };

  await assert.rejects(() => payWithNWC("lnbc21n1abc", transport), /failed/i);
  assert.equal(latched, 0);
});

test("hexToBytes is 32 bytes for a 64-char secret", () => {
  assert.equal(hexToBytes(SECRET).length, 32);
});
