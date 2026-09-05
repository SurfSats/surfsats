import type { MouseEvent } from "react";
import { GraffitiTag } from "@/components/graffiti/GraffitiTag";
import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";
import {
  type GraffitiColor,
  type GraffitiMark,
  type GraffitiPlacement,
  type GraffitiStyle,
} from "@/lib/graffiti";

const WALL_ART = {
  src: "/graffiti-wall-bg.jpg",
  width: 1391,
  height: 752,
};

const WALL_ECHOES: {
  text: string;
  style: GraffitiStyle;
  color: GraffitiColor;
  top: number;
  left: number;
  rotate: number;
  scale: number;
}[] = [
  { text: "anon", style: "tag", color: "chrome", top: 18, left: 10, rotate: -11, scale: 0.86 },
  { text: "21", style: "blockbuster", color: "rust", top: 70, left: 14, rotate: 6, scale: 0.7 },
  { text: "HODL", style: "stencil", color: "bone", top: 22, left: 62, rotate: 8, scale: 0.64 },
  { text: "gm", style: "throwup", color: "ice", top: 74, left: 58, rotate: -4, scale: 0.74 },
  { text: "zap", style: "fatcap", color: "pink", top: 46, left: 8, rotate: -6, scale: 0.68 },
];

export function GraffitiWall({
  marks,
  freshId,
  ghost,
  placing,
  quiet,
  highlightId,
  onPlace,
  onHover,
}: {
  marks: GraffitiMark[];
  freshId?: string | null;
  ghost?: {
    text: string;
    style: GraffitiStyle;
    color: GraffitiColor;
    placement: GraffitiPlacement;
    locked: boolean;
  } | null;
  placing?: boolean;
  quiet?: boolean;
  highlightId?: string | null;
  onPlace?: (top: number, left: number) => void;
  onHover?: (point: { top: number; left: number } | null) => void;
}) {
  function pointFromEvent(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      top: ((event.clientY - rect.top) / rect.height) * 100,
      left: ((event.clientX - rect.left) / rect.width) * 100,
    };
  }

  return (
    <div
      className={cn("graffiti-wall", placing && "graffiti-wall-placing")}
      aria-label="SurfSats graffiti wall"
    >
      <div className="graf-art">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="graf-art-img"
          src={WALL_ART.src}
          alt=""
          width={WALL_ART.width}
          height={WALL_ART.height}
          decoding="async"
          fetchPriority="high"
        />
        <div
          className="graf-face"
          onClick={(event) => {
            if (!placing || !onPlace) return;
            const point = pointFromEvent(event);
            if (!point) return;
            onPlace(point.top, point.left);
          }}
          onMouseMove={(event) => {
            if (!placing || !onHover) return;
            const point = pointFromEvent(event);
            if (point) onHover(point);
          }}
          onMouseLeave={() => onHover?.(null)}
        >
          <div className="graf-grid" aria-hidden="true" />

          {quiet
            ? WALL_ECHOES.map((echo) => (
                <div
                  key={`${echo.text}-${echo.top}-${echo.left}`}
                  className="graf graf-temp graf-echo"
                  style={{
                    top: `${echo.top}%`,
                    left: `${echo.left}%`,
                    transform: `rotate(${echo.rotate}deg) scale(${echo.scale})`,
                  }}
                  aria-hidden="true"
                >
                  <div className="graf-inner">
                    <GraffitiTag
                      text={echo.text}
                      style={echo.style}
                      color={echo.color}
                      className="text-lg sm:text-3xl"
                    />
                  </div>
                </div>
              ))
            : null}

          {quiet ? <p className="graf-quiet">{COPY.emptyFeed}</p> : null}

          {marks.map((mark) => {
            const fresh = freshId === mark.id;
            const lit = highlightId === mark.id;
            return (
              <div
                key={mark.id}
                id={`graf-${mark.id}`}
                className={cn(
                  "graf graf-temp",
                  fresh && "graf-fresh",
                  lit && "graf-highlight",
                )}
                style={{
                  top: `${mark.top}%`,
                  left: `${mark.left}%`,
                  transform: `rotate(${mark.rotate}deg) scale(${mark.scale})`,
                }}
              >
                <div className="graf-inner">
                  <GraffitiTag
                    text={mark.text}
                    style={mark.style}
                    color={mark.color}
                    className="text-lg sm:text-3xl"
                  />
                </div>
              </div>
            );
          })}

          {ghost ? (
            <div
              className={cn(
                "graf graf-temp graf-ghost",
                ghost.locked && "graf-ghost-locked",
              )}
              style={{
                top: `${ghost.placement.top}%`,
                left: `${ghost.placement.left}%`,
                transform: `rotate(${ghost.placement.rotate}deg) scale(${ghost.placement.scale})`,
              }}
              aria-hidden="true"
            >
              <div className="graf-inner">
                <GraffitiTag
                  text={ghost.text}
                  style={ghost.style}
                  color={ghost.color}
                  className="text-lg sm:text-3xl"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
