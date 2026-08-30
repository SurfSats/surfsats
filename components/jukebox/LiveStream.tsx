"use client";

import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { TerminalLabel } from "@/components/ui/TerminalLabel";
import { cn } from "@/lib/cn";
import {
  FUNDING_URL,
  NOWPLAYING_POLL_MS,
  STREAM_AUDIO_URL,
  STREAM_LIVE_URL,
  emptyLivePayload,
  liveTrackFromPayload,
  type JukeboxLivePayload,
} from "@/lib/jukebox";

const EQ_BARS = 18;

function parsePlaylistSrc(text: string) {
  const line = text
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => /^https?:\/\//i.test(entry) && !entry.toLowerCase().includes(".m3u"));
  return line || "";
}

let tabWantsPlay = true;

const audioGraphs = new WeakMap<
  HTMLAudioElement,
  { ctx: AudioContext; analyser: AnalyserNode }
>();

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
    if (!el.paused) return "playing" as const;
  } catch {
    // unmuted autoplay blocked
  }
  try {
    el.muted = true;
    await el.play();
    if (el.paused) return "blocked" as const;
    el.muted = false;
    if (el.paused) return "blocked" as const;
    return "playing" as const;
  } catch {
    el.muted = false;
    return "blocked" as const;
  }
}

export function LiveStream() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const eqRef = useRef<HTMLDivElement | null>(null);
  const ignorePause = useRef(false);
  const graphRef = useRef<{
    ctx: AudioContext;
    analyser: AnalyserNode;
  } | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [payload, setPayload] = useState<JukeboxLivePayload | null>(null);

  useEffect(() => {
    const player = audioRef.current;
    if (!player) return;
    ignorePause.current = false;
    let cancelled = false;
    let raf = 0;

    function onPlay() {
      tabWantsPlay = true;
      setBlocked(false);
      setPlaying(true);
      void graphRef.current?.ctx.resume();
    }

    function onPlaying() {
      setBlocked(false);
      setPlaying(true);
    }

    function onPause() {
      setPlaying(false);
      if (ignorePause.current) return;
      tabWantsPlay = false;
    }

    player.addEventListener("play", onPlay);
    player.addEventListener("playing", onPlaying);
    player.addEventListener("pause", onPause);

    function attachGraph(node: HTMLAudioElement) {
      const existing = audioGraphs.get(node);
      if (existing) {
        graphRef.current = existing;
        return;
      }
      const AudioCtx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      try {
        const ctx = new AudioCtx();
        const source = ctx.createMediaElementSource(node);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.72;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        const graph = { ctx, analyser };
        audioGraphs.set(node, graph);
        graphRef.current = graph;
      } catch {
        graphRef.current = null;
      }
    }

    attachGraph(player);

    const bins = new Uint8Array(
      graphRef.current?.analyser.frequencyBinCount ?? 0,
    );

    function paintFake(on: boolean) {
      const root = eqRef.current;
      if (!root) return;
      root.classList.toggle("is-on", on);
      root.classList.add("is-fake");
      root.querySelectorAll<HTMLElement>("span").forEach((bar) => {
        bar.style.height = "";
      });
    }

    function tick() {
      if (cancelled) return;
      const root = eqRef.current;
      const graph = graphRef.current;
      const node = audioRef.current;
      const on = Boolean(node && !node.paused);
      if (!root || !on || !graph) {
        paintFake(on);
      } else {
        try {
          graph.analyser.getByteFrequencyData(bins);
          const energy = bins.reduce((sum, value) => sum + value, 0);
          if (energy < 8) {
            paintFake(true);
          } else {
            root.classList.add("is-on");
            root.classList.remove("is-fake");
            root.querySelectorAll<HTMLElement>("span").forEach((bar, index) => {
              const sample = bins[Math.min(bins.length - 1, 1 + index)] ?? 0;
              bar.style.height = `${10 + (sample / 255) * 90}%`;
            });
          }
        } catch {
          paintFake(true);
        }
      }
      if (!cancelled) raf = window.requestAnimationFrame(tick);
    }

    raf = window.requestAnimationFrame(tick);

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
      void graphRef.current?.ctx.resume();
      const result = await attemptAutoplay(node);
      if (!cancelled) {
        setBlocked(result === "blocked");
        setPlaying(result === "playing");
        setMuted(node.muted);
      }
    }

    void tune();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("playing", onPlaying);
      player.removeEventListener("pause", onPause);
      ignorePause.current = true;
      player.pause();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/jukebox/now-playing", {
          cache: "no-store",
        });
        const data = (await response.json()) as JukeboxLivePayload;
        if (cancelled) return;
        setPayload({
          artist: data.artist ?? null,
          title: data.title ?? null,
          album: data.album ?? null,
          queue: Array.isArray(data.queue) ? data.queue : [],
        });
      } catch {
        if (!cancelled) setPayload(emptyLivePayload());
      }
    }

    void load();
    const id = window.setInterval(() => void load(), NOWPLAYING_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!blocked) return;

    function onGesture(event: Event) {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(".ship-rx-play, .ship-rx-vol")
      ) {
        return;
      }
      void tapToTune();
    }

    document.addEventListener("pointerdown", onGesture, true);
    document.addEventListener("keydown", onGesture, true);
    return () => {
      document.removeEventListener("pointerdown", onGesture, true);
      document.removeEventListener("keydown", onGesture, true);
    };
  }, [blocked]);

  async function tapToTune() {
    const el = audioRef.current;
    if (!el) return;
    tabWantsPlay = true;
    el.muted = false;
    setMuted(false);
    try {
      if (!el.src) el.src = STREAM_AUDIO_URL;
      void graphRef.current?.ctx.resume();
      await el.play();
      setBlocked(false);
      setPlaying(!el.paused);
    } catch {
      setBlocked(true);
      setPlaying(false);
    }
  }

  async function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (!el.paused) {
      tabWantsPlay = false;
      el.pause();
      setPlaying(false);
      return;
    }
    await tapToTune();
  }

  function applyVolume(next: number, nextMuted = muted) {
    const el = audioRef.current;
    setVolume(next);
    setMuted(nextMuted);
    if (!el) return;
    el.volume = next;
    el.muted = nextMuted || next === 0;
  }

  const track = payload ? liveTrackFromPayload(payload) : null;
  const artist = track?.artist?.trim() || "Noderunners Radio";
  const title = track?.title?.trim() || "Live";

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <TerminalLabel>the_deck · noderunners_radio</TerminalLabel>
          <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
            Listen live
          </h2>
        </div>
      </div>

      <div className="ship-rx-frame mt-5">
        <div className="ship-rx-head">
          <span className="text-cyan">deck://radio</span>
          <span>noderunnersradio</span>
        </div>
        <div className="ship-rx-body">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-sats">
            listen on the ship
          </p>

          <div className="ship-rx">
            <button
              type="button"
              className={cn(
                "ship-rx-play",
                playing && "is-on",
                blocked && "is-blocked",
              )}
              aria-label={
                blocked
                  ? "Tap to tune in / play"
                  : playing
                    ? "Pause stream"
                    : "Play stream"
              }
              onClick={() => void togglePlay()}
            >
              {blocked ? (
                <span>TAP TO TUNE IN / PLAY</span>
              ) : playing ? (
                <PauseGlyph />
              ) : (
                <PlayGlyph />
              )}
            </button>

            <p
              className={cn("ship-rx-air", playing && "is-on")}
              aria-live="polite"
            >
              on air
            </p>

            <p className="ship-rx-track">
              <span className="text-cyan">{artist}</span>
              <span aria-hidden="true"> — </span>
              <span>{title}</span>
            </p>

            <div
              ref={eqRef}
              className="ship-rx-eq is-fake"
              aria-hidden="true"
            >
              {Array.from({ length: EQ_BARS }, (_, index) => (
                <span key={index} style={{ ["--i" as string]: index }} />
              ))}
            </div>

            <div className="ship-rx-vol">
              <button
                type="button"
                className="ship-rx-mute"
                aria-label={muted || volume === 0 ? "Unmute" : "Mute"}
                onClick={() => applyVolume(volume, !(muted || volume === 0))}
              >
                vol
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                aria-label="Volume"
                onChange={(event) => {
                  const next = Number(event.target.value);
                  applyVolume(next, next === 0);
                }}
              />
            </div>
          </div>

          <audio
            ref={audioRef}
            className="ship-rx-audio"
            preload="auto"
            playsInline
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

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path d="M7 5h4v14H7V5Zm6 0h4v14h-4V5Z" fill="currentColor" />
    </svg>
  );
}
