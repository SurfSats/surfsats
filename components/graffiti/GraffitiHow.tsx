import { GRAFFITI_PRICE_SATS, GRAFFITI_TTL_HOURS } from "@/lib/graffiti";

export function GraffitiHow() {
  return (
    <div className="graffiti-how">
      <p>
        {GRAFFITI_PRICE_SATS} sats. {GRAFFITI_TTL_HOURS} hours. Then it fades.
      </p>
      <p>No accounts. We don&apos;t HODL.</p>
      <p>Bitcoin Is Hope never fades.</p>
    </div>
  );
}
