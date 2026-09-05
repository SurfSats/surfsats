import { NextResponse } from "next/server";
import {
  canServeLightning,
  publicErrorMessage,
  publicErrorStatus,
} from "@/lib/alby";
import { createTabInvoice, pendingTabFromBody } from "@/lib/tab-payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!canServeLightning()) {
    return NextResponse.json(
      { error: "lightning is offline right now" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const parsed = pendingTabFromBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const invoice = await createTabInvoice(parsed);
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
