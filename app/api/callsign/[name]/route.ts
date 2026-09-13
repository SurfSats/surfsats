import { NextResponse } from "next/server";
import { sanitizeCallsign } from "@/lib/callsign";
import { getCallsignEtch } from "@/lib/callsign-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const { name: raw } = await context.params;
  const parsed = sanitizeCallsign(decodeURIComponent(raw || ""));
  if (!parsed.ok) {
    return NextResponse.json({ error: "not on the glass" }, { status: 404 });
  }
  try {
    const etch = await getCallsignEtch(parsed.callsign);
    if (!etch) {
      return NextResponse.json({ error: "not on the glass" }, { status: 404 });
    }
    return NextResponse.json(
      { etch },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "glass unavailable" }, { status: 500 });
  }
}
