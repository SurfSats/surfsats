"use client";

import { JukeboxDeck } from "@/components/jukebox/JukeboxDeck";
import { SignalStatus } from "@/components/jukebox/SignalStatus";
import {
  RadioCard,
  RadioStationPreview,
  radioActionClass,
} from "@/components/music/RadioCard";
import { ButtonLink } from "@/components/ui/ButtonLink";
import {
  JUKEBOX_PRICE_SATS,
  WAVLAKE_REQUEST_SATS,
} from "@/lib/jukebox";
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

function DeckLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="pt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
      {children}
    </p>
  );
}

function PreviewSplit({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-full min-h-[12rem] divide-y divide-cyan/20 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
      {children}
    </div>
  );
}

function JukeboxPanel() {
  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-[11px] uppercase leading-relaxed tracking-[0.14em] text-sats">
        {JUKEBOX_PRICE_SATS} sats ship library / {WAVLAKE_REQUEST_SATS}{" "}
        wavlake · anti-spam, not a record deal · surfsats does not invoice
      </p>
      <SignalStatus />
      <ol className="space-y-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        <li>
          <span className="text-magenta">01</span> search the jukebox tab on
          the ship
        </li>
        <li>
          <span className="text-magenta">02</span> zap {JUKEBOX_PRICE_SATS}{" "}
          (library) or {WAVLAKE_REQUEST_SATS} (wavlake)
        </li>
        <li>
          <span className="text-magenta">03</span> the public is the DJ
        </li>
      </ol>
      <JukeboxDeck compact />
    </div>
  );
}

function WavlakePanel() {
  return (
    <RadioCard
      id="wavlake"
      code="02"
      kicker="value_for_value"
      title="Wavlake"
      accent="cyan"
      chips={[{ label: "embed", tone: "cyan" }]}
      blurb="Value-for-value tracks. Stream and zap artists directly."
      media={
        <iframe
          src={WAVLAKE_EMBED_SRC}
          title="Wavlake 21-day chart"
          className="h-[18rem] w-full sm:h-[22rem]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allow="encrypted-media; clipboard-write; fullscreen"
        />
      }
      mediaClassName="min-h-[18rem] sm:min-h-[22rem]"
      actions={
        <ButtonLink href={WAVLAKE_URL} external className={radioActionClass}>
          open wavlake
        </ButtonLink>
      }
    />
  );
}

function LivePanel() {
  return (
    <RadioCard
      id="live"
      code="03"
      kicker="live_sets"
      title="Live Streams"
      accent="magenta"
      chips={[{ label: "external", tone: "muted" }]}
      blurb="Live sets and radio on Nostr. Zap while it plays."
      media={
        <PreviewSplit>
          <RadioStationPreview
            href={ZAP_STREAM_URL}
            external
            kicker="zap.stream"
            title="Live video"
            detail="Sets · chat · zaps"
          />
          <RadioStationPreview
            href={TUNESTR_URL}
            external
            kicker="tunestr"
            title="Live radio"
            detail="Value-for-value audio"
          />
        </PreviewSplit>
      }
      actions={
        <>
          <ButtonLink href={ZAP_STREAM_URL} external className={radioActionClass}>
            open zap.stream
          </ButtonLink>
          <ButtonLink
            href={TUNESTR_URL}
            external
            variant="ghost"
            className={radioActionClass}
          >
            open tunestr
          </ButtonLink>
        </>
      }
    />
  );
}

function ZaptraxPanel() {
  return (
    <RadioCard
      id="zaptrax"
      code="04"
      kicker="nostr_native"
      title="ZapTrax"
      accent="sats"
      chips={[{ label: "external", tone: "muted" }]}
      blurb="Nostr-native music player, playlists, and Lightning zaps."
      media={
        <RadioStationPreview
          href={ZAPTRAX_URL}
          external
          kicker="player"
          title="ZapTrax"
          detail="Playlists · search · zap tracks"
        />
      }
      actions={
        <ButtonLink href={ZAPTRAX_URL} external className={radioActionClass}>
          open zaptrax
        </ButtonLink>
      }
    />
  );
}

function PodcastsPanel() {
  return (
    <section id="podcasts" className="radio-section grid items-stretch gap-4">
      <DeckLabel>shows · longform</DeckLabel>
      <div className="grid items-stretch gap-4">
        <RadioCard
          code="05"
          kicker="v4v_shows"
          title="Fountain"
          accent="cyan"
          chips={[{ label: "external", tone: "muted" }]}
          blurb="Value-for-value podcasts and live shows. Support creators with sats."
          media={
            <RadioStationPreview
              href={FOUNTAIN_URL}
              external
              kicker="fountain.fm"
              title="Boost while you listen"
              detail="Podcasts · live shows · sats"
            />
          }
          actions={
            <ButtonLink href={FOUNTAIN_URL} external className={radioActionClass}>
              open fountain
            </ButtonLink>
          }
        />

        <RadioCard
          code="06"
          kicker="longform"
          title="Podcasts / Longform"
          accent="magenta"
          chips={[{ label: "external", tone: "muted" }]}
          blurb="Permissionless audio for Bitcoiners — listen, zap, no middleman."
          media={
            <PreviewSplit>
              <RadioStationPreview
                href={PODVERSE_URL}
                external
                kicker="podverse"
                title="Player"
                detail="Open podcasts"
              />
              <RadioStationPreview
                href={PODCAST_INDEX_URL}
                external
                kicker="podcast index"
                title="Directory"
                detail="Browse the index"
              />
            </PreviewSplit>
          }
          actions={
            <>
              <ButtonLink href={FOUNTAIN_URL} external className={radioActionClass}>
                open fountain
              </ButtonLink>
              <ButtonLink
                href={PODVERSE_URL}
                external
                variant="ghost"
                className={radioActionClass}
              >
                open podverse
              </ButtonLink>
              <ButtonLink
                href={PODCAST_INDEX_URL}
                external
                variant="ghost"
                className={radioActionClass}
              >
                open podcast index
              </ButtonLink>
            </>
          }
        />
      </div>
    </section>
  );
}

function OwnPanel() {
  return (
    <section id="own" className="radio-section grid items-stretch gap-4">
      <DeckLabel>sovereign · own / share</DeckLabel>
      <div className="grid items-stretch gap-4">
        <RadioCard
          code="07"
          kicker="own_your_files"
          title="Napstr"
          accent="sats"
          chips={[{ label: "desktop app", tone: "sats" }]}
          blurb="Own your music again. Nostr discovery, private transfers — no Spotify middleman."
          note={
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-cyan">
              Desktop app · Windows / Linux · Discovery via Nostr
            </p>
          }
          media={
            <RadioStationPreview
              href={NAPSTR_URL}
              external
              kicker="napstr.net"
              title="Own the files"
              detail="Catalogs over Nostr · transfers over Tor"
            />
          }
          actions={
            <ButtonLink href={NAPSTR_URL} external className={radioActionClass}>
              open napstr
            </ButtonLink>
          }
        />

        <RadioCard
          code="08"
          kicker="share_collab"
          title="Share & Collab"
          accent="cyan"
          chips={[{ label: "external", tone: "muted" }]}
          blurb="Upload, share, and collab on tracks. Zap artists on Nostr."
          media={
            <PreviewSplit>
              <RadioStationPreview
                href={ZAPSTR_URL}
                external
                kicker="zapstr"
                title="Share tracks"
                detail="Upload · zap artists"
              />
              <RadioStationPreview
                href={STEMSTR_URL}
                external
                kicker="stemstr"
                title="Collab"
                detail="Stems · sessions"
              />
            </PreviewSplit>
          }
          actions={
            <>
              <ButtonLink href={ZAPSTR_URL} external className={radioActionClass}>
                open zapstr
              </ButtonLink>
              <ButtonLink
                href={STEMSTR_URL}
                external
                variant="ghost"
                className={radioActionClass}
              >
                open stemstr
              </ButtonLink>
            </>
          }
        />
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        Share files. Seed catalogs. Keep the keys.
      </p>
    </section>
  );
}

function NowPlayingPanel() {
  return (
    <RadioCard
      id="now-playing"
      code="09"
      kicker="now_playing"
      title="Now Playing"
      accent="magenta"
      chips={[{ label: "feed", tone: "magenta" }]}
      blurb="What the network is listening to — live scrobbles on Nostr."
      note={
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-cyan">
          No central chart. Just relays and ears.
        </p>
      }
      media={
        <RadioStationPreview
          href={TRACKSTR_URL}
          external
          kicker="trackstr"
          title="Global now-playing wall"
          detail="Kind 1073 scrobbles · no central chart"
        />
      }
      actions={
        <>
          <ButtonLink href={TRACKSTR_URL} external className={radioActionClass}>
            open the global now-playing wall
          </ButtonLink>
          <ButtonLink
            href={TRACKSTR_GITHUB_URL}
            external
            variant="ghost"
            className={radioActionClass}
          >
            trackstr on github
          </ButtonLink>
        </>
      }
    />
  );
}

export function RadioDeck({ tab }: { tab: string }) {
  switch (tab) {
    case "wavlake":
      return <WavlakePanel />;
    case "live":
      return <LivePanel />;
    case "zaptrax":
      return <ZaptraxPanel />;
    case "podcasts":
      return <PodcastsPanel />;
    case "own":
      return <OwnPanel />;
    case "now-playing":
      return <NowPlayingPanel />;
    case "jukebox":
    default:
      return <JukeboxPanel />;
  }
}
