import { NextResponse } from "next/server";
import { ARCADE_GAME_ID, isPlayerId, normalizePlayGame } from "@/lib/arcade";
import { arcadeLog } from "@/lib/arcade-log";
import { arcadeStoreKind, submitArcadeScore } from "@/lib/arcade-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const playerId = String(record.playerId || record.player_id || "").trim();
  const playId = String(record.playId || record.play_id || "").trim();
  const score = Number(record.score);
  const game = normalizePlayGame(String(record.game || ARCADE_GAME_ID)) || ARCADE_GAME_ID;

  if (!isPlayerId(playerId)) {
    return NextResponse.json({ error: "missing player" }, { status: 400 });
  }
  if (!Number.isFinite(score) || score < 0) {
    return NextResponse.json({ error: "missing score" }, { status: 400 });
  }

  try {
    const result = await submitArcadeScore({
      playerId,
      playId: playId || undefined,
      score,
      game,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    arcadeLog("error", "score.failed", { store: arcadeStoreKind() });
    return NextResponse.json({ error: "could not save score" }, { status: 500 });
  }
}
