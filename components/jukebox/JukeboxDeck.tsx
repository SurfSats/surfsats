"use client";

import { useEffect, useState } from "react";
import { HowItWorks } from "@/components/jukebox/HowItWorks";
import { JukeboxSearch } from "@/components/jukebox/JukeboxSearch";
import { NowPlaying } from "@/components/jukebox/NowPlaying";
import { Queue } from "@/components/jukebox/Queue";
import {
  NOWPLAYING_POLL_MS,
  emptyLivePayload,
  liveTrackFromPayload,
  type JukeboxLivePayload,
} from "@/lib/jukebox";

export function JukeboxDeck({
  initial,
  compact = false,
}: {
  initial?: JukeboxLivePayload | null;
  compact?: boolean;
}) {
  const [payload, setPayload] = useState<JukeboxLivePayload | null>(
    initial ?? null,
  );
  const [ready, setReady] = useState(Boolean(initial));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/jukebox/now-playing", {
          cache: "no-store",
        });
        const data = (await response.json()) as JukeboxLivePayload;
        if (cancelled) return;
        const next: JukeboxLivePayload = {
          artist: data.artist ?? null,
          title: data.title ?? null,
          album: data.album ?? null,
          queue: Array.isArray(data.queue) ? data.queue : [],
        };
        setPayload((prev) => {
          if (
            prev &&
            prev.title === next.title &&
            prev.artist === next.artist &&
            prev.album === next.album &&
            prev.queue.length === next.queue.length &&
            prev.queue.every(
              (item, index) =>
                item.id === next.queue[index]?.id &&
                item.title === next.queue[index]?.title &&
                item.artist === next.queue[index]?.artist,
            )
          ) {
            return prev;
          }
          return next;
        });
      } catch {
        if (!cancelled) setPayload(emptyLivePayload());
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void load();
    const id = window.setInterval(() => void load(), NOWPLAYING_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const track = payload ? liveTrackFromPayload(payload) : null;
  const status = !ready ? "loading" : track ? "live" : "offline";

  return (
    <>
      <div
        className={
          compact
            ? "grid gap-4"
            : "mt-12 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start"
        }
      >
        <NowPlaying track={track} status={status} />
        {compact ? null : <HowItWorks />}
      </div>
      <JukeboxSearch />
      <div className={compact ? "mt-4" : "mt-10"}>
        <Queue tracks={payload?.queue ?? []} ready={ready} />
      </div>
    </>
  );
}
