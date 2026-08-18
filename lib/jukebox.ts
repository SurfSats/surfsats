import type { JukeboxTrack } from "./types";

export const JUKEBOX_PRICE_SATS = 21;

export const nowPlaying: JukeboxTrack = {
  id: "np-1",
  title: "Better Days",
  artist: "Stick Figure",
  requestedBy: "maui.sats",
  duration: "4:12",
  satsPaid: 21,
};

export const jukeboxQueue: JukeboxTrack[] = [
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
];

export function getNowPlaying() {
  return nowPlaying;
}

export function getQueue() {
  return jukeboxQueue;
}
