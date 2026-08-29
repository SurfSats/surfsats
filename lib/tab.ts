import { isPlayerId, sanitizeAlias } from "@/lib/arcade";

export const TAB_PRICE_SATS = 21;
export const TAB_CREDITS_PER_PAY = 3;
export const TAB_META_KIND = "surfsats-tab";
export const TAB_STORAGE_KEY = "surfsats.tab.v1";
export const TAB_GAME_ID = "tab";
export const TAB_ENDING_GAMES = [
  "tab-settled",
  "tab-thrown",
  "tab-converted",
] as const;

export type TabEndingGame = (typeof TAB_ENDING_GAMES)[number];

export type TabPlayer = {
  playerId: string;
  alias: string;
  credits: number;
};

export type TabPending = {
  paymentHash: string;
  playerId: string;
  alias: string;
  createdAt: string;
};

export type TabGrant = {
  paymentHash: string;
  playerId: string;
  alias: string;
  credits: number;
  createdAt: string;
};

export type TabPlay = {
  id: string;
  playerId: string;
  alias: string;
  game: string;
  score: number | null;
  createdAt: string;
};

export type TabHighScore = {
  rank: number;
  alias: string;
  score: number;
  createdAt: string;
  game?: string;
};

export type TabRecent = {
  alias: string;
  sats: number;
  createdAt: string;
};

export { isPlayerId, sanitizeAlias };

export function isTabEndingGame(value: unknown): value is TabEndingGame {
  return (
    typeof value === "string" &&
    (TAB_ENDING_GAMES as readonly string[]).includes(value)
  );
}

export function tabEndingGame(ending: string): TabEndingGame | null {
  const id = `tab-${ending.trim().toLowerCase()}`;
  return isTabEndingGame(id) ? id : null;
}

export function formatTabCredits(credits: number) {
  const safe = Math.max(0, Math.min(99, Math.floor(credits)));
  return String(safe).padStart(2, "0");
}

export function newTabPlayId() {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
