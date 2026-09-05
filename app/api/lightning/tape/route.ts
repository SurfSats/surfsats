import { NextResponse } from "next/server";
import { tapeHistory } from "@/lib/settlement-tape-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const events = await tapeHistory();
  return NextResponse.json(
    { events },
    {
      headers: {
        "Cache-Control": "no-store, no-cache",
      },
    },
  );
}
