import type { JukeboxTrack } from "./types";

export const JUKEBOX_PRICE_SATS = 21;

// Live Lightning Jukebox (Noderunners / jukebox.lighting).
// Song requests and invoices currently happen here — the SurfSats page is
// the custom frontend. Swap this URL if the room or backend changes.
export const JUKEBOX_LIVE_URL =
  "https://jukebox.lighting/jukebox/web/-1001672416970";

// Direct Telegram add-song entry (official Lightning Jukebox bot).
// Radio hangout: https://t.me/noderunnersradio
export const JUKEBOX_TELEGRAM_URL = "https://t.me/Jukebox_Lightning_bot";

export const STREAM_LIVE_URL = "https://noderunnersradio.com/";
export const STREAM_AUDIO_URL = "https://noderunnersradio.com/api/listen.m3u";
export const FUNDING_URL = "https://noderunnersradio.com/funding";
export const NOWPLAYING_URL = "https://noderunnersradio.com/api/nowplaying";
export const NOWPLAYING_CACHE_MS = 12_000;
export const NOWPLAYING_POLL_MS = 12_000;

export const JUKEBOX_BACKEND_NAME = "Lightning Jukebox / Noderunners";

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
