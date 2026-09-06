export const ZAP_THREADS_LIMIT = 40;
export const ZAP_THREADS_ZAP_SATS = 21;

export type ZapThreadNote = {
  id: string;
  pubkey: string;
  created_at: number;
  content: string;
  sats: number;
};

export type ZapThreadSource = {
  id: string;
  pubkey: string;
  kind: number;
  created_at: number;
  content: string;
  tags: string[][];
};

export function noteMatchesAnchor(tags: string[][], anchorTag: string) {
  const needle = anchorTag.trim().toLowerCase();
  if (!needle) return false;
  return tags.some(
    (tag) =>
      (tag[0] === "t" || tag[0] === "r") &&
      typeof tag[1] === "string" &&
      tag[1].trim().toLowerCase() === needle,
  );
}

export function zapTargetEventId(tags: string[][]): string | null {
  for (const tag of tags) {
    if (tag[0] === "e" && typeof tag[1] === "string" && tag[1].trim()) {
      return tag[1].trim();
    }
  }
  return null;
}

export function toThreadNote(event: ZapThreadSource): ZapThreadNote | null {
  if (event.kind !== 1 || !event.id) return null;
  return {
    id: event.id,
    pubkey: event.pubkey,
    created_at: event.created_at,
    content: event.content.trim(),
    sats: 0,
  };
}

export function prependThreadNote(
  current: ZapThreadNote[],
  incoming: ZapThreadNote,
  limit = ZAP_THREADS_LIMIT,
): ZapThreadNote[] {
  const existing = current.find((row) => row.id === incoming.id);
  if (existing) {
    return current.map((row) =>
      row.id === incoming.id
        ? { ...row, content: incoming.content || row.content }
        : row,
    );
  }
  return [incoming, ...current]
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, limit);
}

function satsFromZap(zap: ZapThreadSource): number | null {
  if (zap.kind !== 9735) return null;
  const amount = zap.tags.find((tag) => tag[0] === "amount")?.[1];
  const msats = Number(amount);
  if (!Number.isFinite(msats) || msats <= 0) return null;
  return Math.floor(msats / 1000);
}

export function applyZapToNotes(
  notes: ZapThreadNote[],
  zap: ZapThreadSource,
): ZapThreadNote[] {
  const sats = satsFromZap(zap);
  if (!sats || sats <= 0) return notes;
  const target = zapTargetEventId(zap.tags);
  if (!target) return notes;
  let hit = false;
  const next = notes.map((note) => {
    if (note.id !== target) return note;
    hit = true;
    return { ...note, sats: note.sats + sats };
  });
  return hit ? next : notes;
}

export function parseProfileLud16(content: string): string | null {
  try {
    const parsed = JSON.parse(content) as { lud16?: unknown; lud06?: unknown };
    if (typeof parsed.lud16 === "string" && parsed.lud16.includes("@")) {
      return parsed.lud16.trim();
    }
  } catch {
    return null;
  }
  return null;
}
