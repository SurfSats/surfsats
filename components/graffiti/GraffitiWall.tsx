import { GraffitiTag } from "@/components/graffiti/GraffitiTag";
import { cn } from "@/lib/cn";
import { GRAFFITI_CENTER, type GraffitiMark } from "@/lib/graffiti";

export function GraffitiWall({
  marks,
  freshId,
}: {
  marks: GraffitiMark[];
  freshId?: string | null;
}) {
  return (
    <div className="graffiti-wall">
      <div className="graf graf-center">
        <p className="graf-drip graf-color-banana text-5xl sm:text-7xl lg:text-8xl">
          {GRAFFITI_CENTER}
        </p>
      </div>

      {marks.map((mark) => {
        const fresh = freshId === mark.id;
        return (
          <div
            key={mark.id}
            id={`graf-${mark.id}`}
            className={cn("graf graf-temp", fresh && "graf-fresh")}
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
    </div>
  );
}
