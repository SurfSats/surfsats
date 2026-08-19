import { NextResponse } from "next/server";
import {
  invoicePaymentHash,
  isAlbyConfigured,
  verifyAlbyWebhook,
  webhookEventType,
  webhookInvoicePayload,
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

  const rawBody = await request.text();
  const verified = verifyAlbyWebhook(rawBody, request.headers);
  if (!verified.ok) {
    return NextResponse.json({ error: "invalid webhook signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const eventType = webhookEventType(body).toLowerCase();
  if (
    eventType &&
    !eventType.includes("incoming") &&
    eventType !== "invoice.settled"
  ) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const invoice = webhookInvoicePayload(body);
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
    return NextResponse.json({ ok: true, paid: false });
  }
}
