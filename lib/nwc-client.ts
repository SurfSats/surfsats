import { SimplePool, getPublicKey, nip04, nip47, type Event } from "nostr-tools";
import {
  payWithNWC,
  type NwcEvent,
  type NwcPayResult,
  type NwcTransport,
} from "./nwc";
import { playMechanicalLatch } from "./sound";

export async function payInvoiceWithLiveNwc(invoice: string): Promise<NwcPayResult> {
  const pool = new SimplePool({
    enableReconnect: true,
    enablePing: true,
  });
  pool.idleTimeout = 0;
  pool.maxWaitForConnection = 8000;

  const transport: NwcTransport = {
    getPublicKey,
    makeRequest: (pubkey, secretKey, inv) =>
      nip47.makeNwcRequestEvent(pubkey, secretKey, inv),
    publish: async (relays, event) => {
      await Promise.any(pool.publish(relays, event as Event));
    },
    subscribe: (relays, filter, handlers) => {
      const sub = pool.subscribeMany(relays, filter, {
        onevent(event) {
          handlers.onevent(event as NwcEvent);
        },
      });
      return {
        close: () => {
          sub.close();
        },
      };
    },
    decrypt: (secret, walletPubkey, content) =>
      nip04.decrypt(secret, walletPubkey, content),
    latch: playMechanicalLatch,
  };

  try {
    return await payWithNWC(invoice, transport);
  } finally {
    pool.destroy();
  }
}
