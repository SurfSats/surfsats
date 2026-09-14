import { NextResponse } from "next/server";
import { slabLog } from "@/lib/slab-log";
import { getSlabBoard, slabStoreKind } from "@/lib/slab-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const board = await getSlabBoard();
    return NextResponse.json(
      {
        cells: board.live,
        stains: board.stains,
        height: board.height,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch {
    slabLog("error", "public.read_failed", {
      store: slabStoreKind(),
    });
    return NextResponse.json({ error: "slab unavailable" }, { status: 500 });
  }
}
