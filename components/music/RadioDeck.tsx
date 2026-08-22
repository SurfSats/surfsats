import { ButtonLink } from "@/components/ui/ButtonLink";
import { cn } from "@/lib/cn";
import { JUKEBOX_PRICE_SATS } from "@/lib/jukebox";
import {
  FOUNTAIN_URL,
  NAPSTR_URL,
  PODCAST_INDEX_URL,
  PODVERSE_URL,
  STEMSTR_URL,
  TRACKSTR_GITHUB_URL,
  TRACKSTR_URL,
  TUNESTR_URL,
  WAVLAKE_EMBED_SRC,
  WAVLAKE_URL,
  ZAP_STREAM_URL,
  ZAPSTR_URL,
  ZAPTRAX_URL,
} from "@/lib/music";

const actionClass =
  "w-full min-w-0 whitespace-normal text-center leading-snug sm:w-auto";

const accentText = {
  sats: "text-sats",
  cyan: "text-cyan",
  magenta: "text-magenta",
} as const;

function DeckLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="pt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted lg:col-span-2">
      {children}
    </p>
  );
}

function RadioCard({
  code,
  kicker,
  title,
  accent,
  wide = false,
  split = false,
  children,
  actions,
}: {
  code: string;
  kicker: string;
  title: string;
  accent: keyof typeof accentText;
  wide?: boolean;
  split?: boolean;
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <article
      className={cn(
        "panel panel-hover flex min-w-0 flex-col p-5 sm:p-6",
        wide && "lg:col-span-2",
        split && "lg:flex-row lg:items-center lg:justify-between lg:gap-8",
      )}
    >
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-mono text-[11px] uppercase tracking-[0.18em]",
            accentText[accent],
          )}
        >
          {code} · {kicker}
        </p>
        <h2 className="mt-3 break-words font-display text-2xl font-bold uppercase tracking-tight">
          {title}
        </h2>
        <div className="mt-3 min-w-0 text-sm leading-relaxed text-muted">
          {children}
        </div>
      </div>
      <div
        className={cn(
          "mt-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap",
          split && "lg:mt-0 lg:shrink-0",
        )}
      >
        {actions}
      </div>
    </article>
  );
}

export function RadioDeck() {
  return (
    <div className="mt-10 grid items-stretch gap-4 sm:mt-12">
      <RadioCard
        code="01"
        kicker="pirate_queue"
        title="Live Jukebox"
        accent="sats"
        wide
        split
        actions={
          <ButtonLink href="/jukebox" className={actionClass}>
            open jukebox
          </ButtonLink>
        }
      >
        Pay {JUKEBOX_PRICE_SATS} sats, queue a track, ride the pirate ship.
      </RadioCard>

      <RadioCard
        code="02"
        kicker="value_for_value"
        title="Wavlake"
        accent="cyan"
        wide
        actions={
          <ButtonLink href={WAVLAKE_URL} external className={actionClass}>
            open wavlake
          </ButtonLink>
        }
      >
        <p>Value-for-value tracks. Stream and zap artists directly.</p>
        <div className="radio-embed mt-5 max-w-full overflow-hidden border border-cyan/20 bg-black/50">
          <iframe
            src={WAVLAKE_EMBED_SRC}
            title="Wavlake 21-day chart"
            className="block h-[18rem] w-full max-w-full sm:h-[22rem]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allow="encrypted-media; clipboard-write; fullscreen"
          />
        </div>
      </RadioCard>

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <RadioCard
          code="03"
          kicker="live_sets"
          title="Live Streams"
          accent="magenta"
          actions={
            <>
              <ButtonLink href={ZAP_STREAM_URL} external className={actionClass}>
                open zap.stream
              </ButtonLink>
              <ButtonLink
                href={TUNESTR_URL}
                external
                variant="ghost"
                className={actionClass}
              >
                open tunestr
              </ButtonLink>
            </>
          }
        >
          Live sets and radio on Nostr. Zap while it plays.
        </RadioCard>

        <RadioCard
          code="04"
          kicker="nostr_native"
          title="ZapTrax"
          accent="sats"
          actions={
            <ButtonLink href={ZAPTRAX_URL} external className={actionClass}>
              open zaptrax
            </ButtonLink>
          }
        >
          Nostr-native music player, playlists, and Lightning zaps.
        </RadioCard>
      </div>

      <DeckLabel>shows · longform</DeckLabel>

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <RadioCard
          code="05"
          kicker="v4v_shows"
          title="Fountain"
          accent="cyan"
          actions={
            <ButtonLink href={FOUNTAIN_URL} external className={actionClass}>
              open fountain
            </ButtonLink>
          }
        >
          Value-for-value podcasts and live shows. Support creators with sats.
        </RadioCard>

        <RadioCard
          code="06"
          kicker="longform"
          title="Podcasts / Longform"
          accent="magenta"
          actions={
            <>
              <ButtonLink href={FOUNTAIN_URL} external className={actionClass}>
                open fountain
              </ButtonLink>
              <ButtonLink
                href={PODVERSE_URL}
                external
                variant="ghost"
                className={actionClass}
              >
                open podverse
              </ButtonLink>
              <ButtonLink
                href={PODCAST_INDEX_URL}
                external
                variant="ghost"
                className={actionClass}
              >
                open podcast index
              </ButtonLink>
            </>
          }
        >
          Permissionless audio for Bitcoiners — listen, zap, no middleman.
        </RadioCard>
      </div>

      <DeckLabel>sovereign · own / share</DeckLabel>

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <RadioCard
          code="07"
          kicker="own_your_files"
          title="Napstr"
          accent="sats"
          actions={
            <ButtonLink href={NAPSTR_URL} external className={actionClass}>
              open napstr
            </ButtonLink>
          }
        >
          <p>
            Own your music again. Nostr discovery, private transfers — no
            Spotify middleman.
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-cyan">
            Desktop app · Windows / Linux · Discovery via Nostr
          </p>
        </RadioCard>

        <RadioCard
          code="08"
          kicker="share_collab"
          title="Share & Collab"
          accent="cyan"
          actions={
            <>
              <ButtonLink href={ZAPSTR_URL} external className={actionClass}>
                open zapstr
              </ButtonLink>
              <ButtonLink
                href={STEMSTR_URL}
                external
                className={actionClass}
              >
                open stemstr
              </ButtonLink>
            </>
          }
        >
          Upload, share, and collab on tracks. Zap artists on Nostr.
        </RadioCard>
      </div>

      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        Share files. Seed catalogs. Keep the keys.
      </p>

      <RadioCard
        code="09"
        kicker="now_playing"
        title="Now Playing"
        accent="magenta"
        wide
        split
        actions={
          <>
            <ButtonLink href={TRACKSTR_URL} external className={actionClass}>
              open the global now-playing wall
            </ButtonLink>
            <ButtonLink
              href={TRACKSTR_GITHUB_URL}
              external
              variant="ghost"
              className={actionClass}
            >
              trackstr on github
            </ButtonLink>
          </>
        }
      >
        <p>What the network is listening to — live scrobbles on Nostr.</p>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-cyan">
          No central chart. Just relays and ears.
        </p>
      </RadioCard>
    </div>
  );
}
