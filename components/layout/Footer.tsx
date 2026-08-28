import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { navLinks } from "@/lib/nav";

export function Footer() {
  return (
    <footer className="relative z-10 mt-auto shrink-0 border-t border-cyan/20 bg-black/40">
      <Container className="flex flex-col gap-8 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 font-mono text-xs leading-relaxed text-muted">
            unauthorized culture for people who live on ocean time and bitcoin
            time. don&apos;t ask permission.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-mono text-xs uppercase tracking-[0.14em] text-muted glitch-hover hover:text-cyan"
            >
              /{link.label.toLowerCase()}
            </Link>
          ))}
        </nav>
      </Container>

      <div className="border-t border-dashed border-cyan/20">
        <Container className="footer-strip">
          <p className="footer-legal">
            <span>© {new Date().getFullYear()}</span>
            <span className="footer-mark footer-mark-surfsats">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-surfsats-white.png" alt="SurfSats" />
            </span>
            <span aria-hidden="true">·</span>
            <span>ride the swell</span>
            <span aria-hidden="true">·</span>
            <span>stack the sats</span>
            <span className="footer-company">
              A
              <span className="footer-mark footer-mark-surfporn">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-surfporn-white.png" alt="SurfPorn" />
              </span>
              COMPANY
            </span>
          </p>
          <div className="footer-strip-links">
            <Link
              href="/about"
              className="tracking-[0.14em] text-muted/80 glitch-hover hover:text-cyan"
            >
              /about
            </Link>
            <p className="text-magenta">jukebox: 21_sats</p>
          </div>
        </Container>
      </div>
    </footer>
  );
}
