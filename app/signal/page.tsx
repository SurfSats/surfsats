import type { Metadata } from "next";
import { ReadoutShell } from "@/components/layout/ReadoutShell";
import { FeedWire } from "@/components/news/FeedWire";
import { HandpickedCard } from "@/components/news/HandpickedCard";
import { SignalWriting } from "@/components/news/SignalWriting";
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
      <div className="signal-room">
        <header className="signal-hud">
          <h1 className="signal-hero">HAND-PICKED / no algorithm</h1>
        </header>

        <section id="curated" className="signal-band">
          {latest.length > 0 ? (
            <div className="signal-latest">
              {latest.map((item) => (
                <HandpickedCard key={item.id} item={item} variant="latest" />
              ))}
            </div>
          ) : null}

          {standing.length > 0 ? (
            <div className="signal-standing">
              <p className="signal-band-label">standing</p>
              <div className="signal-standing-grid">
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

        <section id="articles" className="signal-band">
          <p className="signal-band-label">our writing</p>
          {articles.length > 0 ? (
            <div className="signal-writing">
              {articles.map((article) => (
                <SignalWriting key={article.slug} article={article} />
              ))}
            </div>
          ) : (
            <p className="signal-quiet">no dispatches on the desk.</p>
          )}
        </section>

        <section id="wire" className="signal-band">
          <FeedWire items={feedItems} sources={sources} />
        </section>
      </div>
    </ReadoutShell>
  );
}
