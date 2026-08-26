import { JUKEBOX_PRICE_SATS, WAVLAKE_REQUEST_SATS } from "@/lib/jukebox";

const steps = [
  {
    n: "01",
    title: "Search the Jukebox tab",
    body: "Open noderunnersradio.com. Find the track on their Jukebox. Do not ask a captain.",
  },
  {
    n: "02",
    title: `Zap ${JUKEBOX_PRICE_SATS} or ${WAVLAKE_REQUEST_SATS}`,
    body: `${JUKEBOX_PRICE_SATS} sats is the ship library anti-spam tip. ${WAVLAKE_REQUEST_SATS} sats is Wavlake V4V to the artist. Not a record sale. We don't invoice this.`,
  },
  {
    n: "03",
    title: "The public is the DJ",
    body: "The licence covers the song. The whole ship hears it. No flag required.",
  },
];

export function HowItWorks() {
  return (
    <section className="panel p-5 sm:p-7">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">
        {"//"} standing_orders
      </p>
      <ol className="mt-5 space-y-5">
        {steps.map((step) => (
          <li key={step.n} className="flex gap-4">
            <span className="font-display text-lg font-bold text-magenta">
              {step.n}
            </span>
            <div>
              <p className="font-display text-lg font-bold uppercase tracking-tight">
                {step.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
