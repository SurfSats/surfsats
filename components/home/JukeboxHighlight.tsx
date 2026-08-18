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
              One queue. The whole coast. {JUKEBOX_PRICE_SATS} sats a song.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
              Drop a track into a shared playlist heard around the world.
              Lightning payments come next — the jukebox is already warming
              up.
            </p>
            <ButtonLink href="/jukebox" className="mt-8">
              [ pay_{JUKEBOX_PRICE_SATS}_sats ]
            </ButtonLink>
          </div>

          <div className="border border-cyan/30 bg-background p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-magenta">
              now_playing
            </p>
            <p className="mt-3 font-display text-2xl font-bold uppercase">
              {current.title}
            </p>
            <p className="mt-1 font-mono text-sm text-cyan">{current.artist}</p>
            {upcoming ? (
              <p className="mt-6 border-t border-dashed border-cyan/20 pt-4 font-mono text-xs text-muted">
                up_next:{" "}
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
