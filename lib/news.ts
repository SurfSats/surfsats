import type { NewsLink } from "./types";

export const newsLinks: NewsLink[] = [
  {
    id: "news-1",
    title: "El Salvador surf towns keep settling coffee and wax in sats",
    url: "https://example.com/el-salvador-surf-sats",
    source: "Bitcoin Magazine",
    date: "2026-08-17",
    blurb:
      "Placeholder. A look at beach-break shops that take Lightning without making it a gimmick.",
  },
  {
    id: "news-2",
    title: "Swell models and fee markets: why surfers already think in cycles",
    url: "https://example.com/swell-models-fee-markets",
    source: "The Orange Coast",
    date: "2026-08-14",
    blurb:
      "Placeholder. Forecasts, patience, and why both oceans and mempools punish people who cannot wait.",
  },
  {
    id: "news-3",
    title: "A pop-up board-repair stall in Bali now posts a Lightning QR",
    url: "https://example.com/bali-board-repair-lightning",
    source: "Surf News Wire",
    date: "2026-08-11",
    blurb:
      "Placeholder. Ding repair, dinged fiat rails, and a handwritten sign that just says 21.",
  },
  {
    id: "news-4",
    title: "On-chain vs. Lightning for traveling surfers: a practical split",
    url: "https://example.com/onchain-vs-lightning-travel",
    source: "Stacker News",
    date: "2026-08-08",
    blurb:
      "Placeholder. Cold storage at home, Lightning in the lineup, and what to do when the cafe Wi-Fi dies.",
  },
  {
    id: "news-5",
    title: "Portugal's west coast hosts another circular Bitcoin surf week",
    url: "https://example.com/portugal-bitcoin-surf-week",
    source: "European Bitcoin News",
    date: "2026-08-03",
    blurb:
      "Placeholder. Dawn patrols, workshops, and a closing party that should have been a jukebox.",
  },
  {
    id: "news-6",
    title: "Why beach bars are a natural fit for 21-sat micropayments",
    url: "https://example.com/beach-bar-micropayments",
    source: "Lightning Dispatch",
    date: "2026-07-28",
    blurb:
      "Placeholder. Songs, snacks, and tips that are too small for cards and too real to ignore.",
  },
];

export function getNewsLinks() {
  return [...newsLinks].sort((a, b) => b.date.localeCompare(a.date));
}
