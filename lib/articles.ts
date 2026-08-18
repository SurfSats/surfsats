import type { Article } from "./types";

const articles: Article[] = [
  {
    slug: "21-sats-one-song",
    title: "21 Sats, One Song",
    excerpt:
      "The Global Jukebox is a shared soundtrack anyone can feed — one Lightning payment at a time.",
    date: "2026-08-16",
    author: "Maya Costa",
    category: "Jukebox",
    readingTime: "4 min",
    paragraphs: [
      "Every surf break has a soundtrack. A van stereo in the lot. A Bluetooth speaker on the sand. Someone's phone leaking reggae through a cracked window. SurfSats is taking that idea global.",
      "The Global Jukebox is a shared queue anyone on earth can add to. The price is simple on purpose: 21 sats. Not because it has to be expensive — because it should feel like tossing a coin in a jukebox at a beach bar.",
      "Lightning makes that possible. Instant, tiny, and borderless. You hear a song you want in the lineup, you pay, it goes in the queue. No account. No playlist wars. Just signal.",
      "Payments are not live yet. When they are, the same page you see today will take a Lightning invoice and drop your track into the queue. Until then, the jukebox is a preview of the room we are building: music, ocean time, and hard money in the same place.",
    ],
  },
  {
    slug: "dawn-patrol-hard-money",
    title: "Dawn Patrol, Hard Money",
    excerpt:
      "Surfers and Bitcoiners share the same muscle: show up early, ignore the noise, wait for the set.",
    date: "2026-08-10",
    author: "Kai Nakamura",
    category: "Culture",
    readingTime: "5 min",
    paragraphs: [
      "The best waves of the morning do not announce themselves. You paddle out in the dark, sit longer than feels reasonable, and trust that the ocean will send something worth the wait. Bitcoin feels the same if you have been around long enough.",
      "Both cultures punish impatience. You cannot force a swell. You cannot print a harder money. You can only put yourself in position — board waxed, keys secured — and let time do the compounding.",
      "That is why the two scenes keep colliding in beach towns. The same people who check buoys at 4 a.m. are the ones who understand why 21 million is not a marketing line. Scarcity is not an aesthetic. It is a constraint you learn to live inside.",
      "SurfSats exists in that overlap. Not finance Twitter in boardshorts. Not surf media with an orange-pill afterthought. Just writing, music, and a slower clock — ocean time and Bitcoin time, running in the same tide.",
    ],
  },
  {
    slug: "salt-sand-self-custody",
    title: "Salt, Sand, and Self-Custody",
    excerpt:
      "How a beach-town node, a cheap UPS, and a little salt-air paranoia keep the keys offline.",
    date: "2026-08-04",
    author: "Lina Voss",
    category: "Guides",
    readingTime: "7 min",
    paragraphs: [
      "Self-custody sounds clean until you live somewhere the air eats metal. Salt, humidity, and power cuts are not theoretical. They are Tuesday. If your setup only works in a climate-controlled apartment, it is not ready for a surf town.",
      "Start with the boring layer: power. A small UPS next to the node buys you the ten minutes it takes for the neighborhood generator to kick in. Silica packs in the enclosure. A sealed plastic bin beats a pretty metal case that rusts by monsoon.",
      "Then the keys. A hardware wallet in a dry bag is not a joke. Seed phrases do not belong in a notes app you open on cafe Wi-Fi. Write them. Store them like you store a spare leash — accessible to you, useless to a stranger who finds your van unlocked.",
      "None of this is maximalism. It is the same instinct that makes you rinse your board. Salt wins if you let it. Design the setup for the climate you actually live in, not the one in the tutorial.",
    ],
  },
  {
    slug: "the-lightning-lineup",
    title: "The Lightning Lineup",
    excerpt:
      "Instant payments at surf camps, ding-repair stalls, and the taco stand that finally ditched the tip jar.",
    date: "2026-07-22",
    author: "Diego Alvarez",
    category: "Lightning",
    readingTime: "6 min",
    paragraphs: [
      "A surf camp does not need a point-of-sale thesis. It needs something that works when the card terminal is offline and the nearest ATM is a dusty ride away. Lightning is not a brand story in that setting. It is a better rail.",
      "The pattern is repeating along warm coasts. Wax and water in the morning. A QR on a chalkboard by lunch. Travelers who already hold sats do not want to change money at the airport just to pay for a board rental.",
      "The interesting part is not the tech. It is the social contract. 21 sats for a song. A few thousand for a taco plate. A camp package invoiced overnight. Small enough to feel casual, serious enough that the owner does not have to wait three days for a processor.",
      "SurfSats will keep collecting these scenes — not as a directory, as field notes. The Lightning lineup is already forming. We are just writing it down and putting a jukebox in the middle.",
    ],
  },
  {
    slug: "orange-pill-blue-water",
    title: "Orange Pill, Blue Water",
    excerpt:
      "A field guide to talking Bitcoin in the lineup without becoming the person everyone paddles away from.",
    date: "2026-07-08",
    author: "Riley Chen",
    category: "Culture",
    readingTime: "5 min",
    paragraphs: [
      "There is a right way and a wrong way to bring Bitcoin into a conversation between sets. The wrong way starts with price and ends with a lecture. The right way starts with something the other person already cares about: travel, tools, or the feeling that the money in their pocket is leaking.",
      "Surfers already live with volatility. Swell arrives or it does not. Flights get cancelled. Local cash gets weird after a long trip. You do not need a whiteboard. You need a story that fits in the time it takes for the next set to show.",
      "Keep it physical. A Lightning QR for post-session beer. A note about why you do not carry a brick of cash through three airports. If they want more, they will ask. If they do not, you still have waves to catch.",
      "The orange pill works better in salt water when it stays humble. SurfSats is not here to convert the beach. It is here for the people who already feel the overlap — and for anyone curious enough to paddle over.",
    ],
  },
];

export function getArticles() {
  return [...articles].sort((a, b) => b.date.localeCompare(a.date));
}

export function getLatestArticles(count = 3) {
  return getArticles().slice(0, count);
}

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}
