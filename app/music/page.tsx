import { Suspense } from "react";
import type { Metadata } from "next";
import { MusicConsole } from "@/components/music/MusicConsole";

import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Surf Radio",
  description:
    "Pirate ship. International waters. Tap to tune in. 21 sats to request.",
  path: "/music",
});

export default function MusicPage() {
  return (
    <Suspense fallback={<div className="music-page console-page" />}>
      <MusicConsole />
    </Suspense>
  );
}
