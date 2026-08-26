import { ButtonLink } from "@/components/ui/ButtonLink";
import {
  JUKEBOX_LIVE_URL,
  JUKEBOX_PRICE_SATS,
  JUKEBOX_TELEGRAM_URL,
  WAVLAKE_REQUEST_SATS,
} from "@/lib/jukebox";

export function AddSongCard() {
  return (
    <section className="border border-sats/50 bg-sats/8 p-5 shadow-[4px_4px_0_var(--color-magenta)] sm:p-7">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sats">
        {"//"} drop_in_the_hold
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
        Request on the ship
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Search the Jukebox tab. Zap {JUKEBOX_PRICE_SATS} sats (ship library) or{" "}
        {WAVLAKE_REQUEST_SATS} sats (Wavlake). Anti-spam / V4V — not a record
        sale. The licence covers the song.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <ButtonLink
          href={JUKEBOX_LIVE_URL}
          external
          className="btn-pulse w-full px-5 py-4 text-sm"
        >
          REQUEST ON THE SHIP
        </ButtonLink>
        <ButtonLink
          href={JUKEBOX_TELEGRAM_URL}
          external
          variant="ghost"
          className="w-full px-5 py-4 text-sm"
        >
          TELEGRAM
        </ButtonLink>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        SurfSats does not generate the invoice. Open their Jukebox tab, search
        the same title, zap the QR.
      </p>
    </section>
  );
}
