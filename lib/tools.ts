export type ToolTag = "Music" | "Nostr" | "Map" | "Fun" | "Spend";

export type ToolSectionId = "music" | "nostr" | "maps" | "fun" | "spend";

export type DirectoryTool = {
  id: string;
  name: string;
  url: string;
  blurb: string;
  why: string;
  tag: ToolTag;
  section: ToolSectionId;
};

export type ToolSection = {
  id: ToolSectionId;
  eyebrow: string;
  title: string;
  description: string;
};

// Add tools here. They land in the matching section automatically.
export const directoryTools: DirectoryTool[] = [
  {
    id: "wavlake",
    name: "Wavlake",
    url: "https://www.wavlake.com",
    blurb: "Music that pays the artist in sats. Zap a song like you mean it.",
    why: "The jukebox's cousin. Same Lightning. Better taste than Spotify's committee.",
    tag: "Music",
    section: "music",
  },
  {
    id: "fountain",
    name: "Fountain",
    url: "https://www.fountain.fm",
    blurb: "Podcasts that stream sats while you listen. Attention is not free.",
    why: "Dawn patrol audio with a value-for-value rail. No ads yelling at you.",
    tag: "Music",
    section: "music",
  },
  {
    id: "podverse",
    name: "Podverse",
    url: "https://podverse.fm",
    blurb: "Open-source podcast player. Clips, playlists, no walled garden.",
    why: "For people who want their media stack as permissionless as their money.",
    tag: "Music",
    section: "music",
  },
  {
    id: "nostr",
    name: "Nostr",
    url: "https://nostr.com",
    blurb: "Notes and zaps. No CEO. No ToS surprise. Just keys and relays.",
    why: "The social layer that does not ask the beach for a permit.",
    tag: "Nostr",
    section: "nostr",
  },
  {
    id: "nstart",
    name: "Nstart",
    url: "https://nstart.me",
    blurb: "Make keys. Back them up. Get out. Onboarding without a babysitter.",
    why: "First session. Do this once, then forget the walled gardens exist.",
    tag: "Nostr",
    section: "nostr",
  },
  {
    id: "alby",
    name: "Alby",
    url: "https://getalby.com",
    blurb: "Bitcoin + Nostr in the browser. Wallet, signer, zap button on the toolbar.",
    why: "The companion that makes the rest of this list actually pay.",
    tag: "Nostr",
    section: "nostr",
  },
  {
    id: "yondar",
    name: "Yondar",
    url: "https://go.yondar.me",
    blurb: "A social map. Drop a pin. See where your people actually are.",
    why: "Google Maps with a keypair and no ad tower.",
    tag: "Nostr",
    section: "nostr",
  },
  {
    id: "shopstr",
    name: "Shopstr",
    url: "https://shopstr.store",
    blurb: "Buy and sell for sats over Nostr. No storefront landlord.",
    why: "A stall on the timechain. Cash is Lightning.",
    tag: "Nostr",
    section: "nostr",
  },
  {
    id: "plebeian-market",
    name: "Plebeian Market",
    url: "https://plebeian.market",
    blurb: "Marketplace for sats. List it. Zap it. Ship it.",
    why: "Pleb commerce. Same keys you already use to yell on the timeline.",
    tag: "Nostr",
    section: "nostr",
  },
  {
    id: "yakihonne",
    name: "YakiHonne",
    url: "https://yakihonne.com",
    blurb: "Social client with Bitcoin bolted on. Notes, long-form, widgets.",
    why: "One app when you want the feed and the wallet in the same room.",
    tag: "Nostr",
    section: "nostr",
  },
  {
    id: "habla",
    name: "Habla",
    url: "https://habla.news",
    blurb: "Long-form Nostr. Essays, not just 280-character weather reports.",
    why: "Read something longer than a zap note. Still permissionless.",
    tag: "Nostr",
    section: "nostr",
  },
  {
    id: "nests",
    name: "Nests",
    url: "https://nostrnests.com",
    blurb: "Audio rooms on Nostr. Talk. Listen. Leave. No Spaces landlord.",
    why: "Voice notes for people who refuse a corporate clubhouse.",
    tag: "Nostr",
    section: "nostr",
  },
  {
    id: "formstr",
    name: "Formstr",
    url: "https://formstr.app",
    blurb: "Forms, votes, inputs. You hold the responses. Relays carry the rest.",
    why: "Surveys without a Google account hovering over the answers.",
    tag: "Nostr",
    section: "nostr",
  },
  {
    id: "nostree",
    name: "Nostree",
    url: "https://nostree.me",
    blurb: "Lists and links on your npub. A link-in-bio that you actually own.",
    why: "Stop renting a page from a startup that will pivot.",
    tag: "Nostr",
    section: "nostr",
  },
  {
    id: "zapplepay",
    name: "Zapple Pay",
    url: "https://www.zapplepay.com",
    blurb: "Zap from any client. React ⚡. The wallet pays. Even the locked ones.",
    why: "Apple banned zaps. This is the side door.",
    tag: "Nostr",
    section: "nostr",
  },
  {
    id: "treasures",
    name: "Treasures",
    url: "https://treasures.to",
    blurb: "Geocaching on Nostr. Hide a cache. Find one. Log it to the relays.",
    why: "Dirt time with a keypair. The map is not a corporation.",
    tag: "Nostr",
    section: "nostr",
  },
  {
    id: "primal",
    name: "Primal",
    url: "https://primal.net",
    blurb: "Fast Nostr client with a built-in wallet. Looks finished. Still cypherpunk.",
    why: "Easiest on-ramp if you want to zap a note before the set closes out.",
    tag: "Nostr",
    section: "nostr",
  },
  {
    id: "damus",
    name: "Damus",
    url: "https://damus.io",
    blurb: "The iOS Nostr client that got banned for being too free. Badge of honor.",
    why: "If Apple hated it, it probably belongs in this directory.",
    tag: "Nostr",
    section: "nostr",
  },
  {
    id: "amethyst",
    name: "Amethyst",
    url: "https://amethyst.social",
    blurb: "Android Nostr, built for people who actually use relays.",
    why: "Pocket client for the van. Keys stay yours.",
    tag: "Nostr",
    section: "nostr",
  },
  {
    id: "coinatmradar",
    name: "Coin ATM Radar",
    url: "https://coinatmradar.com",
    blurb: "Map of Bitcoin ATMs. Ugly machines. Useful when cash is a trap.",
    why: "Landed in a new town. Need sats. This is the buoy report.",
    tag: "Map",
    section: "maps",
  },
  {
    id: "btcmap",
    name: "BTC Map",
    url: "https://btcmap.org",
    blurb: "Merchants that take Bitcoin. Real shops. Real coffee. Real wax.",
    why: "The only map that answers: can I pay this beach bar in sats?",
    tag: "Map",
    section: "maps",
  },
  {
    id: "satoshis-place",
    name: "Satoshi's Place",
    url: "https://satoshis.place",
    blurb: "A Lightning pixel canvas. Pay a sat. Leave a mark. Fight the crowd.",
    why: "Collective graffiti. Same energy as the Wave Pool, noisier.",
    tag: "Fun",
    section: "fun",
  },
  {
    id: "thndr",
    name: "THNDR Games",
    url: "https://thndr.games",
    blurb: "Games that pay sats. Skill optional. Lightning required.",
    why: "When the swell is flat and you still want to stack something.",
    tag: "Fun",
    section: "fun",
  },
  {
    id: "zbd",
    name: "ZBD",
    url: "https://zbd.gg",
    blurb: "Play, stream, get paid in sats. Gaming wallet with a Lightning spine.",
    why: "For the indoor session. Still orange-pilled.",
    tag: "Fun",
    section: "fun",
  },
  {
    id: "stacker-news",
    name: "Stacker News",
    url: "https://stacker.news",
    blurb: "Hacker News, but posts and comments earn sats. Skin in the thread.",
    why: "Signal over noise, priced in the only unit that matters.",
    tag: "Fun",
    section: "fun",
  },
  {
    id: "bitrefill",
    name: "Bitrefill",
    url: "https://www.bitrefill.com",
    blurb: "Gift cards and top-ups for sats. Spend Bitcoin without asking a bank.",
    why: "When the merchant is still fiat-brained. You do not have to be.",
    tag: "Spend",
    section: "spend",
  },
];

export const toolSections: ToolSection[] = [
  {
    id: "music",
    eyebrow: "music_and_media",
    title: "Music & Media",
    description: "Soundtracks that settle in sats. No label middleman taking the set.",
  },
  {
    id: "nostr",
    eyebrow: "nostr_tools",
    title: "Nostr Tools",
    description:
      "Clients, markets, maps, rooms, forms. Same keys. No landlord. Zap anything that moves.",
  },
  {
    id: "maps",
    eyebrow: "dirt_and_sats",
    title: "Maps & Real World",
    description: "ATMs, shops, and the analog coastline. Leave the house.",
  },
  {
    id: "fun",
    eyebrow: "play_the_protocol",
    title: "Fun & Experiments",
    description: "Pixels, games, and comment sections with a mempool.",
  },
  {
    id: "spend",
    eyebrow: "exit_fiat",
    title: "Spend & Pay",
    description: "Turn sats into real stuff. The boring miracle.",
  },
];

export function getToolDirectory() {
  return toolSections.map((section) => ({
    ...section,
    tools: directoryTools.filter((tool) => tool.section === section.id),
  }));
}
