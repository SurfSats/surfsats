export type TickerFitItem = {
  id: string;
  width: number;
};

const DROP_FIRST = ["hash", "moscow_time"] as const;

function occupiedWidth(items: TickerFitItem[], hidden: Set<string>, gap: number) {
  const visible = items.filter((item) => !hidden.has(item.id) && item.width > 0);
  if (visible.length === 0) return 0;
  return (
    visible.reduce((sum, item) => sum + item.width, 0) + gap * (visible.length - 1)
  );
}

export function hiddenTickerIds({
  available,
  items,
  gap,
  dropFirst = DROP_FIRST,
}: {
  available: number;
  items: TickerFitItem[];
  gap: number;
  dropFirst?: readonly string[];
}): string[] {
  const hidden = new Set<string>();
  if (available <= 0) return items.map((item) => item.id);
  if (occupiedWidth(items, hidden, gap) <= available) return [];

  for (const id of dropFirst) {
    if (occupiedWidth(items, hidden, gap) <= available) break;
    const item = items.find((entry) => entry.id === id);
    if (item && item.width > 0) hidden.add(id);
  }

  for (let i = items.length - 1; i >= 0; i--) {
    if (occupiedWidth(items, hidden, gap) <= available) break;
    const item = items[i];
    if (item.width <= 0 || hidden.has(item.id)) continue;
    hidden.add(item.id);
  }

  return [...hidden];
}
