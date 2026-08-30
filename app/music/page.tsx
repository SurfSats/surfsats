import { Suspense } from "react";
import type { Metadata } from "next";
import { MusicConsole } from "@/components/music/MusicConsole";

export const metadata: Metadata = {
  title: "Surf Radio",
  description:
    "Explore permissionless music. Stream, zap, and discover. Jukebox, Wavlake, live Nostr sets, ZapTrax, Fountain, Napstr, Now Playing.",
};

export default function MusicPage() {
  return (
    <Suspense fallback={<div className="music-page console-page" />}>
      <MusicConsole />
    </Suspense>
  );
}
