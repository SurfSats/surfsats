import type { SettlementEvent } from "@/lib/lightning-live";

type Listener = (event: SettlementEvent) => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribeSettlement(
  paymentHash: string,
  listener: Listener,
) {
  const key = paymentHash.trim();
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) listeners.delete(key);
  };
}

export function publishSettlement(event: SettlementEvent) {
  const key = event.paymentHash.trim();
  if (!key) return;
  const set = listeners.get(key);
  if (!set) return;
  for (const listener of set) listener(event);
}
