import type { JukeboxTrack } from "@/lib/types";

export function NowPlaying({ track }: { track: JukeboxTrack }) {
  return (
    <section className="panel p-5 sm:p-7">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div
          className="flex size-28 shrink-0 items-end justify-start border border-cyan/40 bg-background p-4 shadow-[3px_3px_0_var(--color-magenta)]"
          aria-hidden="true"
        >
          <span className="flex items-end gap-1">
            <span className="h-6 w-1.5 animate-pulse bg-cyan" />
            <span className="h-10 w-1.5 animate-pulse bg-magenta [animation-delay:120ms]" />
            <span className="h-7 w-1.5 animate-pulse bg-sats [animation-delay:240ms]" />
          </span>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sats">
            now_playing
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight">
            {track.title}
          </h2>
          <p className="mt-1 font-mono text-sm text-cyan">{track.artist}</p>
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.08em] text-muted">
            requested_by {track.requestedBy ?? "anon"} · {track.duration}
            {track.satsPaid ? ` · ${track.satsPaid} sats` : ""}
          </p>
        </div>
      </div>
      <div className="mt-6 h-2 overflow-hidden border border-cyan/20 bg-background">
        <div className="h-full w-2/5 bg-sats" />
      </div>
    </section>
  );
}
