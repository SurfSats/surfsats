import { NextResponse } from "next/server";
import { isPlayerId, isTabEndingGame } from "@/lib/tab";
import { tabLog } from "@/lib/tab-log";
import { submitTabScore, tabStoreKind } from "@/lib/tab-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const playerId = String(record.playerId || record.player_id || "").trim();
  const playId = String(record.playId || record.play_id || "").trim();
  const score = Number(record.score);
  const game = String(record.game || "").trim().toLowerCase();

  if (!isPlayerId(playerId)) {
    return NextResponse.json({ error: "missing player" }, { status: 400 });
  }
  if (!Number.isFinite(score) || score < 0) {
    return NextResponse.json({ error: "missing score" }, { status: 400 });
  }
  if (!isTabEndingGame(game)) {
    return NextResponse.json({ error: "unknown ending" }, { status: 400 });
  }

  try {
    const result = await submitTabScore({
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
    tabLog("error", "score.failed", { store: tabStoreKind() });
    return NextResponse.json({ error: "could not save score" }, { status: 500 });
  }
}
