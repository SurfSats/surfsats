import type { MouseEvent } from "react";
import { GraffitiTag } from "@/components/graffiti/GraffitiTag";
import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";
import {
  GRAFFITI_CENTER,
  type GraffitiColor,
  type GraffitiMark,
  type GraffitiPlacement,
  type GraffitiStyle,
} from "@/lib/graffiti";

const WALL_ECHOES: {
  text: string;
  style: GraffitiStyle;
  color: GraffitiColor;
  top: number;
  left: number;
  rotate: number;
  scale: number;
}[] = [
  { text: "anon", style: "tag", color: "chrome", top: 16, left: 7, rotate: -11, scale: 0.92 },
  { text: "21", style: "blockbuster", color: "rust", top: 76, left: 8, rotate: 6, scale: 0.72 },
  { text: "HODL", style: "stencil", color: "bone", top: 20, left: 52, rotate: 8, scale: 0.68 },
  { text: "gm", style: "throwup", color: "ice", top: 80, left: 48, rotate: -4, scale: 0.78 },
  { text: "zap", style: "fatcap", color: "pink", top: 32, left: 4, rotate: -6, scale: 0.7 },
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

      <div className="graf graf-center" aria-label={GRAFFITI_CENTER}>
        <p className="graf-center-piece graf-drip graf-color-banana">
          <span className="graf-center-line">Bitcoin Is</span>
          <span className="graf-center-hope">Hope</span>
        </p>
      </div>

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

      {quiet ? (
        <p className="graf-quiet">
          {COPY.emptyFeed}
        </p>
      ) : null}

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
          className={cn("graf graf-temp graf-ghost", ghost.locked && "graf-ghost-locked")}
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
  );
}
