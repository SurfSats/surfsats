"use client";

import { LoaderCircle, Play, Radio, Square, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { WavlakeV4VStrip } from "@/components/radio/WavlakeV4VStrip";
import { BrutalistButton } from "@/components/ui/BrutalistButton";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { cn } from "@/lib/cn";
import {
  NOWPLAYING_POLL_MS,
  NOW_PLAYING_STANDBY,
  STREAM_AUDIO_URL,
  STREAM_BITRATE_LABEL,
  STREAM_ICECAST_URL,
  formatNowPlayingLine,
  parsePlaylistSrc,
  type JukeboxLivePayload,
} from "@/lib/jukebox";
import { playMechanicalLatch } from "@/lib/sound";

type GlobalJukeboxMiniProps = {
  streamUrl?: string;
  metadataUrl?: string;
};

async function resolveStreamUrl(playlistUrl: string, fallback: string) {
  try {
    const response = await fetch(playlistUrl, { cache: "no-store" });
    if (!response.ok) return fallback;
    return parsePlaylistSrc(await response.text()) || fallback;
  } catch {
    return fallback;
  }
}

export function GlobalJukeboxMini({
  streamUrl = STREAM_ICECAST_URL,
  metadataUrl = "/api/jukebox/now-playing",
}: GlobalJukeboxMiniProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState("SYNCING_CARRIER_METADATA...");
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resolvedRef = useRef("");

  useEffect(() => {
    let mounted = true;

    async function fetchMetadata() {
      try {
        const response = await fetch(metadataUrl, { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as JukeboxLivePayload;
          if (mounted) {
            setCurrentTrack(formatNowPlayingLine(data));
            return;
          }
        }
      } catch {
        // keep last line
      }
      if (mounted) {
        setCurrentTrack((prev) =>
          prev === "SYNCING_CARRIER_METADATA..." ? NOW_PLAYING_STANDBY : prev,
        );
      }
    }

    void fetchMetadata();
    const interval = window.setInterval(() => void fetchMetadata(), NOWPLAYING_POLL_MS);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [metadataUrl]);

  async function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    playMechanicalLatch();

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const src =
      resolvedRef.current ||
      (await resolveStreamUrl(STREAM_AUDIO_URL, streamUrl));
    resolvedRef.current = src;
    if (el.getAttribute("src") !== src) {
      el.src = src;
    }
    el.muted = isMuted;
    try {
      await el.play();
      setIsPlaying(!el.paused);
    } catch {
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleMute() {
    const el = audioRef.current;
    if (!el) return;
    playMechanicalLatch();
    const next = !isMuted;
    el.muted = next;
    setIsMuted(next);
  }

  const carrier = isLoading
    ? "BUFFERING"
    : isPlaying
      ? "TRANSMITTING"
      : "STANDBY";
  const liveState = isLoading ? "BUFFERING" : isPlaying ? "LIVE" : "OFFLINE";

  return (
    <TerminalCard
      title="GLOBAL_JUKEBOX_MINI"
      tag={`AUDIO_STREAM // ${STREAM_BITRATE_LABEL}`}
      status={isPlaying ? "live" : isLoading ? "warning" : "active"}
    >
      <audio
        ref={audioRef}
        preload="none"
        autoPlay={false}
        playsInline
        onPause={() => {
          setIsPlaying(false);
          setIsLoading(false);
        }}
        onPlay={() => {
          setIsPlaying(true);
          setIsLoading(false);
        }}
        onWaiting={() => {
          if (audioRef.current && !audioRef.current.paused) setIsLoading(true);
        }}
        onPlaying={() => {
          setIsPlaying(true);
          setIsLoading(false);
        }}
      />

      <div className="flex flex-col items-stretch justify-between gap-4 font-mono text-xs md:flex-row md:items-center">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="shrink-0 border border-zinc-raw bg-void p-2">
            {isLoading ? (
              <LoaderCircle className="h-5 w-5 animate-spin text-amber" />
            ) : (
              <Radio
                className={cn(
                  "h-5 w-5",
                  isPlaying
                    ? "animate-pulse text-terminal-green"
                    : "text-zinc-raw",
                )}
              />
            )}
          </div>
          <div className="min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 text-[10px] tracking-telemetry text-zinc-raw uppercase">
              <span
                className={cn(
                  "inline-block h-1.5 w-1.5",
                  isLoading
                    ? "animate-pulse bg-amber"
                    : isPlaying
                      ? "animate-pulse bg-terminal-green"
                      : "bg-zinc-raw",
                )}
                aria-hidden="true"
              />
              <span>CARRIER: {carrier}</span>
              <span aria-hidden="true">|</span>
              <span
                className={cn(
                  isLoading
                    ? "text-amber"
                    : isPlaying
                      ? "text-terminal-green"
                      : "text-zinc-raw",
                )}
              >
                {liveState}
              </span>
              <span aria-hidden="true">•</span>
              <span className="text-amber">V4V STREAM</span>
            </div>
            <p
              className="mt-0.5 truncate text-xs font-bold tracking-wider text-salt"
              title={currentTrack}
            >
              NOW_PLAYING · {currentTrack}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "flex shrink-0 items-center gap-1",
            isPlaying ? "opacity-100" : "opacity-40",
          )}
          aria-hidden="true"
        >
          {Array.from({ length: 8 }, (_, index) => (
            <span
              key={index}
              className={cn(
                "w-0.5 bg-violet",
                isPlaying && !isLoading ? "jukebox-eq-bar" : "h-2",
              )}
              style={{ animationDelay: `${index * 70}ms` }}
            />
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t border-zinc-raw pt-3 md:border-t-0 md:pt-0">
          <BrutalistButton
            size="sm"
            variant={isPlaying ? "amber" : "primary"}
            className="flex min-w-[120px] items-center justify-center gap-2 px-5"
            disabled={isLoading && !isPlaying}
            onClick={() => {
              void togglePlay();
            }}
            aria-label={isPlaying ? "Stop live stream" : "Play live stream"}
          >
            {isPlaying ? (
              <>
                <Square className="h-3.5 w-3.5 fill-void" />
                <span>STOP</span>
              </>
            ) : isLoading ? (
              <>
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                <span>SYNCING</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-salt" />
                <span>PLAY</span>
              </>
            )}
          </BrutalistButton>

          <BrutalistButton
            size="sm"
            variant="secondary"
            className="px-2.5"
            disabled={!isPlaying}
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute stream" : "Mute stream"}
          >
            {isMuted ? (
              <VolumeX className="h-3.5 w-3.5 text-zinc-raw" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-salt" />
            )}
          </BrutalistButton>
        </div>
      </div>
      <div className="mt-4">
        <WavlakeV4VStrip />
      </div>
    </TerminalCard>
  );
}
