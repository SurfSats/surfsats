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
