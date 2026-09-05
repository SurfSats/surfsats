export const BATHYMETRIC_VIEWBOX = "0 0 1200 32";

/** Dashed isobath — ocean depth contour. */
export const BATHYMETRIC_DEPTH_PATH =
  "M0 16 Q150 4, 300 16 T600 16 L640 24 L800 24 L820 8 L1000 8 L1040 24 L1200 24";

/** Solid 45-degree PCB telemetry trace. */
export const BATHYMETRIC_TRACE_PATH =
  "M0 8 L220 8 L240 24 L480 24 L500 8 L720 8 L740 24 L940 24 L960 8 L1200 8";

export type BathymetricVia = {
  cx: number;
  cy: number;
};

export const BATHYMETRIC_VIAS: readonly BathymetricVia[] = [
  { cx: 240, cy: 24 },
  { cx: 500, cy: 8 },
  { cx: 740, cy: 24 },
  { cx: 960, cy: 8 },
];

export const BATHYMETRIC_VIA_RADIUS = 2.5;
