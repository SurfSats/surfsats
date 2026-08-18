import type { JukeboxTrack } from "@/lib/types";

export function NowPlaying({ track }: { track: JukeboxTrack | null }) {
  return (
    <section className="panel p-5 sm:p-7">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-sats">
        now_playing
      </p>

      {track ? (
        <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
          <Equalizer />
          <div>
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight">
              {track.title}
            </h2>
            <p className="mt-1 font-mono text-sm text-cyan">{track.artist}</p>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.08em] text-muted">
              requested_by {track.requestedBy ?? "anon"} · {track.duration}
              {track.satsPaid ? ` · ${track.satsPaid} sats` : ""}
            </p>
          </div>
        </div>
      ) : (
        <div className="relative mt-5 overflow-hidden border border-cyan/25 bg-black/50 p-6">
          <div
            className="scan-sweep pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-cyan/20 to-transparent"
            aria-hidden="true"
          />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Equalizer muted />
            <div>
              <h2 className="flicker font-display text-2xl font-bold uppercase tracking-tight text-cyan sm:text-3xl">
                Connecting to the signal…
              </h2>
              <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-muted">
                handshake pending · no live track yet
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 h-2 overflow-hidden border border-cyan/20 bg-background">
        <div className={track ? "h-full w-2/5 bg-sats" : "h-full w-1/12 animate-pulse bg-magenta"} />
      </div>
    </section>
  );
}

function Equalizer({ muted = false }: { muted?: boolean }) {
  return (
    <div
      className="flex size-28 shrink-0 items-end justify-start border border-cyan/40 bg-background p-4 shadow-[3px_3px_0_var(--color-magenta)]"
      aria-hidden="true"
    >
      <span className="flex items-end gap-1">
        <span className={`h-6 w-1.5 ${muted ? "bg-cyan/30" : "animate-pulse bg-cyan"}`} />
        <span
          className={`h-10 w-1.5 ${muted ? "bg-magenta/30" : "animate-pulse bg-magenta [animation-delay:120ms]"}`}
        />
        <span
          className={`h-7 w-1.5 ${muted ? "bg-sats/30" : "animate-pulse bg-sats [animation-delay:240ms]"}`}
        />
      </span>
    </div>
  );
}
