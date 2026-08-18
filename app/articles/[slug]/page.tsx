import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { getArticle, getArticles } from "@/lib/articles";
import { formatDate } from "@/lib/format";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getArticles().map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article) {
    return { title: "Article" };
  }

  return {
    title: article.title,
    description: article.excerpt,
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article) {
    notFound();
  }

  return (
    <article>
      <Container className="py-14 sm:py-20">
        <Link
          href="/articles"
          className="font-mono text-xs uppercase tracking-[0.14em] text-muted glitch-hover hover:text-cyan"
        >
          &lt;- all_articles
        </Link>

        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">
          {"//"} {article.category}
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold uppercase tracking-tight sm:text-5xl">
          {article.title}
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted">{article.excerpt}</p>
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.1em] text-muted">
          {article.author} ·{" "}
          <time dateTime={article.date}>{formatDate(article.date)}</time> ·{" "}
          {article.readingTime}
        </p>

        {article.originalPublication && article.originalUrl ? (
          <aside className="panel mt-8 max-w-2xl p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-magenta">
              originally published
            </p>
            <a
              href={article.originalUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block font-mono text-sm text-cyan glitch-hover hover:text-sats"
            >
              {article.originalPublication} -&gt;
            </a>
            <p className="mt-2 break-all font-mono text-[11px] text-muted">
              {article.originalUrl}
            </p>
          </aside>
        ) : null}

        <div className="mt-10 max-w-2xl space-y-8 border-l-2 border-cyan/30 pl-5 text-sm leading-8 text-foreground/90 sm:text-[1.05rem] sm:leading-8">
          {article.paragraphs.map((paragraph, index) => (
            <p key={`${article.slug}-${index}`}>{paragraph}</p>
          ))}
        </div>

        {article.signoff ? (
          <p className="mt-12 max-w-2xl font-mono text-sm italic text-sats">
            {article.signoff}
          </p>
        ) : null}

        {article.originalPublication && article.originalUrl ? (
          <p className="mt-10 max-w-2xl border-t border-dashed border-cyan/20 pt-6 font-mono text-xs leading-relaxed text-muted">
            First published in{" "}
            <a
              href={article.originalUrl}
              target="_blank"
              rel="noreferrer"
              className="text-cyan glitch-hover hover:text-sats"
            >
              {article.originalPublication}
            </a>
            . Read the original:{" "}
            <a
              href={article.originalUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all text-cyan hover:text-sats"
            >
              {article.originalUrl}
            </a>
          </p>
        ) : null}
      </Container>
    </article>
  );
}
