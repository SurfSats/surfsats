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
      <div className="graf graf-center" aria-label={GRAFFITI_CENTER}>
        <p className="graf-center-piece graf-drip graf-color-banana">
          <span className="graf-center-line">Bitcoin Is</span>
          <span className="graf-center-hope">Hope</span>
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
