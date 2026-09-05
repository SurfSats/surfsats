import {
  encodeTapeSnapshot,
  encodeTapeSse,
  subscribeTape,
  type TapeEvent,
} from "@/lib/settlement-tape";
import { tapeHistory } from "@/lib/settlement-tape-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      let unsub = () => {};
      let ping: ReturnType<typeof setInterval> | null = null;

      const sendSnapshot = (events: TapeEvent[]) => {
        if (closed) return;
        controller.enqueue(encoder.encode(encodeTapeSnapshot(events)));
      };
      const send = (event: TapeEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(encodeTapeSse(event)));
      };

      const stop = () => {
        if (closed) return;
        closed = true;
        if (ping) clearInterval(ping);
        unsub();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", stop);
      sendSnapshot(await tapeHistory());
      if (closed) return;
      unsub = subscribeTape(send);
      ping = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 15000);
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
