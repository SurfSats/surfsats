import type { JukeboxTrack } from "./types";

export const JUKEBOX_PRICE_SATS = 21;
export const WAVLAKE_REQUEST_SATS = 210;

// Requests happen on Noderunners Radio (Jukebox tab). SurfSats does not invoice.
export const JUKEBOX_LIVE_URL = "https://noderunnersradio.com/";
export const JUKEBOX_TELEGRAM_URL = "https://t.me/noderunnersradio";

export const STREAM_LIVE_URL = "https://noderunnersradio.com/";
export const STREAM_AUDIO_URL = "https://noderunnersradio.com/api/listen.m3u";
export const FUNDING_URL = "https://noderunnersradio.com/funding";
export const NOWPLAYING_URL = "https://noderunnersradio.com/api/nowplaying";
export const NOWPLAYING_CACHE_MS = 12_000;
export const NOWPLAYING_POLL_MS = 12_000;
export const JUKEBOX_SEARCH_URL = "https://noderunnersradio.com/api/search";
export const JUKEBOX_SEARCH_CACHE_MS = 10_000;
export const JUKEBOX_SEARCH_QUERY_MAX = 80;

export const JUKEBOX_BACKEND_NAME = "Noderunners Radio";

// Cosmetic status until a real node/queue API exists.
export const JUKEBOX_SIGNAL = {
  strength: 78,
  bars: 4,
  litBars: 3,
  nodesConnected: 21,
};

export type JukeboxLiveTrack = {
  title: string;
  artist: string;
  album: string | null;
};

export type JukeboxLiveQueueItem = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
};

export type JukeboxLivePayload = {
  artist: string | null;
  title: string | null;
  album: string | null;
  queue: JukeboxLiveQueueItem[];
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseQueueItem(value: unknown, index: number): JukeboxLiveQueueItem | null {
  if (typeof value === "string") {
    const title = value.trim();
    if (!title) return null;
    return { id: `q-${index}`, title, artist: "", album: null };
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const title = asText(record.title);
  const artist = asText(record.artist);
  const album = asText(record.album) || null;
  if (!title && !artist) return null;
  return {
    id: asText(record.id) || `q-${index}-${title || artist}`,
    title: title || "Untitled",
    artist,
    album,
  };
}

export function emptyLivePayload(): JukeboxLivePayload {
  return { artist: null, title: null, album: null, queue: [] };
}

export function parseNowPlayingPayload(value: unknown): JukeboxLivePayload {
  if (!value || typeof value !== "object") return emptyLivePayload();
  const record = value as Record<string, unknown>;
  const rawNow =
    record.now_playing && typeof record.now_playing === "object"
      ? (record.now_playing as Record<string, unknown>)
      : record;
  const title = asText(rawNow.title) || null;
  const artist = asText(rawNow.artist) || null;
  const album = asText(rawNow.album) || null;
  const rawQueue = Array.isArray(record.queue) ? record.queue : [];
  const queue = rawQueue
    .map((item, index) => parseQueueItem(item, index))
    .filter((item): item is JukeboxLiveQueueItem => Boolean(item));
  return { artist, title, album, queue };
}

export function liveTrackFromPayload(
  payload: JukeboxLivePayload,
): JukeboxLiveTrack | null {
  if (!payload.title) return null;
  return {
    title: payload.title,
    artist: payload.artist ?? "",
    album: payload.album,
  };
}

let liveCache: { at: number; payload: JukeboxLivePayload } | null = null;

export async function fetchNowPlayingSnapshot(): Promise<JukeboxLivePayload> {
  if (liveCache && Date.now() - liveCache.at < NOWPLAYING_CACHE_MS) {
    return liveCache.payload;
  }
  try {
    const response = await fetch(NOWPLAYING_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      return liveCache?.payload ?? emptyLivePayload();
    }
    const payload = parseNowPlayingPayload(await response.json());
    liveCache = { at: Date.now(), payload };
    return payload;
  } catch {
    return liveCache?.payload ?? emptyLivePayload();
  }
}

/**
 * Homepage teaser only. The Jukebox page reads live now-playing
 * from /api/jukebox/now-playing instead of this stub.
 */
export function getNowPlaying(): JukeboxTrack | null {
  return null;
}

export function getQueue(): JukeboxTrack[] {
  return [];
}

export type JukeboxSearchSource = "library" | "wavlake";

export type JukeboxSearchHit = {
  artist: string;
  title: string;
  album: string | null;
  source: JukeboxSearchSource;
  sats: number;
  guid: string | null;
  duration_s: number | null;
};

function asNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSearchSource(value: unknown): JukeboxSearchSource {
  return value === "wavlake" ? "wavlake" : "library";
}

export function parseSearchPayload(value: unknown): JukeboxSearchHit[] {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const raw = Array.isArray(record.results)
    ? record.results
    : Array.isArray(value)
      ? value
      : [];
  const hits: JukeboxSearchHit[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const title = asText(row.title);
    const artist = asText(row.artist);
    if (!title && !artist) continue;
    const source = parseSearchSource(row.source);
    const sats =
      asNumber(row.sats) ??
      (source === "wavlake" ? WAVLAKE_REQUEST_SATS : JUKEBOX_PRICE_SATS);
    hits.push({
      artist,
      title: title || "Untitled",
      album: asText(row.album) || null,
      source,
      sats,
      guid: asText(row.guid) || null,
      duration_s: asNumber(row.duration_s),
    });
  }
  return hits;
}

export function sanitizeSearchQuery(raw: string) {
  return raw.trim().slice(0, JUKEBOX_SEARCH_QUERY_MAX);
}

const searchCache = new Map<string, { at: number; results: JukeboxSearchHit[] }>();

export async function fetchJukeboxSearch(rawQuery: string): Promise<{
  ok: boolean;
  results: JukeboxSearchHit[];
}> {
  const q = sanitizeSearchQuery(rawQuery);
  if (q.length < 2) return { ok: true, results: [] };
  const cached = searchCache.get(q.toLowerCase());
  if (cached && Date.now() - cached.at < JUKEBOX_SEARCH_CACHE_MS) {
    return { ok: true, results: cached.results };
  }
  try {
    const url = `${JUKEBOX_SEARCH_URL}?q=${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, results: [] };
    const results = parseSearchPayload(await response.json());
    searchCache.set(q.toLowerCase(), { at: Date.now(), results });
    return { ok: true, results };
  } catch {
    return { ok: false, results: [] };
  }
}
