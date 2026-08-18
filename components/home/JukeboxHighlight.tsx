import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { TerminalLabel } from "@/components/ui/TerminalLabel";
import { JUKEBOX_PRICE_SATS, getNowPlaying, getQueue } from "@/lib/jukebox";

export function JukeboxHighlight() {
  const current = getNowPlaying();
  const upcoming = getQueue()[0];

  return (
    <section className="pb-16 sm:pb-20">
      <Container>
        <div className="panel grid gap-10 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:p-10">
          <div>
            <TerminalLabel>global_jukebox</TerminalLabel>
            <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
              Pay {JUKEBOX_PRICE_SATS} sats. Be the DJ.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
              One queue. The whole coast. Drop any track into the Global
              Jukebox and let Lightning do the talking.
            </p>
            <ButtonLink href="/jukebox" className="mt-8">
              [ open_jukebox ]
            </ButtonLink>
          </div>

          <div className="border border-cyan/30 bg-background p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-magenta">
              now_playing
            </p>
            {current ? (
              <>
                <p className="mt-3 font-display text-2xl font-bold uppercase">
                  {current.title}
                </p>
                <p className="mt-1 font-mono text-sm text-cyan">{current.artist}</p>
              </>
            ) : (
              <>
                <p className="mt-3 font-display text-2xl font-bold uppercase text-cyan">
                  Live on Noderunners Radio
                </p>
                <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-muted">
                  track data coming soon · stream is live
                </p>
              </>
            )}
            {upcoming ? (
              <p className="mt-6 border-t border-dashed border-cyan/20 pt-4 font-mono text-xs text-muted">
                sample_next:{" "}
                <span className="text-foreground">
                  {upcoming.title} — {upcoming.artist}
                </span>
              </p>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
