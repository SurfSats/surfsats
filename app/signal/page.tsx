import type { Metadata } from "next";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { ReadoutShell } from "@/components/layout/ReadoutShell";
import { FeedWire } from "@/components/news/FeedWire";
import { HandpickedCard } from "@/components/news/HandpickedCard";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getArticles } from "@/lib/articles";
import { getLiveFeeds } from "@/lib/feeds";
import {
  getLatestHandpicked,
  getStandingHandpicked,
} from "@/lib/handpicked";
import { pageMeta } from "@/lib/seo";

export const revalidate = 1800;

export const metadata: Metadata = pageMeta({
  title: "Signal",
  description:
    "Hand-picked Bitcoin + surf culture signal, SurfSats articles, and underground pleb feeds.",
  path: "/signal",
});

export default async function SignalPage() {
  const latest = getLatestHandpicked();
  const standing = getStandingHandpicked();
  const articles = getArticles();
  const { items: feedItems, sources } = await getLiveFeeds();

  return (
    <ReadoutShell
      name="signal"
      strip={<p>signal · hand picked · no algorithm</p>}
    >
      <div className="signal-page">
        <Container className="relative py-8 sm:py-10">
          <p className="signal-kicker">
            Hand-picked first. Our writing second. The wire last.
          </p>

          <section id="curated" className="mt-10 scroll-mt-28">
            <SectionHeading
              eyebrow="hand_picked"
              title="Curated"
              description="Latest signal first. The standing stack stays below."
            />

            {latest.length > 0 ? (
              <div className="mt-8">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">
                  {"//"} latest
                </p>
                <h3 className="mt-1 font-display text-xl font-bold uppercase tracking-tight text-sats sm:text-2xl">
                  Latest
                </h3>
                <div className="mt-4 grid gap-4">
                  {latest.map((item) => (
                    <HandpickedCard key={item.id} item={item} variant="latest" />
                  ))}
                </div>
              </div>
            ) : null}

            {standing.length > 0 ? (
              <div className="mt-10">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                  {"//"} standing
                </p>
                <h3 className="mt-1 font-display text-lg font-bold uppercase tracking-tight text-muted sm:text-xl">
                  Standing
                </h3>
                <div className="mt-3 grid gap-3">
                  {standing.map((item) => (
                    <HandpickedCard
                      key={item.id}
                      item={item}
                      variant="standing"
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section id="articles" className="mt-16 scroll-mt-28">
            <SectionHeading
              eyebrow="from_the_coast"
              title="Articles"
              description="Writing published on SurfSats. Ours. Unfiltered."
            />
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

          <section id="wire" className="mt-16 scroll-mt-28">
            <FeedWire items={feedItems} sources={sources} />
          </section>
        </Container>
      </div>
    </ReadoutShell>
  );
}
