import { JUKEBOX_PRICE_SATS, type JukeboxLiveQueueItem } from "@/lib/jukebox";

export function Queue({
  tracks,
  ready,
}: {
  tracks: JukeboxLiveQueueItem[];
  ready: boolean;
}) {
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
          {ready
            ? tracks.length
              ? `${tracks.length} in_hold`
              : "library_mode"
            : "tuning"}
        </p>
      </div>

      {ready && tracks.length > 0 ? (
        <ol className="panel mt-4 divide-y divide-cyan/15 overflow-hidden">
          {tracks.slice(0, 8).map((track, index) => (
            <li
              key={track.id}
              className="flex items-center gap-4 px-4 py-3 hover:bg-cyan/5"
            >
              <span className="w-7 font-mono text-xs text-magenta">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{track.title}</p>
                <p className="truncate font-mono text-xs text-muted">
                  {track.artist}
                  {track.album ? ` — ${track.album}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="panel mt-4 px-4 py-6 font-mono text-sm leading-relaxed text-muted">
          {ready
            ? `Queue is the ship's library — request ${JUKEBOX_PRICE_SATS} sats to cut the line.`
            : "tuning the hold…"}
        </div>
      )}
    </section>
  );
}
