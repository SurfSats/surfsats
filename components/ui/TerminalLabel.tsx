import { cn } from "@/lib/cn";

export function TerminalLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan",
        className,
      )}
    >
      <span className="text-magenta">{"//"}</span> {children}
    </p>
  );
}
