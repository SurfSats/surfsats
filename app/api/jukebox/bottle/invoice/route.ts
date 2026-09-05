import { NextResponse } from "next/server";
import { canServeLightning, publicErrorMessage, publicErrorStatus } from "@/lib/alby";
import { createBottleInvoice } from "@/lib/bottle-payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!canServeLightning()) {
    return NextResponse.json(
      { error: "lightning is offline right now" },
      { status: 503 },
    );
  }

  try {
    const invoice = await createBottleInvoice();
    return NextResponse.json({
      payment_request: invoice.paymentRequest,
      payment_hash: invoice.paymentHash,
      amount: invoice.amountSats,
      expires_at: invoice.expiresAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error) },
      { status: publicErrorStatus(error) },
    );
  }
}
