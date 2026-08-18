import Link from "next/link";
import type { Article } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

type ArticleCardProps = {
  article: Article;
  featured?: boolean;
};

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  return (
    <article
      className={cn(
        "panel panel-hover group flex w-full min-w-0 flex-col p-5",
        featured && "sm:p-7",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.16em] text-cyan">
        <span>{article.category}</span>
        <span className="text-magenta">/</span>
        <time dateTime={article.date} className="text-muted">
          {formatDate(article.date)}
        </time>
        {article.originalPublication ? (
          <>
            <span className="text-magenta">/</span>
            <span className="text-sats">via {article.originalPublication}</span>
          </>
        ) : null}
      </div>

      <h3
        className={cn(
          "mt-4 break-words font-display font-bold uppercase tracking-tight text-foreground glitch-hover",
          featured ? "text-2xl sm:text-3xl" : "text-xl",
        )}
      >
        <Link href={`/articles/${article.slug}`} className="focus-visible:outline-none">
          {article.title}
        </Link>
      </h3>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
        {article.excerpt}
      </p>

      <div className="mt-6 flex items-center justify-between font-mono text-xs uppercase tracking-[0.08em]">
        <span className="text-muted">
          {article.author} · {article.readingTime}
        </span>
        <Link
          href={`/articles/${article.slug}`}
          className="text-sats glitch-hover hover:text-cyan"
        >
          read_file
        </Link>
      </div>
    </article>
  );
}
