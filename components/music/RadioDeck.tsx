import { ButtonLink } from "@/components/ui/ButtonLink";
import { JUKEBOX_PRICE_SATS } from "@/lib/jukebox";
import {
  TUNESTR_URL,
  WAVLAKE_EMBED_SRC,
  WAVLAKE_URL,
  ZAP_STREAM_URL,
  ZAPTRAX_URL,
} from "@/lib/music";

export function RadioDeck() {
  return (
    <div className="mt-12 grid gap-4 lg:grid-cols-2">
      <article className="panel panel-hover flex min-w-0 flex-col p-5 sm:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-sats">
          01 · pirate_queue
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold uppercase tracking-tight">
          Live Jukebox
        </h2>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
          Pay {JUKEBOX_PRICE_SATS} sats, queue a track, ride the pirate ship.
        </p>
        <div className="mt-6">
          <ButtonLink href="/jukebox">open jukebox</ButtonLink>
        </div>
      </article>

      <article className="panel panel-hover flex min-w-0 flex-col p-5 sm:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan">
          02 · value_for_value
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold uppercase tracking-tight">
          Wavlake
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Value-for-value tracks. Stream and zap artists directly.
        </p>
        <div className="radio-embed mt-5 overflow-hidden border border-cyan/20 bg-black/50">
          <iframe
            src={WAVLAKE_EMBED_SRC}
            title="Wavlake 21-day chart"
            className="h-[22rem] w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allow="encrypted-media; clipboard-write; fullscreen"
          />
        </div>
        <div className="mt-5">
          <ButtonLink href={WAVLAKE_URL} external variant="ghost">
            open wavlake
          </ButtonLink>
        </div>
      </article>

      <article className="panel panel-hover flex min-w-0 flex-col p-5 sm:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-magenta">
          03 · live_sets
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold uppercase tracking-tight">
          Live Streams
        </h2>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
          Live sets and radio on Nostr. Zap while it plays.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <ButtonLink href={ZAP_STREAM_URL} external>
            open zap.stream
          </ButtonLink>
          <ButtonLink href={TUNESTR_URL} external variant="ghost">
            open tunestr
          </ButtonLink>
        </div>
      </article>

      <article className="panel panel-hover flex min-w-0 flex-col p-5 sm:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-sats">
          04 · nostr_native
        </p>
        <h2 className="mt-3 font-display text-2xl font-bold uppercase tracking-tight">
          ZapTrax
        </h2>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
          Nostr-native music player, playlists, and Lightning zaps.
        </p>
        <div className="mt-6">
          <ButtonLink href={ZAPTRAX_URL} external>
            open zaptrax
          </ButtonLink>
        </div>
      </article>
    </div>
  );
}
