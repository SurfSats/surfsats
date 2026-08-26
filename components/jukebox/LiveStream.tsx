"use client";

import { useEffect, useRef, useState } from "react";
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

let tabWantsPlay = true;

async function resolveStreamUrl() {
  try {
    const response = await fetch(STREAM_AUDIO_URL);
    if (!response.ok) return STREAM_AUDIO_URL;
    const next = parsePlaylistSrc(await response.text());
    return next || STREAM_AUDIO_URL;
  } catch {
    return STREAM_AUDIO_URL;
  }
}

async function attemptAutoplay(el: HTMLAudioElement) {
  try {
    el.muted = false;
    await el.play();
    return el.paused ? "blocked" : "playing";
  } catch {
    // unmuted autoplay blocked
  }
  try {
    el.muted = true;
    await el.play();
    if (el.paused) return "blocked";
    el.muted = false;
    return el.paused ? "blocked" : "playing";
  } catch {
    el.muted = false;
    return "blocked";
  }
}

export function LiveStream() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ignorePause = useRef(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    let cancelled = false;

    function onPlay() {
      tabWantsPlay = true;
      setBlocked(false);
    }

    function onPause() {
      if (ignorePause.current) return;
      tabWantsPlay = false;
    }

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);

    async function tune() {
      const url = await resolveStreamUrl();
      if (cancelled || !audioRef.current) return;
      const node = audioRef.current;
      if (node.getAttribute("src") !== url) {
        node.src = url;
        node.preload = "auto";
      }
      if (!tabWantsPlay) {
        setBlocked(false);
        return;
      }
      const result = await attemptAutoplay(node);
      if (!cancelled) setBlocked(result === "blocked");
    }

    void tune();

    return () => {
      cancelled = true;
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      ignorePause.current = true;
      el.pause();
    };
  }, []);

  async function tapToTune() {
    const el = audioRef.current;
    if (!el) return;
    tabWantsPlay = true;
    el.muted = false;
    try {
      if (!el.src) el.src = STREAM_AUDIO_URL;
      await el.play();
      setBlocked(false);
    } catch {
      setBlocked(true);
    }
  }

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
        <div className="relative bg-black px-4 py-5 sm:px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-sats">
            listen on the ship
          </p>
          {blocked ? (
            <button
              type="button"
              className="jukebox-tune mt-4"
              onClick={() => void tapToTune()}
            >
              TAP TO TUNE IN / PLAY
            </button>
          ) : null}
          <audio
            ref={audioRef}
            className="jukebox-audio mt-4 w-full"
            controls
            preload="auto"
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
