import type { Metadata } from "next";
import { NewsCard } from "@/components/news/NewsCard";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getNewsLinks } from "@/lib/news";

export const metadata: Metadata = {
  title: "News",
  description:
    "Curated Bitcoin and surf links — camps, Lightning rails, and coastal scenes.",
};

export default function NewsPage() {
  const links = getNewsLinks();

  return (
    <Container className="py-16 sm:py-20">
      <SectionHeading
        eyebrow="coastal_signal"
        title="News"
        description="A short list of Bitcoin + surf links. These are placeholders so the page is ready for real curation."
      />

      <div className="mt-10 grid gap-4">
        {links.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </Container>
  );
}
