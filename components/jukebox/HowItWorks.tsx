import { JUKEBOX_PRICE_SATS } from "@/lib/jukebox";

const steps = [
  {
    n: "01",
    title: "Board the deck",
    body: "Listen on the ship. Then open Lightning Jukebox web or Telegram to request a track. Do not ask a captain.",
  },
  {
    n: "02",
    title: `Tip ${JUKEBOX_PRICE_SATS} sats`,
    body: "Anti-spam, not a record deal. The tip keeps the queue honest and the transmitter warm.",
  },
  {
    n: "03",
    title: "The public is the DJ",
    body: `Drop ${JUKEBOX_PRICE_SATS} sats and the whole ship hears it. No flag required.`,
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
