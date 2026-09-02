import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Surf Radio",
  description:
    "Pirate ship. International waters. Tap to tune in. 21 sats to request.",
  path: "/music",
});

export default function JukeboxPage() {
  permanentRedirect("/music?tab=jukebox");
}
