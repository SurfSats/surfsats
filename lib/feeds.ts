import type { FeedItem, FeedSourceStatus } from "./types";

export type FeedSource = {
  name: string;
  url: string;
};

// Pleb / cypherpunk / independent sources. Each fetch is isolated —
// one dead feed will not take down the rest of THE_WIRE.
export const feedSources: FeedSource[] = [
  { name: "No Bullshit Bitcoin", url: "https://nobsbitcoin.com/rss/" },
  { name: "Bitcoin Optech", url: "https://bitcoinops.org/feed.xml" },
  { name: "Cypherpunk Cogitations", url: "https://blog.lopp.net/rss/" },
  { name: "dergigi", url: "https://dergigi.com/feed.xml" },
  {
    name: "This Month in Bitcoin Privacy",
    url: "https://enegnei.github.io/This-Month-In-Bitcoin-Privacy/feed.xml",
  },
  { name: "Stacker News ~bitcoin", url: "https://stacker.news/~bitcoin/rss" },
  {
    name: "Bitcoin Core announcements",
    url: "https://bitcoincore.org/en/announcements.xml",
  },
  { name: "TFTC / Marty Bent", url: "https://tftc.io/martys-bent/rss/" },
  { name: "Diverter", url: "https://diverter.hostyourown.tools/rss/" },
  { name: "The Bitcoin Manual", url: "https://thebitcoinmanual.com/feed/" },
  { name: "Econoalchemist", url: "https://econoalchemist.com/feed.xml" },
  { name: "Bitcoin Audible", url: "https://bitcoinaudible.com/feed" },
];

const FETCH_MS = 7000;
const PER_FEED = 2;
const MAX_ITEMS = 16;

export async function getLiveFeeds(): Promise<{
  items: FeedItem[];
  sources: FeedSourceStatus[];
}> {
  const results = await Promise.all(
    feedSources.map(async (source) => {
      try {
        const items = await fetchFeed(source);
        return { source: source.name, ok: true, items };
      } catch {
        return { source: source.name, ok: false, items: [] as FeedItem[] };
      }
    }),
  );

  const items = results
    .flatMap((result) => result.items)
    .sort((a, b) => toStamp(b.date) - toStamp(a.date))
    .slice(0, MAX_ITEMS);

  return {
    items,
    sources: results.map((result) => ({ name: result.source, ok: result.ok })),
  };
}

async function fetchFeed(source: FeedSource): Promise<FeedItem[]> {
  const response = await fetch(source.url, {
    headers: {
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      "User-Agent": "SurfSatsSignal/1.0",
    },
    signal: AbortSignal.timeout(FETCH_MS),
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`feed ${source.name} ${response.status}`);
  }

  const xml = await response.text();
  return parseFeed(xml, source.name).slice(0, PER_FEED);
}

function parseFeed(xml: string, source: string): FeedItem[] {
  const blocks =
    xml.match(/<item[\s\S]*?<\/item>/gi) ??
    xml.match(/<entry[\s\S]*?<\/entry>/gi) ??
    [];

  return blocks
    .map((block, index) => {
      const title = decode(tag(block, "title"));
      const url =
        attr(block, "link", "href") ||
        decode(tag(block, "link")) ||
        decode(tag(block, "guid"));
      const date =
        tag(block, "pubDate") ||
        tag(block, "updated") ||
        tag(block, "published") ||
        tag(block, "dc:date");

      if (!title || !url) return null;

      return {
        id: `${source}-${index}-${url}`,
        title,
        url,
        source,
        date,
      };
    })
    .filter((item): item is FeedItem => item !== null);
}

function tag(block: string, name: string) {
  const cdata = block.match(
    new RegExp(`<${escapeReg(name)}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`, "i"),
  );
  if (cdata?.[1]) return cdata[1].trim();

  const plain = block.match(
    new RegExp(`<${escapeReg(name)}[^>]*>([\\s\\S]*?)</${escapeReg(name)}>`, "i"),
  );
  return plain?.[1]?.trim() ?? "";
}

function attr(block: string, name: string, attribute: string) {
  const match = block.match(
    new RegExp(`<${escapeReg(name)}[^>]*${escapeReg(attribute)}=["']([^"']+)["']`, "i"),
  );
  return match?.[1] ?? "";
}

function decode(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();
}

function escapeReg(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toStamp(value: string) {
  const stamp = Date.parse(value);
  return Number.isNaN(stamp) ? 0 : stamp;
}
