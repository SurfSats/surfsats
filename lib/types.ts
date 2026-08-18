export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  category: string;
  readingTime: string;
  paragraphs: string[];
};

export type NewsLink = {
  id: string;
  title: string;
  url: string;
  source: string;
  date: string;
  blurb: string;
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
