import type { JukeboxTrack } from "@/lib/types";

export function Queue({ tracks }: { tracks: JukeboxTrack[] }) {
  return (
    <section>
      <h2 className="font-display text-2xl font-bold uppercase tracking-tight">
        Up next
      </h2>
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
              <p>{track.duration}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
