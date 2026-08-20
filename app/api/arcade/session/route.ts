import { NextResponse } from "next/server";
import { isPlayerId } from "@/lib/arcade";
import { getArcadePlayer } from "@/lib/arcade-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = (searchParams.get("playerId") || searchParams.get("player") || "").trim();
  if (!isPlayerId(playerId)) {
    return NextResponse.json({ error: "missing player" }, { status: 400 });
  }
  const player = await getArcadePlayer(playerId);
  return NextResponse.json(
    {
      playerId,
      alias: player?.alias ?? "",
      credits: player?.credits ?? 0,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
