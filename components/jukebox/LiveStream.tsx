import { ButtonLink } from "@/components/ui/ButtonLink";
import { TerminalLabel } from "@/components/ui/TerminalLabel";
import { STREAM_LIVE_URL } from "@/lib/jukebox";

export function LiveStream() {
  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <TerminalLabel>the_deck · noderunners_radio</TerminalLabel>
          <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
            Listen live
          </h2>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-magenta">
          on_air
        </p>
      </div>

      <div className="panel mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-cyan/20 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          <span className="text-cyan">deck://radio</span>
          <span>noderunnersradio</span>
        </div>
        <iframe
          src={STREAM_LIVE_URL}
          title="Noderunners Radio live stream"
          className="block h-[320px] w-full bg-black sm:h-[400px] lg:h-[460px]"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          If the player doesn&apos;t load, click here to listen live.
        </p>
        <ButtonLink
          href={STREAM_LIVE_URL}
          external
          variant="ghost"
          className="w-full px-5 py-3 sm:w-auto"
        >
          open live stream
        </ButtonLink>
      </div>
    </section>
  );
}
