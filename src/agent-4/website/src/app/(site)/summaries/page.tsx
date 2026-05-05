import Link from "next/link";
import { episodes } from "@/lib/seed-data";

export default function SummariesPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 md:py-24">
      <h1 className="text-lg mb-12">Quick summaries</h1>

      <div className="flex flex-col">
        {episodes.map((ep) => (
          <div key={ep.id} className="py-8 border-t border-foreground/10">
            <div className="flex items-center gap-2 text-xs text-secondary mb-3">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: ep.podcast.accent_colour }}
              />
              <span>{ep.content.guest_name}</span>
              <span>&middot;</span>
              <span>{ep.podcast.name}</span>
            </div>
            <Link
              href={`/ebooks/${ep.slug}`}
              className="text-sm mb-3 inline-block"
            >
              {ep.title}
            </Link>
            <p className="text-sm text-secondary leading-relaxed mt-3">
              {ep.content.summary_text}
            </p>
            <Link
              href={`/ebooks/${ep.slug}`}
              className="text-xs mt-3 inline-block"
            >
              Read the full e-book &rarr;
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
