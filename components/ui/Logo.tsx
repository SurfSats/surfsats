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
      <span className="site-mark-wrap">
        <img
          src="/brand/mark-circle-512.png"
          srcSet="/brand/mark-circle.png 268w, /brand/mark-circle-512.png 512w"
          sizes="32px"
          alt=""
          width={32}
          height={32}
          className="site-mark size-8 rounded-full"
        />
      </span>
      <span className="font-display text-lg font-bold uppercase tracking-[0.14em] glitch-hover sm:text-xl">
        SurfSats
      </span>
    </Link>
  );
}
