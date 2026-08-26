"use client";

import { useEffect, useState } from "react";
import { HowItWorks } from "@/components/jukebox/HowItWorks";
import { NowPlaying } from "@/components/jukebox/NowPlaying";
import { Queue } from "@/components/jukebox/Queue";
import {
  emptyLivePayload,
  liveTrackFromPayload,
  type JukeboxLivePayload,
} from "@/lib/jukebox";

const POLL_MS = 25_000;

export function JukeboxDeck({
  initial,
}: {
  initial?: JukeboxLivePayload | null;
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
        setPayload({
          artist: data.artist ?? null,
          title: data.title ?? null,
          album: data.album ?? null,
          queue: Array.isArray(data.queue) ? data.queue : [],
        });
      } catch {
        if (!cancelled) setPayload(emptyLivePayload());
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const track = payload ? liveTrackFromPayload(payload) : null;
  const status = !ready ? "loading" : track ? "live" : "offline";

  return (
    <>
      <div className="mt-12 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <NowPlaying track={track} status={status} />
        <HowItWorks />
      </div>
      <div className="mt-10">
        <Queue tracks={payload?.queue ?? []} ready={ready} />
      </div>
    </>
  );
}
