export const SWELL_SCALE = [
  { label: "ANKLE BITERS", range: "0–1%" },
  { label: "WAIST", range: "1–3%" },
  { label: "CHEST-HEAD", range: "3–6%" },
  { label: "OVERHEAD", range: "6–10%" },
  { label: "SOLID XXL", range: "10%+" },
] as const;

export type SwellDirection = "up" | "down";

export type SwellReport = {
  direction: SwellDirection;
  size: string;
  rating: string;
  pct: number;
};

export function swellFromPct(pct: number): SwellReport {
  const abs = Math.abs(pct);
  const direction: SwellDirection = pct >= 0 ? "up" : "down";

  let size = "ANKLE BITERS";
  if (abs >= 10) size = "SOLID XXL";
  else if (abs >= 6) size = "OVERHEAD";
  else if (abs >= 3) size = "CHEST-HEAD";
  else if (abs >= 1) size = "WAIST";

  let rating: string;
  if (direction === "up") {
    if (abs < 1) rating = "FAIR";
    else if (abs < 3) rating = "GOOD";
    else rating = "EPIC";
  } else if (abs < 1) rating = "POOR";
  else if (abs < 3) rating = "CLOSEOUT";
  else rating = "BLOWN OUT";

  return { direction, size, rating, pct };
}
