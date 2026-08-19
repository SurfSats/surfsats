import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="SurfSats home"
      className={cn(
        "group inline-flex items-center gap-2.5 text-foreground",
        className,
      )}
    >
      <span className="flex size-8 items-center justify-center border border-cyan bg-background text-sats shadow-[2px_2px_0_var(--color-magenta)]">
        <svg
          viewBox="0 0 32 32"
          className="size-5"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M4 20c4-6 8-6 12 0s8 6 12 0"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="square"
          />
          <path
            d="M17.2 6 12 14.5h4.2L13.8 24 22 13.8h-4.4L17.2 6Z"
            fill="#ff2ec4"
          />
        </svg>
      </span>
      <span className="font-display text-lg font-bold uppercase tracking-[0.14em] glitch-hover sm:text-xl">
        SurfSats
      </span>
    </Link>
  );
}
