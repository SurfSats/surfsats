# SurfSats

Lightning sandbox. Five machines on the floor. 21 sats. No accounts.

Bitcoin + surf lifestyle: graffiti on the wall, arcade credits, a tab at the harbor, a story chain, and Surf Radio. Built with Next.js 15 (App Router), React 19, TypeScript, and Tailwind CSS.

Sats in, sats out. Zero altcoins.

## Machines

Every machine invoices **21 sats** over Lightning. Any wallet. No login.

| Path | Machine |
| --- | --- |
| `/graffiti` | Spray the wall |
| `/arcade` | Wave Runner, retro cabinets, Anarch, Bouncing Bitties |
| `/tab` | Sit the tab |
| `/story` | Write the next line |
| `/music` | Surf Radio + bottle pulls (`/jukebox` 308s here) |

Readouts (no invoice): `/tidechain`, `/lineup`, `/signal`, `/fiat`. Kit: `/tools`, `/about`. Articles and news still live at `/articles` and `/news`.

## Lightning stack

Payments are live. This is not a mock-only demo.

**Invoice backend — Alby Hub REST.** Server routes create and look up invoices against Alby Hub (`ALBY_ACCESS_TOKEN` → `https://api.getalby.com` by default, override with `ALBY_API_BASE`). Hub is the node. Alby’s browser wallet typically reaches that same Hub over NWC; this app does not speak NWC itself. It issues BOLT11 over REST and lets the wallet pay it.

**WebLN pay path.** If `window.webln` is present, One-Tap Zap calls `enable()` then `sendPayment(bolt11)`. QR + copy remain the fallback for every other Lightning wallet.

**Settlement.** Alby POSTs `invoice.settled` / incoming to `POST /api/lightning/webhook` (optional Svix secret `ALBY_WEBHOOK_SECRET`). Each machine also has a check route that claims the paid invoice (graffiti `/api/lightning/check`, arcade `/api/arcade/check`, tab `/api/tab/check`, story `/api/story/check`, radio `/api/jukebox/bottle/check`).

**Live channels (SSE).** Same-origin EventSource, because Next/Vercel does not upgrade raw WebSockets.

- `GET /api/lightning/live?hash=<payment_hash>` — per-invoice `invoice_paid` / `settled` (preimage). Optional extra socket: `NEXT_PUBLIC_LIGHTNING_WS`.
- `GET /api/lightning/tape/live` — global settlement tape. Snapshot, then `tape` events.
- `GET /api/lightning/tape` — JSON history from stores so the header tape is never blank.

**Settle ritual.** On `invoice_paid` / `settled`: 8-bit square-wave chime (`playSettleChime` in `lib/sfx.ts`), mute toggle in the header (`localStorage` key `surfsats-sfx-muted`), retro confetti over the QR, orange status flash with checkmark and preimage.

Mode (`lib/lightning-mock.ts` `lightningMode()`):

| Condition | Mode |
| --- | --- |
| `ALBY_ACCESS_TOKEN` set | `alby` — real Hub invoices |
| no token, `NODE_ENV === "development"` | `mock` — auto-settle invoices |
| no token, production | `offline` — `503 lightning is offline right now` |

## Local development

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` if you want. You do **not** need Alby credentials to exercise the UI.

### Dev mock invoices

When `NODE_ENV === "development"` and `ALBY_ACCESS_TOKEN` is missing (or Alby is unreachable), invoice routes mint a mock BOLT11 (`payment_hash` prefix `devmock`). The invoice **auto-settles after 8 seconds** (`MOCK_SETTLE_MS`). Check + SSE treat it as paid, the machine claims the action, the tape gets a line, and the chime/confetti fire. Use this for rapid UI work without a node.

Hashes that already look like `devmock…` keep that behavior even if you add a token later.

### Live Hub (optional)

To hit a real Alby Hub from local:

```bash
# .env.local
ALBY_ACCESS_TOKEN=           # Hub / Alby access token
ALBY_WEBHOOK_SECRET=         # optional Svix signing secret
ALBY_API_BASE=               # optional; default https://api.getalby.com
DATABASE_URL=                # Neon pooled URL; without it, paid state is process-local
```

Point Hub’s webhook at your tunnel: `https://<host>/api/lightning/webhook`.

```bash
npm run build
npm run start
npm run lint
```

Lib tests (Node strip-types):

```bash
node --experimental-strip-types --test lib/*.test.ts
```

## Content

Copy and feeds still live in modules you can swap without touching layout:

- `lib/articles.ts`, `lib/news.ts`, `lib/handpicked.ts`
- `lib/jukebox.ts`, `lib/music.ts`
- `lib/copy.ts` — shared zap / settle strings
- `public/bottles.json` — radio bottle lines

Paid graffiti, arcade credits, tab grants, story lines, and bottle pulls persist in Neon when `DATABASE_URL` is set; otherwise they stay in the local process (and a file fallback on disk).
