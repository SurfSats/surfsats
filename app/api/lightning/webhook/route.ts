import { NextResponse } from "next/server";
import {
  invoicePaymentHash,
  isAlbyConfigured,
  verifyAlbyWebhook,
  webhookEventType,
  webhookInvoicePayload,
} from "@/lib/alby";
import { arcadeLog } from "@/lib/arcade-log";
import { settleArcadePayment } from "@/lib/arcade-payments";
import { arcadeStoreKind } from "@/lib/arcade-store";
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
    const graffiti = await settleGraffitiPayment(paymentHash);
    if (graffiti.mark) {
      graffitiLog("info", "webhook.settled", {
        hash: hashRef(paymentHash),
        paid: true,
        live: true,
        kind: "graffiti",
        store: graffitiStoreKind(),
      });
      return NextResponse.json({
        ok: true,
        paid: true,
        live: true,
        kind: "graffiti",
      });
    }

    const arcade = await settleArcadePayment(paymentHash);
    if (arcade.ok) {
      arcadeLog("info", "webhook.settled", {
        hash: hashRef(paymentHash),
        paid: true,
        live: true,
        kind: "arcade",
        store: arcadeStoreKind(),
      });
      return NextResponse.json({
        ok: true,
        paid: true,
        live: true,
        kind: "arcade",
      });
    }

    if (graffiti.paid || arcade.paid) {
      graffitiLog("error", "webhook.paid_without_claim", {
        hash: hashRef(paymentHash),
        graffiti: Boolean(graffiti.paid),
        arcade: Boolean(arcade.paid),
      });
      return NextResponse.json(
        { ok: false, paid: true, live: false },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      paid: false,
      live: false,
    });
  } catch {
    graffitiLog("error", "webhook.settle_failed", {
      hash: hashRef(paymentHash),
      store: graffitiStoreKind(),
    });
    return NextResponse.json({ ok: false, paid: false }, { status: 500 });
  }
}
