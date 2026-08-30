export const WAVLAKE_EMBED_SRC =
  "https://embed.wavlake.com/chart?days=21&limit=8";
export const WAVLAKE_URL = "https://wavlake.com";
export const ZAP_STREAM_URL = "https://zap.stream";
export const TUNESTR_URL = "https://tunestr.io";
export const ZAPTRAX_URL = "https://zaptrax.app";
export const FOUNTAIN_URL = "https://fountain.fm";
export const PODVERSE_URL = "https://podverse.fm";
export const PODCAST_INDEX_URL = "https://podcastindex.org";
export const NAPSTR_URL = "https://napstr.net";
export const ZAPSTR_URL = "https://zapstr.live";
export const STEMSTR_URL = "https://stemstr.app";
export const TRACKSTR_URL = "https://nostrapps.github.io/trackstr/";
export const TRACKSTR_GITHUB_URL = "https://github.com/nostrapps/trackstr";

export const RADIO_NAV = [
  { id: "jukebox", label: "Jukebox" },
  { id: "wavlake", label: "Wavlake" },
  { id: "live", label: "Live" },
  { id: "zaptrax", label: "ZapTrax" },
  { id: "podcasts", label: "Podcasts" },
  { id: "own", label: "Own" },
  { id: "now-playing", label: "Now Playing" },
] as const;

export type RadioTabId = (typeof RADIO_NAV)[number]["id"];

export const RADIO_TAB_CHROME: Record<
  RadioTabId,
  { label: string; ariaLabel: string }
> = {
  jukebox: { label: "Juke", ariaLabel: "Jukebox" },
  wavlake: { label: "Wave", ariaLabel: "Wavlake" },
  live: { label: "Live", ariaLabel: "Live" },
  zaptrax: { label: "Trax", ariaLabel: "ZapTrax" },
  podcasts: { label: "Pods", ariaLabel: "Podcasts" },
  own: { label: "Own", ariaLabel: "Own" },
  "now-playing": { label: "Now", ariaLabel: "Now Playing" },
};

export function isRadioTab(id: string): id is RadioTabId {
  return RADIO_NAV.some((item) => item.id === id);
}
