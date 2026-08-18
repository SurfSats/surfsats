import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { navLinks } from "@/lib/nav";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-cyan/20 bg-black/40">
      <Container className="flex flex-col gap-8 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 font-mono text-xs leading-relaxed text-muted">
            unauthorized culture for people who live on ocean time and bitcoin
            time. fork it. remix it. don&apos;t ask permission.
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
        <Container className="flex flex-col gap-2 py-4 font-mono text-[11px] uppercase tracking-[0.12em] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} surfsats · ride the swell · stack the
            sats
          </p>
          <p className="text-magenta">lightning: coming_soon.exe</p>
        </Container>
      </div>
    </footer>
  );
}
