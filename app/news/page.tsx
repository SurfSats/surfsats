import type { Metadata } from "next";
import Link from "next/link";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { FeedWire } from "@/components/news/FeedWire";
import { HandpickedCard } from "@/components/news/HandpickedCard";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TerminalLabel } from "@/components/ui/TerminalLabel";
import { getArticles } from "@/lib/articles";
import { getLiveFeeds } from "@/lib/feeds";
import { getHandpicked } from "@/lib/handpicked";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Signal",
  description:
    "Hand-picked Bitcoin + surf culture signal, SurfSats articles, and a live wire of Bitcoin headlines.",
};

export default async function NewsPage() {
  const curated = getHandpicked();
  const articles = getArticles();
  const { items: feedItems, sources } = await getLiveFeeds();

  return (
    <div className="relative overflow-hidden">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[22rem]" />

      <Container className="relative py-14 sm:py-20">
        <section>
          <TerminalLabel>news · culture · no noise</TerminalLabel>
          <h1
            data-text="The Signal"
            className="glitch-title flicker mt-4 max-w-4xl font-display text-4xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-6xl lg:text-7xl"
          >
            The Signal
          </h1>
          <p className="mt-5 font-display text-xl font-semibold uppercase tracking-wide text-sats sm:text-2xl">
            Bitcoin + surf. Cut the rest.
          </p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            Hand-picked first. Our writing second. The wire last, and only as
            loud as it deserves. If it is not culture or hard money, it does not
            belong here.
          </p>
        </section>

        <section className="mt-14">
          <SectionHeading
            eyebrow="hand_picked"
            title="Curated"
            description="A short stack we actually stand behind. Swap these in lib/handpicked.ts whenever the signal moves."
          />
          <div className="mt-8 grid gap-4">
            {curated.map((item, index) => (
              <HandpickedCard
                key={item.id}
                item={item}
                featured={index === 0 || item.featured}
              />
            ))}
          </div>
        </section>

        <section className="mt-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow="from_the_coast"
              title="Articles"
              description="Writing published on SurfSats. Ours. Unfiltered."
            />
            <Link
              href="/articles"
              className="shrink-0 font-mono text-xs uppercase tracking-[0.16em] text-sats glitch-hover hover:text-cyan"
            >
              all_articles -&gt;
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {articles.map((article, index) => (
              <ArticleCard
                key={article.slug}
                article={article}
                featured={index === 0}
              />
            ))}
          </div>
        </section>

        <section className="mt-16">
          <FeedWire items={feedItems} sources={sources} />
        </section>
      </Container>
    </div>
  );
}
