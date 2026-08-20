import { NextResponse } from "next/server";
import {
  invoicePaymentHash,
  isAlbyConfigured,
  verifyAlbyWebhook,
  webhookEventType,
  webhookInvoicePayload,
} from "@/lib/alby";
import { graffitiLog, hashRef } from "@/lib/graffiti-log";
import { settleGraffitiPayment } from "@/lib/graffiti-payments";
import { graffitiStoreKind } from "@/lib/graffiti-store";

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
    graffitiLog("warn", "webhook.invalid_signature", {
      store: graffitiStoreKind(),
    });
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
    graffitiLog("info", "webhook.ignored_no_hash", {
      eventType: eventType || "unknown",
    });
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const result = await settleGraffitiPayment(paymentHash);
    if (result.paid && !result.mark) {
      graffitiLog("error", "webhook.paid_without_mark", {
        hash: hashRef(paymentHash),
        store: graffitiStoreKind(),
      });
      return NextResponse.json(
        { ok: false, paid: true, live: false },
        { status: 500 },
      );
    }
    graffitiLog("info", "webhook.settled", {
      hash: hashRef(paymentHash),
      paid: result.paid,
      live: Boolean(result.mark),
      store: graffitiStoreKind(),
    });
    return NextResponse.json({
      ok: true,
      paid: result.paid,
      live: Boolean(result.mark),
    });
  } catch {
    graffitiLog("error", "webhook.settle_failed", {
      hash: hashRef(paymentHash),
      store: graffitiStoreKind(),
    });
    return NextResponse.json({ ok: false, paid: false }, { status: 500 });
  }
}
