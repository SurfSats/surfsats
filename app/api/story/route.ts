import { NextResponse } from "next/server";
import { storyLog } from "@/lib/story-log";
import { getStoryLines, storyStoreKind } from "@/lib/story-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const lines = await getStoryLines();
    return NextResponse.json(
      { lines },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch {
    storyLog("error", "public.read_failed", {
      store: storyStoreKind(),
    });
    return NextResponse.json({ error: "book unavailable" }, { status: 500 });
  }
}
