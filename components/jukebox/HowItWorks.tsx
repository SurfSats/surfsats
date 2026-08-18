import { JUKEBOX_PRICE_SATS } from "@/lib/jukebox";

const steps = [
  {
    n: "01",
    title: "Hit the button",
    body: "Open the live jukebox. Pick any track. Do not ask a DJ.",
  },
  {
    n: "02",
    title: `Pay ${JUKEBOX_PRICE_SATS} sats`,
    body: "Lightning invoice. Instant. Tiny. No middleman taking a cut of the vibe.",
  },
  {
    n: "03",
    title: "Own the queue",
    body: "Your song lands in the global buffer. The whole coast hears it.",
  },
];

export function HowItWorks() {
  return (
    <section className="panel p-5 sm:p-7">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">
        {"//"} how_it_works
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
