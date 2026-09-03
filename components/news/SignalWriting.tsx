import Link from "next/link";
import type { Article } from "@/lib/types";
import { formatDate } from "@/lib/format";

export function SignalWriting({ article }: { article: Article }) {
  return (
    <Link href={`/articles/${article.slug}`} className="signal-write">
      <p className="signal-card-meta">
        <span>{article.category}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={article.date}>{formatDate(article.date)}</time>
      </p>
      <h3 className="signal-card-title">{article.title}</h3>
      <span className="signal-card-verb">OPEN_SIGNAL</span>
    </Link>
  );
}
