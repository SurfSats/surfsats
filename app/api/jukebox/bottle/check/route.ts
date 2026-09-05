import { NextResponse } from "next/server";
import { canServeLightning, publicErrorMessage, publicErrorStatus } from "@/lib/alby";
import { bottleLog, hashRef } from "@/lib/bottle-log";
import { settleBottlePayment } from "@/lib/bottle-payments";
import { bottleStoreKind } from "@/lib/bottle-store";

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
    const result = await settleBottlePayment(paymentHash);
    if (result.paid && !result.pull) {
      bottleLog("error", "check.paid_without_pull", {
        hash: hashRef(paymentHash),
        store: bottleStoreKind(),
      });
    }
    return NextResponse.json({
      paid: result.paid,
      pull: result.pull ?? null,
    });
  } catch (error) {
    bottleLog("error", "check.settle_failed", {
      hash: hashRef(paymentHash),
      store: bottleStoreKind(),
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
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const hash = String(
    record.hash || record.payment_hash || record.paymentHash || record.id || "",
  ).trim();
  return checkHash(hash);
}
