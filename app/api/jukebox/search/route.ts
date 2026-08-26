import { NextResponse } from "next/server";
import { fetchJukeboxSearch, sanitizeSearchQuery } from "@/lib/jukebox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("q") ?? "";
  const q = sanitizeSearchQuery(raw);
  if (q.length < 2) {
    return NextResponse.json(
      { results: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const { ok, results } = await fetchJukeboxSearch(q);
  if (!ok) {
    return NextResponse.json(
      { error: "search offline", results: [] },
      {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return NextResponse.json(
    { results },
    {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
      },
    },
  );
}
