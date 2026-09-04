import Link from "next/link";
import { ARCADE_PRICE_SATS } from "@/lib/arcade";

export function ArcadeFloorCards() {
  return (
    <section id="floor" className="arcade-floor">
      <p className="arcade-floor-kicker">the floor</p>
      <ul className="arcade-floor-cards">
        <li className="arcade-floor-card">
          <h2>WAVE RUNNER</h2>
          <p>Tap to hop. Already on the glass.</p>
          <a className="arcade-floor-play" href="#cabinet">
            PLAY
          </a>
        </li>
        <li className="arcade-floor-card">
          <h2>ANARCH</h2>
          <p>90s raycast · public domain · {ARCADE_PRICE_SATS} sats to boot.</p>
          <Link className="arcade-floor-play" href="/arcade/anarch">
            PLAY
          </Link>
        </li>
        <li className="arcade-floor-card">
          <h2>BOUNCING BITTIES</h2>
          <p>{ARCADE_PRICE_SATS} sats · tap to bounce.</p>
          <Link className="arcade-floor-play" href="/arcade/bitties">
            PLAY
          </Link>
        </li>
      </ul>
    </section>
  );
}
