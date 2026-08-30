import { useId } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const clip = `${uid}-clip`;

  return (
    <Link
      href="/"
      aria-label="SurfSats home"
      className={cn(
        "group inline-flex items-center gap-2.5 text-foreground",
        className,
      )}
    >
      <svg
        viewBox="0 0 64 64"
        className="site-mark size-8"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clip}>
            <circle cx="32" cy="32" r="28" />
          </clipPath>
        </defs>
        <circle cx="32" cy="32" r="30" fill="#05060a" />
        <g clipPath={`url(#${clip})`}>
          <g className="mark-wave" fill="#fff">
            <path d="M31 15.6C22 9.6 11 12.4 8 21.5 5.6 29.5 7 41 14.2 48c5.4 4.2 12.2 3.4 16.8-.6V43c-5.6 3.4-11.2-.2-11.4-7.4C19.4 30 24 27.2 31 26.8V15.6z" />
            <path d="M10.2 18c2-5.2 10-6.6 16-3.4-3 1.4-8 1-13 2.6-1.2.4-2.2 1-3 1.8z" />
            <circle cx="12.2" cy="21.2" r="1.3" />
            <circle cx="17.4" cy="16.6" r="1.15" />
            <circle cx="22.2" cy="15.4" r="1" />
          </g>
          <path
            className="mark-bolt"
            fill="#fff"
            d="M30.8 4.2h4.8L34 13.8l4.6 2.2-4.4 10.5 4.8 3.5-4.6 10 3.8 5.5-5 14.8-3.8-13 4-5-5.8-4.2 4.2-10.3-4.8-2.4z"
          />
          <path
            className="mark-b"
            fill="#F7931A"
            fillRule="evenodd"
            d="M41.1 19.4h2.3v2h1.15c3.35 0 5.55 1.35 5.55 4.6 0 2.3-1.3 3.65-3.4 4.2 2.55.5 4.2 2.05 4.2 4.75 0 3.6-2.95 5.25-6.5 5.25h-.8v2.05h-2.25v-2.05h-2v2.05h-2.25v-2.05c-1.45.05-2.95.15-4.25.25l.5-2.3h1.05c.75 0 1.05-.35 1.05-1.05V23.85c0-.75-.3-1.1-1.05-1.1h-1.05l-.5-2.3c1.3.1 2.8.2 4.25.25v-2h2.25v2h2v-2h2.3zm.25 9h2.25c1.75 0 2.8-.7 2.8-2.2s-1.1-2.05-2.8-2.05h-2.25v4.25zm0 9.25h2.55c1.95 0 3.1-.85 3.1-2.55s-1.15-2.35-3.1-2.35h-2.55v4.9z"
          />
        </g>
        <circle
          className="mark-ring"
          cx="32"
          cy="32"
          r="30"
          fill="none"
          stroke="#fff"
          strokeWidth="4"
        />
      </svg>
      <span className="font-display text-lg font-bold uppercase tracking-[0.14em] glitch-hover sm:text-xl">
        SurfSats
      </span>
    </Link>
  );
}
