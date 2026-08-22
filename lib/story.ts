export const STORY_PRICE_SATS = 21;
export const STORY_MAX_CHARS = 140;
export const STORY_ALIAS_MIN = 2;
export const STORY_ALIAS_MAX = 16;
export const STORY_ANON = "anon";
export const STORY_META_KIND = "surfsats-story";
export const STORY_STORAGE_KEY = "surfsats.story.v1";

export type StoryLine = {
  id: string;
  text: string;
  alias: string;
  createdAt: string;
  paymentHash?: string;
};

export type PendingStory = {
  paymentHash: string;
  text: string;
  alias: string;
  createdAt: string;
};

const blocked = [
  "nigger",
  "faggot",
  "kike",
  "retard",
  "rape",
  "child porn",
  "cp ",
];

export function sanitizeStoryLine(raw: string) {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return { ok: false as const, reason: "empty line" };
  if (text.length < 2) return { ok: false as const, reason: "too short" };
  if (text.length > STORY_MAX_CHARS) {
    return { ok: false as const, reason: "too long" };
  }
  const lower = text.toLowerCase();
  if (blocked.some((word) => lower.includes(word))) {
    return { ok: false as const, reason: "not in this book" };
  }
  if (/https?:\/\//i.test(text) || /www\./i.test(text)) {
    return { ok: false as const, reason: "no urls" };
  }
  return { ok: true as const, text };
}

export function sanitizeStoryAlias(raw: string) {
  const alias = raw.trim().replace(/\s+/g, "_");
  if (!alias) return { ok: true as const, alias: STORY_ANON };
  if (alias.length < STORY_ALIAS_MIN) {
    return { ok: false as const, reason: "callsign too short" };
  }
  if (alias.length > STORY_ALIAS_MAX) {
    return { ok: false as const, reason: "callsign too long" };
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(alias)) {
    return { ok: false as const, reason: "letters, numbers, _ or -" };
  }
  return { ok: true as const, alias };
}

export function storyFaceIndex(id: string, faces = 6) {
  let sum = 0;
  for (let i = 0; i < id.length; i += 1) {
    sum = (sum + id.charCodeAt(i) * (i + 3)) % 997;
  }
  return sum % faces;
}

export function createStoryLine(
  text: string,
  alias: string,
  options?: { paidAt?: number; paymentHash?: string },
) {
  const created = options?.paidAt ?? Date.now();
  const paymentHash = options?.paymentHash;
  const id = paymentHash ? `s-${paymentHash.slice(0, 12)}` : `s-${created}`;
  return {
    id,
    text,
    alias: alias || STORY_ANON,
    createdAt: new Date(created).toISOString(),
    paymentHash,
  } satisfies StoryLine;
}

export const seedStory: StoryLine[] = [
  {
    id: "seed-open-1",
    text: "In the beginning there was a sat, and it moved.",
    alias: "SCRIBE",
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
  {
    id: "seed-open-2",
    text: "The page was blank until Lightning struck the ink.",
    alias: "SCRIBE",
    createdAt: new Date(Date.now() - 86_300_000).toISOString(),
  },
];
