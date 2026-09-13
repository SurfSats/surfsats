import { NextResponse } from "next/server";
import {
  callsignStoreKind,
  listCallsignEtches,
} from "@/lib/callsign-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const etches = await listCallsignEtches();
    return NextResponse.json(
      { etches },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch {
    console.error("[callsign]", {
      event: "public.read_failed",
      store: callsignStoreKind(),
    });
    return NextResponse.json({ error: "glass unavailable" }, { status: 500 });
  }
}
