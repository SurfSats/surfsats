import { NextResponse } from "next/server";
import { canServeLightning, publicErrorMessage, publicErrorStatus } from "@/lib/alby";
import { hashRef, storyLog } from "@/lib/story-log";
import { settleStoryPayment } from "@/lib/story-payments";
import { storyStoreKind } from "@/lib/story-store";

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
    const result = await settleStoryPayment(paymentHash);
    if (result.paid && !result.line) {
      storyLog("error", "check.paid_without_line", {
        hash: hashRef(paymentHash),
        store: storyStoreKind(),
      });
    }
    return NextResponse.json({
      paid: result.paid,
      line: result.line ?? null,
    });
  } catch (error) {
    storyLog("error", "check.settle_failed", {
      hash: hashRef(paymentHash),
      store: storyStoreKind(),
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
