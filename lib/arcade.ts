export const ARCADE_PRICE_SATS = 21;
export const ARCADE_CREDITS_PER_PAY = 3;
export const ARCADE_GAME_ID = "wave-runner";
export const ARCADE_GAME_LABEL = "WAVE RUNNER";
export const ARCADE_STORAGE_KEY = "surfsats.arcade.v1";
export const ARCADE_META_KIND = "surfsats-arcade";
export const ARCADE_ALIAS_MIN = 2;
export const ARCADE_ALIAS_MAX = 16;

export type ArcadePlayer = {
  playerId: string;
  alias: string;
  credits: number;
};

export type ArcadePending = {
  paymentHash: string;
  playerId: string;
  alias: string;
  createdAt: string;
};

export type ArcadeGrant = {
  paymentHash: string;
  playerId: string;
  alias: string;
  credits: number;
  createdAt: string;
};

export type ArcadePlay = {
  id: string;
  playerId: string;
  alias: string;
  game: string;
  score: number | null;
  createdAt: string;
};

export type ArcadeHighScore = {
  rank: number;
  alias: string;
  score: number;
  createdAt: string;
};

export type ArcadeRecentPlay = {
  alias: string;
  game: string;
  sats: number;
  createdAt: string;
};

export function sanitizeAlias(raw: string) {
  const alias = raw.trim().replace(/\s+/g, "_").toUpperCase();
  if (alias.length < ARCADE_ALIAS_MIN) {
    return { ok: false as const, reason: "alias too short" };
  }
  if (alias.length > ARCADE_ALIAS_MAX) {
    return { ok: false as const, reason: "alias too long" };
  }
  if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(alias)) {
    return { ok: false as const, reason: "letters, numbers, _ or -" };
  }
  return { ok: true as const, alias };
}

export function isPlayerId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9-]{8,64}$/i.test(value);
}

export function formatCredits(credits: number) {
  const safe = Math.max(0, Math.min(99, Math.floor(credits)));
  return String(safe).padStart(2, "0");
}

export function formatScore(score: number) {
  return Math.floor(Math.abs(score)).toLocaleString("en-US");
}

export function arcadeScoreSnippet(alias: string, score: number) {
  const tag = alias.trim() || "PLAYER";
  return `${tag} scored ${formatScore(score)} on WAVE RUNNER — surfsats.com/arcade`;
}

export function formatTimeAgo(iso: string, now = Date.now()) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "JUST NOW";
  const delta = Math.max(0, now - then);
  const secs = Math.floor(delta / 1000);
  if (secs < 60) {
    return secs <= 1 ? "1 SEC AGO" : `${secs} SECS AGO`;
  }
  const mins = Math.floor(secs / 60);
  if (mins < 60) {
    return mins === 1 ? "1 MIN AGO" : `${mins} MINS AGO`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 48) {
    return hours === 1 ? "1 HR AGO" : `${hours} HRS AGO`;
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 DAY AGO" : `${days} DAYS AGO`;
}

export function newPlayId() {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
