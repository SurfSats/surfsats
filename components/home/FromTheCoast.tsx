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
            title="Dispatches"
            description="One dispatch. Two picks. The rest is noise."
          />
          <div className="flex shrink-0 flex-wrap gap-x-5 gap-y-2 font-mono text-xs uppercase tracking-telemetry">
            <Link href="/signal" className="text-amber hover:text-violet">
              signal -&gt;
            </Link>
            <Link href="/tidechain" className="text-amber hover:text-violet">
              tidechain -&gt;
            </Link>
            <Link href="/tools" className="text-amber hover:text-violet">
              tools -&gt;
            </Link>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <div className="min-w-0">
            {featured ? <ArticleCard article={featured} featured /> : null}
          </div>

          <aside className="flex min-w-0 flex-col gap-4">
            <p className="font-mono text-[11px] uppercase tracking-telemetry text-zinc-raw">
              {"//"} hand_picked
            </p>
            {picks.map((item) => (
              <article
                key={item.id}
                className="border border-zinc-raw bg-void p-5 transition-colors hover:border-violet/60"
              >
                <p className="font-mono text-[11px] uppercase tracking-telemetry text-zinc-raw">
                  <span className="text-violet">[{item.source}]</span>
                  <span className="mx-2 text-amber">/</span>
                  <time dateTime={item.date}>{formatDate(item.date)}</time>
                </p>
                <h3 className="mt-3 break-words font-display text-xl font-bold uppercase tracking-tight text-salt">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-amber"
                  >
                    {item.title}
                  </a>
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-salt/70">{item.blurb}</p>
              </article>
            ))}
          </aside>
        </div>
      </Container>
    </section>
  );
}
