import { sanitizeCallsign } from "./callsign.ts";

export const ARCADE_PRICE_SATS = 21;
export const ARCADE_CREDITS_PER_PAY = 3;
export const ARCADE_GAME_ID = "wave-runner";
export const ARCADE_GAME_LABEL = "WAVE RUNNER";
/** Phase 0: Wave Runner is hidden, not deleted. */
export const WAVE_RUNNER_LIVE = false;
export const ANARCH_GAME_ID = "anarch";
export const ANARCH_GAME_LABEL = "ANARCH";
export const ANARCH_BUILD_HTML = "/arcade/anarch/anarch.html";
export const ANARCH_BUILD_JS = "/arcade/anarch/anarch.js";
export const ANARCH_BUILD_WASM = "/arcade/anarch/anarch.wasm";
export const BITTIES_GAME_ID = "bitties";
export const BITTIES_GAME_LABEL = "BOUNCING BITTIES";
export const SWELL_HOP_GAME_ID = "swell-hop";
export const SWELL_HOP_GAME_LABEL = BITTIES_GAME_LABEL;
export const ARCADE_STORAGE_KEY = "surfsats.arcade.v1";
export const RETRO_STORAGE_KEY = "surfsats.arcade.retro.v1";
export const TAB_STORAGE_KEY = "surfsats.arcade.tab.v1";
export const PLEB_BOX_STORAGE_KEY = "surfsats.arcade.pleb-box.v1";
export const ARCADE_META_KIND = "surfsats-arcade";
export {
  CALLSIGN_MIN as ARCADE_ALIAS_MIN,
  CALLSIGN_MAX as ARCADE_ALIAS_MAX,
} from "./callsign.ts";

export const ARCADE_MACHINE_WAVE = "wave";
export const ARCADE_MACHINE_RETRO = "retro";
export const ARCADE_MACHINE_TAB = "tab";
export const ARCADE_MACHINE_PLEB = "pleb-box";
export const PLEB_BOX_GAME_ID = "pleb-box";
export const PLEB_BOX_LABEL = "PLEB BOX";
export const PLEB_BOX_ATTRACT = `INSERT ${ARCADE_PRICE_SATS} SATS · NOODLE · LASER · YEET`;
export const PLEB_BOX_HOW =
  "21 SATS. 3 CREDITS. ONE BOX. NOODLE GROWS. LASER CLEARS. YEET FLIES.";
export const PLEB_BOX_RULES =
  "no accounts. callsign on the glass. isolated from Retro.";
export const PLEB_BOX_GAMES = [
  { id: "noodle", label: "NOODLE", line: "NOODLE GROWS." },
  { id: "laser", label: "LASER", line: "LASER CLEARS." },
  { id: "yeet", label: "YEET", line: "YEET FLIES." },
] as const;
export const TAB_GAME_ID = "tab";
export const TAB_ENDING_GAMES = [
  "tab-settled",
  "tab-thrown",
  "tab-converted",
] as const;

export const RETRO_GAMES = [
  { id: "pong", label: "Pong" },
  { id: "tetris", label: "Tetris" },
  { id: "snake", label: "Snake" },
  { id: "breakout", label: "Breakout" },
  { id: "invaders", label: "Space Invaders" },
] as const;

export type ArcadeMachine = "wave" | "retro" | "tab" | "pleb-box";
export type TabEndingGame = (typeof TAB_ENDING_GAMES)[number];
export type RetroGameId = (typeof RETRO_GAMES)[number]["id"];
export type PlebBoxGameId = (typeof PLEB_BOX_GAMES)[number]["id"];

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
  machine?: ArcadeMachine;
  game?: string;
};

export type ArcadeGrant = {
  paymentHash: string;
  playerId: string;
  alias: string;
  credits: number;
  createdAt: string;
  machine?: ArcadeMachine;
  game?: string;
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
  game?: string;
};

export type ArcadeRecentPlay = {
  alias: string;
  game: string;
  sats: number;
  createdAt: string;
};

export function sanitizeAlias(raw: string) {
  const parsed = sanitizeCallsign(raw);
  if (!parsed.ok) return parsed;
  return { ok: true as const, alias: parsed.callsign };
}

export function plebInvoiceFromSubmit(
  raw: string,
  opts: { explicit: boolean },
) {
  if (!opts.explicit) return { open: false as const };
  const parsed = sanitizeAlias(raw);
  if (!parsed.ok) return { open: false as const, reason: parsed.reason };
  return { open: true as const, alias: parsed.alias };
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

export function arcadeScoreSnippet(
  alias: string,
  score: number,
  gameLabel = ARCADE_GAME_LABEL,
) {
  const tag = alias.trim() || "PLAYER";
  return `${tag} scored ${formatScore(score)} on ${gameLabel} — surfsats.com/arcade`;
}

export function isArcadeMachine(value: unknown): value is ArcadeMachine {
  return (
    value === ARCADE_MACHINE_WAVE ||
    value === ARCADE_MACHINE_RETRO ||
    value === ARCADE_MACHINE_TAB ||
    value === ARCADE_MACHINE_PLEB
  );
}

export function parseArcadeMachine(value: unknown): ArcadeMachine {
  if (value === ARCADE_MACHINE_RETRO) return ARCADE_MACHINE_RETRO;
  if (value === ARCADE_MACHINE_TAB) return ARCADE_MACHINE_TAB;
  if (value === ARCADE_MACHINE_PLEB) return ARCADE_MACHINE_PLEB;
  return ARCADE_MACHINE_WAVE;
}

export function isRetroGameId(value: unknown): value is RetroGameId {
  return (
    typeof value === "string" &&
    RETRO_GAMES.some((game) => game.id === value)
  );
}

export function retroGameLabel(id: string) {
  return RETRO_GAMES.find((game) => game.id === id)?.label ?? id.toUpperCase();
}

export function isWaveRunnerDeepLink(value: unknown) {
  const id = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
  return (
    id === "wave" ||
    id === "waverunner" ||
    id === "wave-runner" ||
    id === "wave-run"
  );
}

export function isPlebBoxGameId(value: unknown): value is PlebBoxGameId {
  return (
    typeof value === "string" &&
    PLEB_BOX_GAMES.some((game) => game.id === value)
  );
}

export function plebBoxGame(id: PlebBoxGameId) {
  return PLEB_BOX_GAMES.find((game) => game.id === id) ?? PLEB_BOX_GAMES[0];
}

export function isPlebBoxDeepLink(value: unknown) {
  const id = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
  return (
    id === "pleb" ||
    id === "pleb-box" ||
    id === "plebbox" ||
    isPlebBoxGameId(id)
  );
}

export function normalizePlayGame(raw: string): string | null {
  const id = raw.trim().toLowerCase();
  if (!id || id === "wave" || id === ARCADE_GAME_ID) return ARCADE_GAME_ID;
  if (id === ANARCH_GAME_ID) return ANARCH_GAME_ID;
  if (id === BITTIES_GAME_ID || id === SWELL_HOP_GAME_ID) return BITTIES_GAME_ID;
  if (id === PLEB_BOX_GAME_ID || isPlebBoxGameId(id)) return id;
  if (isRetroGameId(id)) return id;
  if (id === TAB_GAME_ID) return TAB_GAME_ID;
  if (isTabEndingGame(id)) return id;
  return null;
}

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

export function tabEndingLabel(game?: string) {
  if (game === "tab-settled") return "TAB SETTLED";
  if (game === "tab-thrown") return "THROWN OUT";
  if (game === "tab-converted") return "CONVERTED";
  if (game === TAB_GAME_ID) return "THE TAB";
  return "THE TAB";
}

export const RETRO_GAME_IDS: RetroGameId[] = RETRO_GAMES.map((game) => game.id);

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
