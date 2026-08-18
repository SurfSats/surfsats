import { cn } from "@/lib/cn";
import {
  GRAFFITI_CENTER,
  type GraffitiMark,
  remainingLabel,
} from "@/lib/graffiti";

export function GraffitiWall({
  marks,
  now,
}: {
  marks: GraffitiMark[];
  now: number;
}) {
  return (
    <div className="overflow-hidden border border-white/10">
      <div className="flex items-center justify-between border-b border-white/10 bg-black/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        <span className="text-cyan">alley://wall</span>
        <span className="text-sats">24h lease · hope is permanent</span>
      </div>
      <div className="graffiti-wall">
        <div className="graf graf-center graf-drip graf-color-sats">
          <p className="text-4xl sm:text-6xl lg:text-7xl">{GRAFFITI_CENTER}</p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-sats/70">
            permanent · never expires
          </p>
        </div>

        {marks.map((mark) => {
          const left = remainingLabel(mark.expiresAt, now);
          const fade = fadeFor(mark.expiresAt, now);
          return (
            <div
              key={mark.id}
              className={cn(
                "graf graf-temp",
                `graf-${mark.style}`,
                `graf-color-${mark.color}`,
              )}
              style={{
                top: `${mark.top}%`,
                left: `${mark.left}%`,
                transform: `rotate(${mark.rotate}deg)`,
                opacity: fade,
              }}
            >
              <p className="text-lg sm:text-2xl">{mark.text}</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-white/50">
                {left} left
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function fadeFor(expiresAt: string, now: number) {
  const total = 24 * 60 * 60 * 1000;
  const left = new Date(expiresAt).getTime() - now;
  const t = Math.min(1, Math.max(0, left / total));
  return 0.42 + t * 0.58;
}
