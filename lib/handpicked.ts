import type { HandpickedItem } from "./types";

// Curated signal. Edit this list anytime.
// The first `featured: true` item leads the HAND_PICKED section.
const handpicked: HandpickedItem[] = [
  {
    id: "hp-21-lessons",
    title: "21 Lessons",
    blurb:
      "Gigi's field manual for leaving fiat time. Short, sharp, and still the cleanest orange pill that does not talk down to you.",
    source: "21lessons.com",
    date: "2026-01-01",
    url: "https://21lessons.com/",
    featured: true,
  },
  {
    id: "hp-stackchain",
    title: "Stackchain Magazine",
    blurb:
      "Print for people who still touch paper. The original home of ITS ALWAYS DARKEST BEFORE DAWN STRIKES — and the kind of room SurfSats came out of.",
    source: "Stackchain Magazine",
    date: "2026-01-14",
    url: "https://www.stackchainmagazine.net/",
  },
  {
    id: "hp-whitepaper",
    title: "Bitcoin: A Peer-to-Peer Electronic Cash System",
    blurb:
      "Nine pages. No VC. No brand guidelines. The source document. If you have not read it in a while, read it again.",
    source: "Satoshi Nakamoto",
    date: "2008-10-31",
    url: "https://bitcoin.org/bitcoin.pdf",
  },
];

export function getHandpicked() {
  return [...handpicked].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return b.date.localeCompare(a.date);
  });
}
