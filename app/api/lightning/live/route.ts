import {
  canServeLightning,
  getAlbyInvoice,
  invoicePaymentHash,
  invoicePreimage,
  isInvoiceSettled,
} from "@/lib/alby";
import { publishSettlement, subscribeSettlement } from "@/lib/lightning-bus";
import {
  encodeSseEvent,
  type SettlementEvent,
} from "@/lib/lightning-live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const paymentHash = (
    searchParams.get("hash") ||
    searchParams.get("payment_hash") ||
    searchParams.get("id") ||
    ""
  ).trim();

  if (!paymentHash) {
    return new Response("missing invoice", { status: 400 });
  }
  if (!canServeLightning()) {
    return new Response("lightning is offline right now", { status: 503 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: SettlementEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(encodeSseEvent(event)));
      };

      const unsub = subscribeSettlement(paymentHash, send);

      async function probe() {
        try {
          const invoice = await getAlbyInvoice(paymentHash);
          if (!isInvoiceSettled(invoice)) return false;
          const event: SettlementEvent = {
            type: "invoice_paid",
            paymentHash: invoicePaymentHash(invoice) || paymentHash,
            preimage: invoicePreimage(invoice),
          };
          publishSettlement(event);
          send(event);
          send({ ...event, type: "settled" });
          return true;
        } catch {
          return false;
        }
      }

      void probe();
      const poll = setInterval(() => {
        void probe().then((done) => {
          if (!done || closed) return;
          closed = true;
          clearInterval(poll);
          unsub();
          controller.close();
        });
      }, 900);

      const ping = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 15000);

      const stop = () => {
        if (closed) return;
        closed = true;
        clearInterval(poll);
        clearInterval(ping);
        unsub();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", stop);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-cache",
      Connection: "keep-alive",
    },
  });
}
