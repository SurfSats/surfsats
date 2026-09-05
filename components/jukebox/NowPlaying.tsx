import { COPY } from "@/lib/copy";
import type { JukeboxLiveTrack } from "@/lib/jukebox";

export function NowPlaying({
  track,
  status,
}: {
  track: JukeboxLiveTrack | null;
  status: "loading" | "live" | "offline";
}) {
  const live = status === "live" && Boolean(track?.title);

  return (
    <section className="panel p-5 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sats">
          on_deck
        </p>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-magenta">
          on_air
        </span>
      </div>

      {live && track ? (
        <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
          <Equalizer />
          <div className="min-w-0">
            <h2 className="break-words font-display text-3xl font-bold uppercase tracking-tight">
              {track.title}
            </h2>
            <p className="mt-1 font-mono text-sm text-cyan">
              {track.artist}
              {track.album ? ` — ${track.album}` : ""}
            </p>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-sats">
              signal active — listen above
            </p>
          </div>
        </div>
      ) : (
        <div className="relative mt-5 overflow-hidden border border-cyan/25 bg-black/50 p-5 sm:p-6">
          <div
            className="scan-sweep pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-cyan/20 to-transparent"
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <Equalizer />
            <div>
              <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-cyan sm:text-3xl">
                {status === "loading"
                  ? COPY.loadingNode
                  : "Stream live · track data offline"}
              </h2>
              <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-muted">
                {status === "loading"
                  ? COPY.loadingPeer
                  : "listen above · metadata silent"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 h-2 overflow-hidden border border-cyan/20 bg-background">
        <div
          className={
            live
              ? "h-full w-2/5 bg-sats"
              : "h-full w-3/5 animate-pulse bg-gradient-to-r from-cyan via-magenta to-sats"
          }
        />
      </div>
    </section>
  );
}

function Equalizer() {
  return (
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
  );
}
