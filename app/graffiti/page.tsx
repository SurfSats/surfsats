import type { Metadata } from "next";
import { GraffitiApp } from "@/components/graffiti/GraffitiApp";

export const metadata: Metadata = {
  title: "Graffiti Wall",
  description:
    "Pay 21 sats. Leave a mark for 21 hours. Bitcoin Is Hope stays forever.",
};

export default function GraffitiPage() {
  return <GraffitiApp />;
}
