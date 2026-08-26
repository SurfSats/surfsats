import type { MouseEvent } from "react";
import { GraffitiTag } from "@/components/graffiti/GraffitiTag";
import { cn } from "@/lib/cn";
import {
  GRAFFITI_CENTER,
  type GraffitiColor,
  type GraffitiMark,
  type GraffitiPlacement,
  type GraffitiStyle,
} from "@/lib/graffiti";

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
      <div className="graf graf-center" aria-label={GRAFFITI_CENTER}>
        <p className="graf-center-piece graf-drip graf-color-banana">
          <span className="graf-center-line">Bitcoin Is</span>
          <span className="graf-center-hope">Hope</span>
        </p>
      </div>

      {quiet ? (
        <p className="graf-quiet">
          Wall&apos;s quiet. First spray of the day sets the tone.
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
