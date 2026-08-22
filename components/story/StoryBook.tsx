import { cn } from "@/lib/cn";
import { STORY_PRICE_SATS, storyFaceIndex, type StoryLine } from "@/lib/story";

export function StoryBook({
  lines,
  freshId,
}: {
  lines: StoryLine[];
  freshId?: string | null;
}) {
  return (
    <article className="story-book">
      <div className="story-book-frame" aria-hidden="true" />
      <header className="story-head">
        <p className="story-kicker">liber fulminis · cap. xxi</p>
        <h1 className="story-title">The Chain</h1>
        <p className="story-blurb">
          {STORY_PRICE_SATS} sats. One line. The book grows.
        </p>
        <div className="story-rule" aria-hidden="true" />
      </header>

      <ol className="story-lines">
        {lines.map((line, index) => {
          const face = storyFaceIndex(line.id);
          return (
            <li
              key={line.id}
              id={`story-line-${line.id}`}
              className={cn(
                "story-line",
                `story-face-${face}`,
                freshId === line.id && "story-line-fresh",
              )}
            >
              <p className="story-line-text">{line.text}</p>
              <p className="story-line-meta">
                — {line.alias}
                {index === lines.length - 1 ? " · latest" : ""}
              </p>
            </li>
          );
        })}
      </ol>
    </article>
  );
}
