import type { Metadata } from "next";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getArticles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Articles",
  description:
    "Stories from the overlap of Bitcoin and surf culture — Lightning, self-custody, and life on ocean time.",
};

export default function ArticlesPage() {
  const articles = getArticles();

  return (
    <Container className="py-16 sm:py-20">
      <SectionHeading
        eyebrow="writing"
        title="Articles"
        description="Placeholder dispatches for now. Swap this list for a CMS or markdown collection when the real pieces land."
      />

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {articles.map((article, index) => (
          <ArticleCard
            key={article.slug}
            article={article}
            featured={index === 0}
          />
        ))}
      </div>
    </Container>
  );
}
