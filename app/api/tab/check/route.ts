import { NextResponse } from "next/server";
import {
  canServeLightning,
  publicErrorMessage,
  publicErrorStatus,
} from "@/lib/alby";
import { hashRef, tabLog } from "@/lib/tab-log";
import { settleTabPayment } from "@/lib/tab-payments";
import { tabStoreKind } from "@/lib/tab-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function checkHash(paymentHash: string) {
  if (!paymentHash) {
    return NextResponse.json({ error: "missing invoice" }, { status: 400 });
  }
  if (!canServeLightning()) {
    return NextResponse.json(
      { error: "lightning is offline right now" },
      { status: 503 },
    );
  }

  try {
    const result = await settleTabPayment(paymentHash);
    if (result.paid && !result.ok) {
      tabLog("error", "check.paid_without_credits", {
        hash: hashRef(paymentHash),
        store: tabStoreKind(),
      });
    }
    return NextResponse.json({
      paid: result.paid,
      ok: result.ok,
      credits: result.player?.credits ?? 0,
      alias: result.player?.alias ?? "",
      playerId: result.player?.playerId ?? null,
    });
  } catch (error) {
    tabLog("error", "check.settle_failed", {
      hash: hashRef(paymentHash),
      store: tabStoreKind(),
    });
    return NextResponse.json(
      { error: publicErrorMessage(error), paid: false },
      { status: publicErrorStatus(error) },
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hash =
    searchParams.get("hash") ||
    searchParams.get("payment_hash") ||
    searchParams.get("id") ||
    "";
  return checkHash(hash.trim());
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const hash = String(
    record.hash || record.payment_hash || record.paymentHash || record.id || "",
  ).trim();
  return checkHash(hash);
}
