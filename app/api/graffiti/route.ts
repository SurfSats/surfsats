import { NextResponse } from "next/server";
import { graffitiLog } from "@/lib/graffiti-log";
import { getPaidMarks, graffitiStoreKind } from "@/lib/graffiti-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const marks = await getPaidMarks();
    return NextResponse.json(
      { marks },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch {
    graffitiLog("error", "public.read_failed", {
      store: graffitiStoreKind(),
    });
    return NextResponse.json({ error: "wall unavailable" }, { status: 500 });
  }
}
