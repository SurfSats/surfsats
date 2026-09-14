import { NextResponse } from "next/server";
import { canServeLightning, publicErrorMessage, publicErrorStatus } from "@/lib/alby";
import { hashRef, slabLog } from "@/lib/slab-log";
import { settleSlabPayment } from "@/lib/slab-payments";
import { slabStoreKind } from "@/lib/slab-store";
import { announceSlabTape } from "@/lib/settlement-tape-announce";

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
    const result = await settleSlabPayment(paymentHash);
    if (result.paid && !result.stroke) {
      slabLog("error", "check.paid_without_stroke", {
        hash: hashRef(paymentHash),
        store: slabStoreKind(),
      });
    }
    if (result.stroke) announceSlabTape(result.stroke);
    return NextResponse.json({
      paid: result.paid,
      stroke: result.stroke ?? null,
      cells: result.cells,
      stains: result.stains,
      painted: result.painted,
      height: result.height,
      etch: result.etch ?? null,
    });
  } catch (error) {
    slabLog("error", "check.settle_failed", {
      hash: hashRef(paymentHash),
      store: slabStoreKind(),
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
