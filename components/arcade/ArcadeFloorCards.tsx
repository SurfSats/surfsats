import Link from "next/link";
import { ARCADE_PRICE_SATS, PLEB_BOX_LABEL } from "@/lib/arcade";

export function ArcadeFloorCards() {
  return (
    <section id="floor" className="arcade-floor">
      <p className="arcade-floor-kicker">the floor</p>
      <ul className="arcade-floor-cards">
        <li className="arcade-floor-card">
          <h2>{PLEB_BOX_LABEL}</h2>
          <p>One box. Noodle. Laser. Yeet. {ARCADE_PRICE_SATS} sats.</p>
          <Link className="arcade-floor-play" href="/arcade?game=pleb-box">
            PLAY
          </Link>
        </li>
        <li className="arcade-floor-card">
          <h2>RETRO</h2>
          <p>Five cabinets. Isolated credits. {ARCADE_PRICE_SATS} sats.</p>
          <Link className="arcade-floor-play" href="/arcade?game=retro">
            PLAY
          </Link>
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
