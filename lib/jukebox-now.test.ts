import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NOW_PLAYING_STANDBY,
  STREAM_AUDIO_URL,
  STREAM_ICECAST_URL,
  emptyLivePayload,
  formatNowPlayingLine,
  parseNowPlayingPayload,
  parsePlaylistSrc,
} from "./jukebox.ts";

test("noderunners stream playlist and icecast fallback are live URLs", () => {
  assert.match(STREAM_AUDIO_URL, /^https:\/\/noderunnersradio\.com\//);
  assert.match(STREAM_ICECAST_URL, /^https:\/\/stream\.noderunnersradio\.com\//);
});

test("parsePlaylistSrc picks the first http stream line", () => {
  const src = parsePlaylistSrc(
    "#EXTM3U\n#EXTINF:-1,NRR\nhttps://stream.noderunnersradio.com/stream\n",
  );
  assert.equal(src, "https://stream.noderunnersradio.com/stream");
  assert.equal(parsePlaylistSrc("#EXTM3U\n"), "");
});

test("formatNowPlayingLine uses artist — title, else standby", () => {
  assert.equal(formatNowPlayingLine(emptyLivePayload()), NOW_PLAYING_STANDBY);
  assert.equal(
    formatNowPlayingLine(
      parseNowPlayingPayload({ title: "Swell", artist: "Anon" }),
    ),
    "Anon — Swell",
  );
  assert.equal(
    formatNowPlayingLine(parseNowPlayingPayload({ title: "Swell", artist: "" })),
    "Swell",
  );
});
