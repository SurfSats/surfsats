import { NextResponse } from "next/server";
import {
  invoicePaymentHash,
  invoicePreimage,
  isAlbyConfigured,
  verifyAlbyWebhook,
  webhookEventType,
  webhookInvoicePayload,
} from "@/lib/alby";
import { publishSettlement } from "@/lib/lightning-bus";
import {
  announceArcadeTape,
  announceGraffitiTape,
  announceRadioTape,
  announceStoryTape,
  announceTabTape,
} from "@/lib/settlement-tape-announce";
import { arcadeLog } from "@/lib/arcade-log";
import { settleArcadePayment } from "@/lib/arcade-payments";
import { arcadeStoreKind } from "@/lib/arcade-store";
import { graffitiLog, hashRef } from "@/lib/graffiti-log";
import { settleGraffitiPayment } from "@/lib/graffiti-payments";
import { graffitiStoreKind } from "@/lib/graffiti-store";
import { bottleLog } from "@/lib/bottle-log";
import { settleBottlePayment } from "@/lib/bottle-payments";
import { bottleStoreKind } from "@/lib/bottle-store";
import { storyLog } from "@/lib/story-log";
import { settleStoryPayment } from "@/lib/story-payments";
import { storyStoreKind } from "@/lib/story-store";
import { tabLog } from "@/lib/tab-log";
import { settleTabPayment } from "@/lib/tab-payments";
import { tabStoreKind } from "@/lib/tab-store";

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
  if (paymentHash) {
    const preimage = invoice ? invoicePreimage(invoice) : "";
    publishSettlement({
      type: "invoice_paid",
      paymentHash,
      preimage,
    });
  }
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
      announceGraffitiTape(graffiti.mark);
      return NextResponse.json({
        ok: true,
        paid: true,
        live: true,
        kind: "graffiti",
      });
    }

    const tab = await settleTabPayment(paymentHash);
    if (tab.ok) {
      tabLog("info", "webhook.settled", {
        hash: hashRef(paymentHash),
        paid: true,
        live: true,
        kind: "tab",
        store: tabStoreKind(),
      });
      announceTabTape({
        paymentHash,
        alias: tab.player?.alias ?? "anon",
      });
      return NextResponse.json({
        ok: true,
        paid: true,
        live: true,
        kind: "tab",
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
      announceArcadeTape({
        paymentHash,
        alias: arcade.player?.alias ?? "anon",
      });
      return NextResponse.json({
        ok: true,
        paid: true,
        live: true,
        kind: "arcade",
      });
    }

    const story = await settleStoryPayment(paymentHash);
    if (story.line) {
      storyLog("info", "webhook.settled", {
        hash: hashRef(paymentHash),
        paid: true,
        live: true,
        kind: "story",
        store: storyStoreKind(),
      });
      await announceStoryTape(story.line);
      return NextResponse.json({
        ok: true,
        paid: true,
        live: true,
        kind: "story",
      });
    }

    const bottle = await settleBottlePayment(paymentHash);
    if (bottle.pull) {
      bottleLog("info", "webhook.settled", {
        hash: hashRef(paymentHash),
        paid: true,
        live: true,
        kind: "bottle",
        store: bottleStoreKind(),
      });
      announceRadioTape(bottle.pull);
      return NextResponse.json({
        ok: true,
        paid: true,
        live: true,
        kind: "bottle",
      });
    }

    if (graffiti.paid || tab.paid || arcade.paid || story.paid || bottle.paid) {
      graffitiLog("error", "webhook.paid_without_claim", {
        hash: hashRef(paymentHash),
        graffiti: Boolean(graffiti.paid),
        tab: Boolean(tab.paid),
        arcade: Boolean(arcade.paid),
        story: Boolean(story.paid),
        bottle: Boolean(bottle.paid),
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
