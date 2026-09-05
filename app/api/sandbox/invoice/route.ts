import { NextResponse } from "next/server";
import {
  canServeLightning,
  publicErrorMessage,
  publicErrorStatus,
} from "@/lib/alby";
import {
  SANDBOX_DEFAULT_DOCUMENT_ID,
  parseSandboxDocumentId,
} from "@/lib/sandbox";
import { createSandboxInvoice } from "@/lib/sandbox-payments";

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
    body = {};
  }

  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const documentId = parseSandboxDocumentId(
    record.documentId ?? SANDBOX_DEFAULT_DOCUMENT_ID,
  );

  if (!documentId) {
    return NextResponse.json({ error: "invalid document" }, { status: 400 });
  }

  try {
    const invoice = await createSandboxInvoice(documentId);
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
