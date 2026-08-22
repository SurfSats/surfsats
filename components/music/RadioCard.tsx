import Link from "next/link";
import { cn } from "@/lib/cn";

export const radioActionClass =
  "w-full min-w-0 whitespace-normal text-center leading-snug sm:w-auto";

const accentText = {
  sats: "text-sats",
  cyan: "text-cyan",
  magenta: "text-magenta",
} as const;

const chipTone = {
  sats: "border-sats/70 bg-sats/15 text-sats",
  cyan: "border-cyan/60 bg-cyan/10 text-cyan",
  magenta: "border-magenta/60 bg-magenta/12 text-magenta",
  muted: "border-foreground/20 bg-foreground/5 text-muted",
} as const;

export type RadioChip = {
  label: string;
  tone: keyof typeof chipTone;
};

export function StatusChip({ label, tone }: RadioChip) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em]",
        chipTone[tone],
      )}
    >
      {label}
    </span>
  );
}

export function RadioMedia({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "radio-media relative mt-5 min-h-[12rem] flex-1 overflow-hidden border border-cyan/20",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function RadioStationPreview({
  href,
  external = false,
  kicker,
  title,
  detail,
}: {
  href: string;
  external?: boolean;
  kicker: string;
  title: string;
  detail: string;
}) {
  const className =
    "group flex h-full min-h-[12rem] min-w-0 flex-col justify-between p-4 glitch-hover";
  const body = (
    <>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
        {kicker}
      </p>
      <div className="min-w-0">
        <p className="break-words font-display text-xl font-bold uppercase tracking-tight">
          {title}
        </p>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          {detail}
        </p>
      </div>
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-sats group-hover:text-cyan">
        open -&gt;
      </span>
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={className}
      >
        {body}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}

export function RadioCard({
  id,
  code,
  kicker,
  title,
  accent,
  chips,
  blurb,
  note,
  media,
  mediaClassName,
  actions,
  className,
}: {
  id?: string;
  code: string;
  kicker: string;
  title: string;
  accent: keyof typeof accentText;
  chips: RadioChip[];
  blurb: React.ReactNode;
  note?: React.ReactNode;
  media: React.ReactNode;
  mediaClassName?: string;
  actions: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      id={id}
      data-radio-section={id}
      className={cn(
        "panel panel-hover radio-section flex min-w-0 flex-col p-5 sm:p-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={cn(
            "font-mono text-[11px] uppercase tracking-[0.18em]",
            accentText[accent],
          )}
        >
          {code} · {kicker}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <StatusChip key={chip.label} {...chip} />
          ))}
        </div>
      </div>
      <h2 className="mt-3 break-words font-display text-2xl font-bold uppercase tracking-tight">
        {title}
      </h2>
      <div className="mt-3 text-sm leading-relaxed text-muted">{blurb}</div>
      {note}
      <RadioMedia className={mediaClassName}>{media}</RadioMedia>
      <div className="mt-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
        {actions}
      </div>
    </article>
  );
}
