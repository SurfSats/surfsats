import Link from "next/link";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getLatestArticles } from "@/lib/articles";

export function LatestArticles() {
  const articles = getLatestArticles(3);

  return (
    <section>
      <Container className="py-16 sm:py-20">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow="dispatches"
            title="Latest articles"
            description="Field notes from beach towns, Lightning rails, and the overlap between both."
          />
          <Link
            href="/articles"
            className="shrink-0 font-mono text-xs uppercase tracking-[0.16em] text-sats glitch-hover hover:text-cyan"
          >
            all_articles -&gt;
          </Link>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </Container>
    </section>
  );
}
