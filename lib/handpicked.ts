import type { HandpickedItem } from "./types";

const STANDING_LEAD_ID = "hp-21-lessons";

// Curated signal. Edit this list anytime.
// featured: true = STANDING / canon. omitted or false = LATEST.
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
    featured: true,
  },
  {
    id: "hp-whitepaper",
    title: "Bitcoin: A Peer-to-Peer Electronic Cash System",
    blurb:
      "Nine pages. No VC. No brand guidelines. The source document. If you have not read it in a while, read it again.",
    source: "Satoshi Nakamoto",
    date: "2008-10-31",
    url: "https://bitcoin.org/bitcoin.pdf",
    featured: true,
  },
  {
    id: "hp-hrf-nostr-grants-2026-08",
    title: "The $400,000 Bet on Censorship-Resistant Money",
    blurb:
      "HRF just dropped half a billion sats on builders shipping mobile-money bridges, offline Lightning, and Nostr messengers for when the state flips the kill switch. Infrastructure, not slogans.",
    source: "NostrMag",
    date: "2026-08-25",
    url: "https://nostrmag.com/article/w35nostr01",
    featured: false,
  },
  {
    id: "hp-flint-btcpay-2026-08",
    title: "Flint is now live in the BTCPay plugin store",
    blurb:
      "Boltz is gone. Seth shipped the replacement: nodeless Lightning for BTCPay, per-store wallets, automatic sweeps, zero channels required.",
    source: "Seth For Privacy",
    date: "2026-08-26",
    url: "https://github.com/sethforprivacy/flint",
    featured: false,
  },
];

export function getLatestHandpicked() {
  return handpicked
    .filter((item) => !item.featured)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getStandingHandpicked() {
  return handpicked
    .filter((item) => item.featured)
    .sort((a, b) => {
      if (a.id === STANDING_LEAD_ID) return -1;
      if (b.id === STANDING_LEAD_ID) return 1;
      return b.date.localeCompare(a.date);
    });
}

export function getHandpicked() {
  return [...getStandingHandpicked(), ...getLatestHandpicked()];
}
