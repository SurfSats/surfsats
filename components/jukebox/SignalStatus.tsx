import { JUKEBOX_SIGNAL } from "@/lib/jukebox";

export function SignalStatus() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
      <span className="inline-flex items-center gap-2">
        <span className="text-cyan">sails</span>
        <span className="inline-flex items-end gap-0.5" aria-hidden="true">
          {Array.from({ length: JUKEBOX_SIGNAL.bars }, (_, index) => {
            const lit = index < JUKEBOX_SIGNAL.litBars;
            const last = index === JUKEBOX_SIGNAL.bars - 1;
            return (
              <span
                key={index}
                className={
                  lit
                    ? "w-1 bg-cyan"
                    : last
                      ? "signal-blip w-1 bg-sats"
                      : "w-1 bg-white/15"
                }
                style={{ height: `${8 + index * 4}px` }}
              />
            );
          })}
        </span>
        <span className="text-cyan">{JUKEBOX_SIGNAL.strength}%</span>
      </span>
      <span>
        crew <span className="text-magenta">{JUKEBOX_SIGNAL.nodesConnected}</span>
      </span>
      <span className="text-sats">ln_ok</span>
    </div>
  );
}
