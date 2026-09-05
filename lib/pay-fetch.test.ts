import assert from "node:assert/strict";
import { test } from "node:test";
import { payFetch } from "./pay-fetch.ts";

test("payFetch logs status and error body on a failed response", async () => {
  const logged: unknown[][] = [];
  const originalError = console.error;
  const originalFetch = globalThis.fetch;
  console.error = (...args: unknown[]) => {
    logged.push(args);
  };
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: "lightning is offline right now" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  try {
    const response = await payFetch("/api/lightning/invoice", {
      method: "POST",
    });
    assert.equal(response.status, 503);
    assert.equal(logged.length, 1);
    assert.equal(logged[0][0], "[lightning] POST /api/lightning/invoice failed");
    assert.deepEqual(logged[0][1], {
      status: 503,
      error: "lightning is offline right now",
    });
  } finally {
    console.error = originalError;
    globalThis.fetch = originalFetch;
  }
});
