import { NextResponse } from "next/server";
import { fetchV4vBolt11 } from "@/lib/v4v-invoice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      amountSats?: unknown;
      lud16?: unknown;
    };
    const amountSats = Number(body.amountSats);
    if (!Number.isFinite(amountSats) || amountSats < 1 || amountSats > 210_000) {
      return NextResponse.json({ error: "bad_amount" }, { status: 400 });
    }
    const lud16 = typeof body.lud16 === "string" ? body.lud16 : null;
    const bolt11 = await fetchV4vBolt11({
      amountSats: Math.floor(amountSats),
      lud16,
    });
    return NextResponse.json({ bolt11, amountSats: Math.floor(amountSats) });
  } catch {
    return NextResponse.json({ error: "lnurl_failed" }, { status: 502 });
  }
}
