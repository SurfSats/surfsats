export const CALLSIGN_MIN = 2;
export const CALLSIGN_MAX = 16;
export const CALLSIGN_STORAGE_KEY = "surfsats.callsign.v1";

export const CALLSIGN_RESERVED = [
  "ANON",
  "ADMIN",
  "SURFSATS",
  "ROOT",
  "NULL",
  "SYS",
  "TAPE",
  "GLASS",
] as const;

export const CALLSIGN_MACHINES = [
  "graffiti",
  "arcade",
  "story",
  "tab",
  "radio",
  "slab",
  "pleb-box",
] as const;

export type CallsignMachine = (typeof CALLSIGN_MACHINES)[number];

export type GlassCache = {
  callsign: string;
  etched: boolean;
  etchedAt?: string;
  etchHash?: string;
  playerId?: string;
};

export type CallsignEtch = {
  callsign: string;
  firstPaymentHash: string;
  firstMachine: CallsignMachine;
  createdAt: string;
  blockHeight?: number;
  lastSeenAt: string;
  machines: CallsignMachine[];
};

export type CallsignSighting = {
  callsign: string;
  paymentHash: string;
  machine: CallsignMachine;
  at: string;
  blockHeight?: number;
};

const RESERVED = new Set<string>(CALLSIGN_RESERVED);
const MACHINES = new Set<CallsignMachine>(CALLSIGN_MACHINES);

export function isReservedCallsign(raw: string) {
  return RESERVED.has(raw.trim().replace(/\s+/g, "_").toUpperCase());
}

export function isCallsignMachine(value: unknown): value is CallsignMachine {
  return (
    typeof value === "string" && MACHINES.has(value as CallsignMachine)
  );
}

export function sanitizeCallsign(raw: string) {
  const callsign = raw.trim().replace(/\s+/g, "_").toUpperCase();
  if (callsign.length < CALLSIGN_MIN) {
    return { ok: false as const, reason: "callsign too short" };
  }
  if (callsign.length > CALLSIGN_MAX) {
    return { ok: false as const, reason: "callsign too long" };
  }
  if (!/^[A-Z0-9_-]{2,16}$/.test(callsign)) {
    return { ok: false as const, reason: "letters, numbers, _ or -" };
  }
  if (RESERVED.has(callsign)) {
    return { ok: false as const, reason: "reserved" };
  }
  return { ok: true as const, callsign };
}

export function readCallsign(value: unknown) {
  const parsed = sanitizeCallsign(String(value ?? ""));
  return parsed.ok ? parsed.callsign : null;
}

export function glassChipLabel(
  glass: Pick<GlassCache, "callsign" | "etched"> | null,
) {
  const callsign = glass?.callsign?.trim() ?? "";
  if (!callsign) return "CALLSIGN —";
  return glass?.etched ? `${callsign} · ON THE GLASS` : `${callsign} · NOT ETCHED`;
}

export function parseGlassCache(raw: unknown): GlassCache | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const callsign = readCallsign(record.callsign);
  if (!callsign) return null;
  const playerId = String(record.playerId ?? "").trim();
  const etchedAt = String(record.etchedAt ?? "").trim();
  const etchHash = String(record.etchHash ?? "").trim();
  return {
    callsign,
    etched: record.etched === true,
    ...(etchedAt ? { etchedAt } : {}),
    ...(etchHash ? { etchHash } : {}),
    ...(playerId ? { playerId } : {}),
  };
}

export function parseArcadeSession(raw: unknown): {
  playerId?: string;
  alias?: string;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const playerId = String(record.playerId ?? "").trim();
  const alias = readCallsign(record.alias);
  if (!playerId && !alias) return null;
  return {
    ...(playerId ? { playerId } : {}),
    ...(alias ? { alias } : {}),
  };
}

export function migrateGlassFromArcade(
  storedGlass: unknown,
  storedArcade: unknown,
): GlassCache | null {
  const glass = parseGlassCache(storedGlass);
  if (glass) return glass;
  const arcade = parseArcadeSession(storedArcade);
  const callsign = arcade?.alias;
  if (!callsign) return null;
  return {
    callsign,
    etched: false,
    ...(arcade?.playerId ? { playerId: arcade.playerId } : {}),
  };
}

export function mergeCallsignMachines(
  current: readonly CallsignMachine[],
  next: CallsignMachine,
) {
  if (current.includes(next)) return [...current];
  return [...current, next];
}

export function applyCallsignSighting(
  existing: CallsignEtch | null,
  sighting: CallsignSighting,
): CallsignEtch {
  if (!existing) {
    return {
      callsign: sighting.callsign,
      firstPaymentHash: sighting.paymentHash,
      firstMachine: sighting.machine,
      createdAt: sighting.at,
      lastSeenAt: sighting.at,
      machines: [sighting.machine],
      ...(sighting.blockHeight != null
        ? { blockHeight: sighting.blockHeight }
        : {}),
    };
  }
  return {
    ...existing,
    lastSeenAt: sighting.at,
    machines: mergeCallsignMachines(existing.machines, sighting.machine),
  };
}

export function parseCallsignEtch(raw: unknown): CallsignEtch | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const callsign = readCallsign(record.callsign);
  const firstPaymentHash = String(record.firstPaymentHash ?? "").trim();
  const firstMachine = record.firstMachine;
  const createdAt = String(record.createdAt ?? "").trim();
  const lastSeenAt = String(record.lastSeenAt ?? "").trim();
  if (
    !callsign ||
    !firstPaymentHash ||
    !createdAt ||
    !lastSeenAt ||
    !isCallsignMachine(firstMachine)
  ) {
    return null;
  }
  const machines = Array.isArray(record.machines)
    ? record.machines.filter(isCallsignMachine)
    : [];
  if (!machines.includes(firstMachine)) machines.unshift(firstMachine);
  const height = Number(record.blockHeight);
  return {
    callsign,
    firstPaymentHash,
    firstMachine,
    createdAt,
    lastSeenAt,
    machines: machines.length ? machines : [firstMachine],
    ...(Number.isFinite(height) ? { blockHeight: height } : {}),
  };
}

export function nextGlassFromTyping(
  current: GlassCache | null,
  raw: string,
): GlassCache | null {
  const parsed = sanitizeCallsign(raw);
  if (!parsed.ok) {
    if (!raw.trim()) {
      if (!current?.playerId) return null;
      return { callsign: "", etched: false, playerId: current.playerId };
    }
    return current;
  }
  const same = current?.callsign === parsed.callsign;
  return {
    callsign: parsed.callsign,
    etched: Boolean(same && current?.etched),
    ...(same && current?.etchedAt ? { etchedAt: current.etchedAt } : {}),
    ...(same && current?.etchHash ? { etchHash: current.etchHash } : {}),
    ...(current?.playerId ? { playerId: current.playerId } : {}),
  };
}

export function nextGlassFromEtch(
  current: GlassCache | null,
  etch: Pick<CallsignEtch, "callsign" | "firstPaymentHash" | "createdAt">,
): GlassCache {
  return {
    callsign: etch.callsign,
    etched: true,
    etchedAt: etch.createdAt,
    etchHash: etch.firstPaymentHash,
    ...(current?.playerId ? { playerId: current.playerId } : {}),
  };
}
