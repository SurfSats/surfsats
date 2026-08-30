export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  category: string;
  readingTime: string;
  paragraphs: string[];
  signoff?: string;
  originalPublication?: string;
  originalUrl?: string;
};

export type NewsLink = {
  id: string;
  title: string;
  url: string;
  source: string;
  date: string;
  blurb: string;
};

export type HandpickedItem = NewsLink & {
  featured?: boolean;
  image?: string;
};

export type FeedItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  date: string;
};

export type FeedSourceStatus = {
  name: string;
  ok: boolean;
};

export type JukeboxTrack = {
  id: string;
  title: string;
  artist: string;
  requestedBy?: string;
  duration: string;
  satsPaid?: number;
};

export type NavLink = {
  href: string;
  label: string;
};

export type NavGroupId = "machines" | "readouts" | "kit";

export type NavGroup = {
  id: NavGroupId;
  label: string;
  links: NavLink[];
};
