export const HYDROGRAPHIC_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
] as const;

export const MAX_HUD_EVENTS = 20;
export const HUD_NOTE_TAGS = ["SurfSats", "Bitcoin", "surfsats", "bitcoin"];

export type NostrHudSource = {
  id: string;
  pubkey: string;
  kind: number;
  created_at: number;
  content: string;
  tags: string[][];
};

export type NostrHudEvent = {
  id: string;
  pubkey: string;
  kind: number;
  created_at: number;
  content: string;
  sats: number | null;
};

function tagValue(tags: string[][], name: string): string | null {
  for (const tag of tags) {
    if (tag[0] === name && typeof tag[1] === "string" && tag[1].trim()) {
      return tag[1];
    }
  }
  return null;
}

function millisatsToSats(value: unknown): number | null {
  const raw =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : NaN;
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return Math.floor(raw / 1000);
}

export function satsFromBolt11(invoice: string): number | null {
  const match = invoice.trim().toLowerCase().match(/^lnbc(\d+)([munp]?)/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = match[2];
  if (unit === "m") return amount * 100_000;
  if (unit === "u") return amount * 100;
  if (unit === "n") return Math.floor(amount / 10);
  if (unit === "p") return Math.floor(amount / 10_000);
  return amount * 100_000_000;
}

export function parseZapSats(event: {
  kind: number;
  tags: string[][];
  content: string;
}): number | null {
  if (event.kind !== 9735) return null;

  const fromTag = millisatsToSats(tagValue(event.tags, "amount"));
  if (fromTag && fromTag > 0) return fromTag;

  const bolt11 = tagValue(event.tags, "bolt11");
  if (bolt11) {
    const fromInvoice = satsFromBolt11(bolt11);
    if (fromInvoice && fromInvoice > 0) return fromInvoice;
  }

  const description = tagValue(event.tags, "description");
  if (!description) return null;
  try {
    const parsed: unknown = JSON.parse(description);
    if (parsed && typeof parsed === "object" && "amount" in parsed) {
      return millisatsToSats(parsed.amount);
    }
  } catch {
    return null;
  }
  return null;
}

export function truncatePubkey(pubkey: string): string {
  if (pubkey.length < 13) return pubkey;
  return `${pubkey.slice(0, 8)}...${pubkey.slice(-4)}`;
}

export function toHudEvent(event: NostrHudSource): NostrHudEvent {
  return {
    id: event.id,
    pubkey: event.pubkey,
    kind: event.kind,
    created_at: event.created_at,
    content: event.content.trim(),
    sats: parseZapSats(event),
  };
}

export function formatHudTime(createdAt: number): string {
  const ms = createdAt * 1000;
  if (!Number.isFinite(ms) || ms <= 0) return "--:--:--";
  return new Date(ms).toLocaleTimeString();
}

export function prependHudEvent(
  current: NostrHudEvent[],
  incoming: NostrHudEvent,
  limit = MAX_HUD_EVENTS,
): NostrHudEvent[] {
  if (current.some((item) => item.id === incoming.id)) return current;
  return [incoming, ...current].slice(0, limit);
}

export function onlineRelaysFromStatus(
  status: Iterable<[string, boolean]>,
): string[] {
  const online: string[] = [];
  for (const [url, ok] of status) {
    if (ok) online.push(url);
  }
  return online;
}

export function uniqueRelayUrls(urls: readonly string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const url of urls) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    next.push(url);
  }
  return next;
}

/** Prefer sockets the pool reports as open. If that map is empty or all-false while events are already landing, keep the traffic-proven URLs so the HUD does not flash 0_RELAYS_ONLINE. */
export function nextHandshakeRelays(
  status: Iterable<[string, boolean]>,
  traffic: readonly string[],
): string[] {
  const online = onlineRelaysFromStatus(status);
  if (online.length > 0) return online;
  return uniqueRelayUrls(traffic);
}

export function shouldPlayZapLatch(input: {
  live: boolean;
  paused: boolean;
  kind: number;
  sats: number | null;
}): boolean {
  return (
    input.live &&
    !input.paused &&
    input.kind === 9735 &&
    typeof input.sats === "number" &&
    input.sats > 0
  );
}
