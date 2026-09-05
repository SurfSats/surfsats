export const TAPE_STORAGE_KEY = "surfsats.tape.v1";
export const TAPE_LIMIT = 24;

export type TapeMachine = "graffiti" | "arcade" | "story" | "tab" | "radio";

export type TapeEvent = {
  id: string;
  machine: TapeMachine;
  actor: string;
  text: string;
  createdAt: string;
  href: string;
};

const MACHINES = new Set<TapeMachine>([
  "graffiti",
  "arcade",
  "story",
  "tab",
  "radio",
]);

export function formatTapeActor(alias?: string | null) {
  const next = (alias ?? "").trim();
  return next || "anon";
}

export function clipTapeQuote(text: string, max = 18) {
  const next = text.replace(/\s+/g, " ").trim();
  if (next.length <= max) return next;
  return `${next.slice(0, Math.max(1, max - 1))}…`;
}

export function formatTapeAge(createdAt: string, now = Date.now()) {
  const parsed = new Date(createdAt).getTime();
  if (!Number.isFinite(parsed)) return createdAt;
  const sec = Math.max(0, Math.floor((now - parsed) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}d ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

export function formatTapeLine(event: TapeEvent, now = Date.now()) {
  return `${event.text} • ${formatTapeAge(event.createdAt, now)}`;
}

export function graffitiTapeText(actor: string, mark: string) {
  return `${actor} sprayed '${clipTapeQuote(mark)}' on Graffiti`;
}

export function arcadeTapeText(actor: string, sats = 21) {
  return `${actor} zapped ${sats} sats on Arcade`;
}

export function tabTapeText(actor: string, sats = 21) {
  return `${actor} sat the tab · ${sats} sats`;
}

export function storyTapeText(actor: string, line: number) {
  return `${actor} wrote line ${line} on Story Chain`;
}

export function radioTapeText(actor: string, sats = 21) {
  return `${actor} zapped ${sats} sats on Radio`;
}

export function tapeFromGraffiti(mark: {
  id: string;
  text: string;
  createdAt: string;
  paymentHash?: string;
}): TapeEvent {
  const actor = formatTapeActor(null);
  return {
    id: `graffiti:${mark.paymentHash || mark.id}`,
    machine: "graffiti",
    actor,
    text: graffitiTapeText(actor, mark.text),
    createdAt: mark.createdAt,
    href: "/graffiti",
  };
}

export function tapeFromArcade(grant: {
  paymentHash: string;
  alias: string;
  createdAt: string;
  sats?: number;
}): TapeEvent {
  const actor = formatTapeActor(grant.alias);
  return {
    id: `arcade:${grant.paymentHash}`,
    machine: "arcade",
    actor,
    text: arcadeTapeText(actor, grant.sats ?? 21),
    createdAt: grant.createdAt,
    href: "/arcade",
  };
}

export function tapeFromTab(grant: {
  paymentHash: string;
  alias: string;
  createdAt: string;
  sats?: number;
}): TapeEvent {
  const actor = formatTapeActor(grant.alias);
  return {
    id: `tab:${grant.paymentHash}`,
    machine: "tab",
    actor,
    text: tabTapeText(actor, grant.sats ?? 21),
    createdAt: grant.createdAt,
    href: "/tab",
  };
}

export function tapeFromStory(
  line: {
    id: string;
    alias: string;
    createdAt: string;
    paymentHash?: string;
  },
  lineNo: number,
): TapeEvent {
  const actor = formatTapeActor(line.alias);
  return {
    id: `story:${line.paymentHash || line.id}`,
    machine: "story",
    actor,
    text: storyTapeText(actor, lineNo),
    createdAt: line.createdAt,
    href: "/story",
  };
}

export function tapeFromRadio(pull: {
  id: string;
  createdAt: string;
  paymentHash?: string;
  alias?: string;
  sats?: number;
}): TapeEvent {
  const actor = formatTapeActor(pull.alias);
  return {
    id: `radio:${pull.paymentHash || pull.id}`,
    machine: "radio",
    actor,
    text: radioTapeText(actor, pull.sats ?? 21),
    createdAt: pull.createdAt,
    href: "/music",
  };
}

export const TAPE_SEED: TapeEvent[] = [
  {
    id: "seed-graf",
    machine: "graffiti",
    actor: "anon",
    text: graffitiTapeText("anon", "HOPE"),
    createdAt: "2026-09-05T01:00:00.000Z",
    href: "/graffiti",
  },
  {
    id: "seed-arcade",
    machine: "arcade",
    actor: "PLEBIAN",
    text: arcadeTapeText("PLEBIAN"),
    createdAt: "2026-09-05T01:02:00.000Z",
    href: "/arcade",
  },
  {
    id: "seed-radio",
    machine: "radio",
    actor: "ZOE",
    text: radioTapeText("ZOE"),
    createdAt: "2026-09-05T01:04:00.000Z",
    href: "/music",
  },
];

export function parseTapeEvent(raw: unknown): TapeEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = String(record.id ?? "").trim();
  const machine = String(record.machine ?? "").trim() as TapeMachine;
  const actor = formatTapeActor(String(record.actor ?? ""));
  const text = String(record.text ?? "").trim();
  const createdAt = String(record.createdAt ?? "").trim();
  const href = String(record.href ?? "").trim();
  if (!id || !text || !createdAt || !href) return null;
  if (!MACHINES.has(machine)) return null;
  return { id, machine, actor, text, createdAt, href };
}

export function parseTapeList(raw: unknown): TapeEvent[] {
  if (!Array.isArray(raw)) return [];
  return mergeTapeEvents(
    [],
    raw
      .map(parseTapeEvent)
      .filter((event): event is TapeEvent => Boolean(event)),
  );
}

export function parseTapePayload(raw: unknown): TapeEvent[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return parseTapeList(raw);
  if (typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    if (Array.isArray(record.events)) return parseTapeList(record.events);
    const single = parseTapeEvent(raw);
    if (single) return [single];
  }
  return [];
}

export function mergeTapeEvents(current: TapeEvent[], incoming: TapeEvent[]) {
  const byId = new Map<string, TapeEvent>();
  for (const event of [...current, ...incoming]) {
    if (!event.id) continue;
    byId.set(event.id, event);
  }
  return [...byId.values()]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, TAPE_LIMIT);
}

const seedIds = new Set(TAPE_SEED.map((event) => event.id));

export function isSeedTapeId(id: string) {
  return seedIds.has(id);
}

export function mergeTapeWithFallback(
  current: TapeEvent[],
  incoming: TapeEvent[],
) {
  const hasReal = incoming.some((event) => !isSeedTapeId(event.id));
  const base = hasReal
    ? current.filter((event) => !isSeedTapeId(event.id))
    : current;
  const merged = mergeTapeEvents(base, incoming);
  return merged.length ? merged : TAPE_SEED;
}

export function encodeTapeSse(event: TapeEvent) {
  return `event: tape\ndata: ${JSON.stringify(event)}\n\n`;
}

export function encodeTapeSnapshot(events: TapeEvent[]) {
  return `event: snapshot\ndata: ${JSON.stringify({ events })}\n\n`;
}

type TapeListener = (event: TapeEvent) => void;

const tapeListeners = new Set<TapeListener>();
let tapeBuffer: TapeEvent[] = [];

export function subscribeTape(listener: TapeListener) {
  tapeListeners.add(listener);
  return () => {
    tapeListeners.delete(listener);
  };
}

export function publishTape(event: TapeEvent) {
  const parsed = parseTapeEvent(event);
  if (!parsed) return false;
  const exists = tapeBuffer.some((item) => item.id === parsed.id);
  tapeBuffer = mergeTapeEvents(tapeBuffer, [parsed]);
  if (exists) return false;
  for (const listener of tapeListeners) listener(parsed);
  return true;
}

export function bufferedTape() {
  return tapeBuffer;
}
