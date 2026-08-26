"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { TerminalLabel } from "@/components/ui/TerminalLabel";
import {
  FUNDING_URL,
  STREAM_AUDIO_URL,
  STREAM_LIVE_URL,
} from "@/lib/jukebox";

function parsePlaylistSrc(text: string) {
  const line = text
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => /^https?:\/\//i.test(entry) && !entry.toLowerCase().includes(".m3u"));
  return line || "";
}

export function LiveStream() {
  const [src, setSrc] = useState(STREAM_AUDIO_URL);

  useEffect(() => {
    let cancelled = false;
    fetch(STREAM_AUDIO_URL)
      .then((response) => (response.ok ? response.text() : Promise.reject()))
      .then((text) => {
        const next = parsePlaylistSrc(text);
        if (!cancelled && next) setSrc(next);
      })
      .catch(() => {
        // CORS or playlist parse failed — keep the m3u on the audio element.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <TerminalLabel>the_deck · noderunners_radio</TerminalLabel>
          <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
            Listen live
          </h2>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-magenta">
          on_air
        </p>
      </div>

      <div className="panel mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-cyan/20 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          <span className="text-cyan">deck://radio</span>
          <span>noderunnersradio</span>
        </div>
        <div className="bg-black px-4 py-5 sm:px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-sats">
            listen on the ship
          </p>
          <audio
            className="jukebox-audio mt-4 w-full"
            controls
            preload="none"
            src={src}
          >
            Your browser does not play this stream. Open Noderunners Radio or
            load the playlist in a player.
          </audio>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <ButtonLink
          href={STREAM_LIVE_URL}
          external
          className="w-full px-5 py-3 sm:w-auto"
        >
          Open Noderunners Radio ↗
        </ButtonLink>
        <ButtonLink
          href={FUNDING_URL}
          external
          variant="ghost"
          className="w-full px-5 py-3 sm:w-auto"
        >
          Support the ship ↗
        </ButtonLink>
        <ButtonLink
          href={STREAM_AUDIO_URL}
          external
          variant="ghost"
          className="w-full px-5 py-3 sm:w-auto"
        >
          Open in player ↗
        </ButtonLink>
      </div>
      <p className="mt-3 max-w-xl text-sm text-muted">
        Support the ship if you just want to keep the transmitter warm.
      </p>
    </section>
  );
}
