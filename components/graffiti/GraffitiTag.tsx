import { cn } from "@/lib/cn";
import {
  isGraffitiColor,
  isGraffitiStyle,
  type GraffitiColor,
  type GraffitiStyle,
} from "@/lib/graffiti";

export function GraffitiTag({
  text,
  style,
  color,
  className,
}: {
  text: string;
  style: GraffitiStyle;
  color: GraffitiColor;
  className?: string;
}) {
  const safeStyle = isGraffitiStyle(style) ? style : "tag";
  const safeColor = isGraffitiColor(color) ? color : "banana";
  return (
    <p className={cn(`graf-${safeStyle}`, `graf-color-${safeColor}`, className)}>
      {text}
    </p>
  );
}
