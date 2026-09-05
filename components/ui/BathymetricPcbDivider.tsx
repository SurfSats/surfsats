import { cn } from "@/lib/cn";
import {
  BATHYMETRIC_DEPTH_PATH,
  BATHYMETRIC_TRACE_PATH,
  BATHYMETRIC_VIA_RADIUS,
  BATHYMETRIC_VIAS,
  BATHYMETRIC_VIEWBOX,
} from "@/lib/bathymetric-pcb";

type BathymetricPcbDividerProps = {
  className?: string;
};

export function BathymetricPcbDivider({ className }: BathymetricPcbDividerProps) {
  return (
    <div
      className={cn("w-full select-none overflow-hidden py-4 opacity-80", className)}
      aria-hidden="true"
      data-pcb="bathymetric"
    >
      <svg
        className="h-8 w-full text-zinc-raw"
        viewBox={BATHYMETRIC_VIEWBOX}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <path
          d={BATHYMETRIC_DEPTH_PATH}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <path
          d={BATHYMETRIC_TRACE_PATH}
          className="stroke-violet"
          strokeWidth="1.2"
        />
        {BATHYMETRIC_VIAS.map((via) => (
          <circle
            key={`${via.cx}-${via.cy}`}
            cx={via.cx}
            cy={via.cy}
            r={BATHYMETRIC_VIA_RADIUS}
            className="fill-void stroke-violet"
            strokeWidth="1.5"
          />
        ))}
      </svg>
    </div>
  );
}
