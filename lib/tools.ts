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
  {
    id: "alby",
    name: "Alby",
    url: "https://getalby.com",
    blurb: "Browser wallet and Lightning toolkit. Zap the web from the toolbar.",
    why: "Placeholder for the full spend stack — Alby, Wavelength, the rest. Coming.",
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
    eyebrow: "notes_and_zaps",
    title: "Nostr",
    description: "Social without a landlord. Pick a client. Keep the keys.",
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
