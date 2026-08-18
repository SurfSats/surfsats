import { ButtonLink } from "@/components/ui/ButtonLink";
import {
  JUKEBOX_LIVE_URL,
  JUKEBOX_PRICE_SATS,
} from "@/lib/jukebox";

// Live requests + invoices happen on the Lightning Jukebox.
// Replace this launch panel with an embedded invoice flow when a
// first-party queue API exists.
export function AddSongCard() {
  return (
    <section className="border border-sats/50 bg-sats/8 p-5 shadow-[4px_4px_0_var(--color-magenta)] sm:p-7">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sats">
        {"//"} request_track
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
        Add a song — {JUKEBOX_PRICE_SATS} sats
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        No account. No playlist committee. Pay {JUKEBOX_PRICE_SATS} sats over
        Lightning and you are the DJ. The live request desk opens in a new tab.
      </p>
      <ButtonLink
        href={JUKEBOX_LIVE_URL}
        external
        className="btn-pulse mt-6 w-full px-5 py-4 text-sm"
      >
        add a song — {JUKEBOX_PRICE_SATS} sats
      </ButtonLink>
    </section>
  );
}
