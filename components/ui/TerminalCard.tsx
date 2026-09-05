import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  TERMINAL_CARD_STATUS_CLASS,
  type TerminalCardStatus,
} from "@/lib/brutalist-ui";

type TerminalCardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  tag?: string;
  status?: TerminalCardStatus;
  children: ReactNode;
};

export function TerminalCard({
  title,
  tag,
  status = "idle",
  children,
  className,
  ...props
}: TerminalCardProps) {
  const statusColor = TERMINAL_CARD_STATUS_CLASS[status];

  return (
    <div
      className={cn(
        "relative border border-zinc-raw bg-void p-4 transition-colors duration-150 hover:border-violet/60",
        className,
      )}
      {...props}
    >
      <span className="absolute -top-[5px] -left-[5px] select-none font-mono text-[10px] text-zinc-raw">
        +
      </span>
      <span className="absolute -top-[5px] -right-[5px] select-none font-mono text-[10px] text-zinc-raw">
        +
      </span>
      <span className="absolute -bottom-[5px] -left-[5px] select-none font-mono text-[10px] text-zinc-raw">
        +
      </span>
      <span className="absolute -bottom-[5px] -right-[5px] select-none font-mono text-[10px] text-zinc-raw">
        +
      </span>

      {(title || tag) && (
        <div className="mb-3 flex items-center justify-between border-b border-zinc-raw pb-3 font-mono text-xs tracking-telemetry uppercase">
          <div className="flex items-center gap-2">
            <span className={cn("inline-block h-1.5 w-1.5", statusColor)} />
            <span className="font-semibold text-salt">{title}</span>
          </div>
          {tag && <span className="font-mono text-zinc-raw">{tag}</span>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
