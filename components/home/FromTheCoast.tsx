import Link from "next/link";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getLatestArticles } from "@/lib/articles";
import { getHandpicked } from "@/lib/handpicked";
import { formatDate } from "@/lib/format";

export function FromTheCoast() {
  const featured = getLatestArticles(1)[0];
  const picks = getHandpicked().slice(0, 2);

  return (
    <section className="relative z-0">
      <Container className="py-14 sm:pb-8 sm:pt-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow="from_the_coast"
            title="Writing + signal"
            description="One dispatch. Two picks. The rest is noise."
          />
          <div className="flex shrink-0 gap-5 font-mono text-xs uppercase tracking-[0.16em]">
            <Link href="/articles" className="text-sats glitch-hover hover:text-cyan">
              articles -&gt;
            </Link>
            <Link href="/news" className="text-sats glitch-hover hover:text-cyan">
              signal -&gt;
            </Link>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <div className="min-w-0">
            {featured ? <ArticleCard article={featured} featured /> : null}
          </div>

          <aside className="flex min-w-0 flex-col gap-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">
              {"//"} hand_picked
            </p>
            {picks.map((item) => (
              <article key={item.id} className="panel panel-hover p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                  <span className="text-cyan">[{item.source}]</span>
                  <span className="mx-2 text-magenta">/</span>
                  <time dateTime={item.date}>{formatDate(item.date)}</time>
                </p>
                <h3 className="mt-3 break-words font-display text-xl font-bold uppercase tracking-tight">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="glitch-hover hover:text-sats"
                  >
                    {item.title}
                  </a>
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.blurb}</p>
              </article>
            ))}
          </aside>
        </div>
      </Container>
    </section>
  );
}
