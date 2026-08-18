import type { JukeboxTrack } from "./types";

export const JUKEBOX_PRICE_SATS = 21;

// Live Lightning Jukebox (Noderunners / jukebox.lighting).
// Song requests and invoices currently happen here — the SurfSats page is
// the custom frontend. Swap this URL if the room or backend changes.
export const JUKEBOX_LIVE_URL =
  "https://jukebox.lighting/jukebox/web/-1001672416970";

export const JUKEBOX_BACKEND_NAME = "Lightning Jukebox / Noderunners";

// Cosmetic status until a real node/queue API exists.
export const JUKEBOX_SIGNAL = {
  strength: 78,
  bars: 4,
  litBars: 3,
  nodesConnected: 21,
};

/**
 * Live now-playing is not wired yet.
 * Later: fetch from the Lightning Jukebox / a SurfSats queue API and
 * return the current track, or null while connecting.
 */
export function getNowPlaying(): JukeboxTrack | null {
  return null;
}

/**
 * Placeholder queue so the page feels alive.
 * Later: replace this list with the live queue from the same backend.
 */
const cachedQueue: JukeboxTrack[] = [
  {
    id: "q-1",
    title: "Badfish",
    artist: "Sublime",
    requestedBy: "dawn.patrol",
    duration: "3:05",
    satsPaid: 21,
  },
  {
    id: "q-2",
    title: "Oceans",
    artist: "Pearl Jam",
    requestedBy: "anon",
    duration: "2:41",
    satsPaid: 21,
  },
  {
    id: "q-3",
    title: "Three Little Birds",
    artist: "Bob Marley & The Wailers",
    requestedBy: "lineup.radio",
    duration: "3:00",
    satsPaid: 21,
  },
  {
    id: "q-4",
    title: "Young Folks",
    artist: "Peter Bjorn and John",
    requestedBy: "sats.and.salt",
    duration: "4:38",
    satsPaid: 21,
  },
  {
    id: "q-5",
    title: "Better Days",
    artist: "Stick Figure",
    requestedBy: "maui.sats",
    duration: "4:12",
    satsPaid: 21,
  },
];

export function getQueue() {
  return cachedQueue;
}
