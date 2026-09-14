import { SLAB_COPY, SLAB_MAX_PIXELS } from "@/lib/slab";

export function SlabHow() {
  return (
    <section className="slab-how">
      <p className="slab-kicker">{SLAB_COPY.title}</p>
      <h2>{SLAB_COPY.clock}</h2>
      <ul>
        <li>{SLAB_COPY.swell}</li>
        <li>{SLAB_COPY.reef}</li>
        <li>
          {SLAB_COPY.pixel} · {SLAB_MAX_PIXELS} per invoice
        </li>
        <li>{SLAB_COPY.stain}</li>
        <li>swell cannot cover a live reef pixel</li>
        <li>callsign required. no KYC.</li>
      </ul>
    </section>
  );
}
