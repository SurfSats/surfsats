import { cn } from "@/lib/cn";
import { GRAFFITI_CENTER, type GraffitiMark } from "@/lib/graffiti";

export function GraffitiWall({ marks }: { marks: GraffitiMark[] }) {
  return (
    <div className="graffiti-wall">
      <div className="graf graf-center">
        <p className="graf-drip graf-color-banana text-5xl sm:text-7xl lg:text-8xl">
          {GRAFFITI_CENTER}
        </p>
      </div>

      {marks.map((mark) => (
        <div
          key={mark.id}
          className="graf graf-temp"
          style={{
            top: `${mark.top}%`,
            left: `${mark.left}%`,
            transform: `rotate(${mark.rotate}deg) scale(${mark.scale})`,
          }}
        >
          <p
            className={cn(
              `graf-${mark.style}`,
              `graf-color-${mark.color}`,
              "text-xl sm:text-3xl",
            )}
          >
            {mark.text}
          </p>
        </div>
      ))}
    </div>
  );
}
