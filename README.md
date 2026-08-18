# SurfSats

Bitcoin + surf lifestyle. Stories from the lineup and a Global Jukebox you can feed with 21 sats.

Built with Next.js 15 (App Router), TypeScript, and Tailwind CSS.

## Pages

- `/` — hero, intro, latest articles, jukebox highlight
- `/articles` — article list
- `/articles/[slug]` — individual article
- `/news` — curated Bitcoin + surf links
- `/jukebox` — now playing, queue, and a 21-sat request form

Lightning payments are not wired yet. The jukebox form is the hook for invoices later.

## Local development

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build
npm run start
npm run lint
```

## Content

Placeholder copy lives in:

- `lib/articles.ts`
- `lib/news.ts`
- `lib/jukebox.ts`

Swap those modules for a CMS, markdown, or a Lightning-backed queue without touching the page layout.
