import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function JukeboxPreview({ className }: { className?: string }) {
  return (
    <Link
      href="/jukebox"
      className={cn(
        "group relative block min-h-[11rem] overflow-hidden border border-sats/50 bg-black/60 aspect-[16/10] sm:min-h-[13rem] lg:h-full lg:min-h-[14rem] lg:aspect-auto hover:border-sats",
        className,
      )}
    >
      <Image
        src="/jukebox-ship.png"
        alt="Pirate ship jukebox — open the live queue"
        fill
        sizes="(max-width: 1024px) 100vw, 26rem"
        className="object-cover object-[center_38%] transition-transform duration-150 group-hover:scale-[1.03]"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#08080b]/90 via-[#08080b]/20 to-black/25"
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 top-0 flex items-center gap-2 border-b border-sats/35 bg-[#08080b]/70 px-3 py-1.5">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-sats"
          aria-hidden="true"
        />
        <span className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-sats">
          /jukebox
        </span>
      </div>
      <span className="absolute bottom-3 left-3 right-3 font-mono text-[11px] uppercase tracking-[0.16em] text-sats">
        pirate ship · board -&gt;
      </span>
    </Link>
  );
}
