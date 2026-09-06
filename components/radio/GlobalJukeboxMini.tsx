"use client";

import { Play, Radio, Square, Volume2, VolumeX } from "lucide-react";
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
  const [currentTrack, setCurrentTrack] = useState("FETCHING_CARRIER_METADATA...");
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
        // stay on last line
      }
      if (mounted) {
        setCurrentTrack((prev) =>
          prev === "FETCHING_CARRIER_METADATA..." ? NOW_PLAYING_STANDBY : prev,
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
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
      return;
    }
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
    }
  }

  function toggleMute() {
    const el = audioRef.current;
    if (!el) return;
    const next = !isMuted;
    el.muted = next;
    setIsMuted(next);
  }

  return (
    <TerminalCard
      title="GLOBAL_JUKEBOX_RADIO"
      tag={`AUDIO_FEED // ${STREAM_BITRATE_LABEL}`}
      status={isPlaying ? "live" : "active"}
    >
      <audio
        ref={audioRef}
        preload="none"
        autoPlay={false}
        playsInline
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      <div className="flex flex-col items-stretch justify-between gap-4 font-mono md:flex-row md:items-center">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="shrink-0 border border-zinc-raw bg-void p-2 text-salt">
            <Radio
              className={cn(
                "h-5 w-5",
                isPlaying ? "animate-pulse text-terminal-green" : "text-zinc-raw",
              )}
            />
          </div>
          <div className="min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 text-[10px] tracking-telemetry text-zinc-raw uppercase">
              <span
                className={cn(
                  "inline-block h-1.5 w-1.5",
                  isPlaying
                    ? "animate-pulse bg-terminal-green"
                    : "bg-zinc-raw",
                )}
                aria-hidden="true"
              />
              <span>STATUS: {isPlaying ? "TRANSMITTING" : "STANDBY"}</span>
              <span aria-hidden="true">•</span>
              <span className="text-amber">V4V STREAM</span>
            </div>
            <p className="mt-0.5 truncate text-xs font-bold tracking-wider text-salt">
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
                isPlaying ? "jukebox-eq-bar" : "h-2",
              )}
              style={{ animationDelay: `${index * 70}ms` }}
            />
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t border-zinc-raw pt-2 md:border-t-0 md:pt-0">
          <BrutalistButton
            size="sm"
            variant={isPlaying ? "amber" : "primary"}
            className="flex items-center gap-2 px-4"
            onClick={() => {
              void togglePlay();
            }}
            aria-label={isPlaying ? "Stop live stream" : "Listen live"}
          >
            {isPlaying ? (
              <>
                <Square className="h-3.5 w-3.5 fill-void" />
                <span>STOP</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-salt" />
                <span>LISTEN LIVE</span>
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
