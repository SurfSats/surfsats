import { cn } from "@/lib/cn";
import type { GraffitiColor, GraffitiStyle } from "@/lib/graffiti";

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
  return (
    <p className={cn(`graf-${style}`, `graf-color-${color}`, className)}>
      {text}
    </p>
  );
}
