import { NextResponse } from "next/server";
import {
  asInvoice,
  invoicePaymentHash,
  isAlbyConfigured,
} from "@/lib/alby";
import { settleGraffitiPayment } from "@/lib/graffiti-payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAlbyConfigured()) {
    return NextResponse.json(
      { error: "lightning is offline right now" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const invoice =
    asInvoice(body) ||
    asInvoice(
      body && typeof body === "object"
        ? (body as { data?: unknown }).data
        : null,
    );
  const paymentHash = invoice ? invoicePaymentHash(invoice) : "";
  if (!paymentHash) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const result = await settleGraffitiPayment(paymentHash);
    return NextResponse.json({
      ok: true,
      paid: result.paid,
      live: Boolean(result.mark),
    });
  } catch {
    // Acknowledge so Alby / Svix does not hammer retries on transient lookup misses.
    return NextResponse.json({ ok: true, paid: false });
  }
}
