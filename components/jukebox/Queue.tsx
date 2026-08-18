import type { JukeboxTrack } from "@/lib/types";

export function Queue({ tracks }: { tracks: JukeboxTrack[] }) {
  return (
    <section>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">
            {"//"} the_hold
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight">
            Current queue
          </h2>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-sats">
          preview_mode · {tracks.length} samples
        </p>
      </div>

      <ol className="panel mt-4 divide-y divide-cyan/15 overflow-hidden">
        {tracks.map((track, index) => (
          <li
            key={track.id}
            className="flex items-center gap-4 px-4 py-3 hover:bg-cyan/5"
          >
            <span className="w-7 font-mono text-xs text-magenta">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{track.title}</p>
              <p className="truncate font-mono text-xs text-muted">{track.artist}</p>
            </div>
            <div className="hidden text-right font-mono text-[11px] uppercase text-muted sm:block">
              <p>{track.requestedBy ?? "anon"}</p>
              <p>
                {track.duration}
                {track.satsPaid ? ` · ${track.satsPaid}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted">
        Example queue · live queue data coming when we run our own instance.
      </p>
    </section>
  );
}
