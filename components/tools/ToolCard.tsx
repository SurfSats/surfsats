import type { DirectoryTool } from "@/lib/tools";

export function ToolCard({ tool }: { tool: DirectoryTool }) {
  return (
    <article className="panel panel-hover flex h-auto min-w-0 flex-col p-5">
      <div className="flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.16em]">
        <span className="text-sats">{tool.tag}</span>
        <span className="text-muted">ext</span>
      </div>
      <h3 className="mt-3 break-words font-display text-xl font-bold uppercase tracking-tight">
        <a
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          className="glitch-hover hover:text-sats"
        >
          {tool.name}
        </a>
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-foreground/90">{tool.blurb}</p>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{tool.why}</p>
      <a
        href={tool.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex font-mono text-xs uppercase tracking-[0.14em] text-sats glitch-hover hover:text-cyan"
      >
        launch -&gt;
      </a>
    </article>
  );
}
