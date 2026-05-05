"use client";

import { useState } from "react";
import Link from "next/link";
import { episodes, podcasts } from "@/lib/seed-data";

export default function EbooksPage() {
  const [filter, setFilter] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);

  const filtered = filter
    ? episodes.filter((e) => e.podcast_id === filter)
    : episodes;

  const visible = filtered.slice(0, visibleCount);

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 md:py-24">
      <h1 className="text-lg mb-12">E-books</h1>

      {/* Filter */}
      <div className="flex flex-wrap gap-3 mb-12 text-xs">
        <button
          onClick={() => setFilter(null)}
          className={`underline cursor-pointer ${filter === null ? "text-foreground" : "text-secondary"}`}
        >
          All
        </button>
        {podcasts.map((p) => (
          <button
            key={p.id}
            onClick={() => setFilter(p.id)}
            className={`underline cursor-pointer ${filter === p.id ? "text-foreground" : "text-secondary"}`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Episode list */}
      <div className="flex flex-col">
        {visible.map((ep) => (
          <Link
            key={ep.id}
            href={`/ebooks/${ep.slug}`}
            className="block py-6 border-t border-foreground/10 no-underline group"
          >
            <p className="text-sm mb-2 group-hover:underline">
              {ep.title}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-secondary flex-wrap">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: ep.podcast.accent_colour }}
              />
              <span>{ep.content.guest_name} &middot; {ep.podcast.name}</span>
              <span className="hidden sm:inline">&middot;</span>
              <span>{ep.content.final_page_count} pages &middot; {ep.content.pass_2_framework_selected}</span>
            </div>
          </Link>
        ))}
      </div>

      {visible.length < filtered.length && (
        <button
          onClick={() => setVisibleCount((c) => c + 10)}
          className="mt-8 text-sm underline cursor-pointer text-secondary hover:text-foreground"
        >
          Load more
        </button>
      )}
    </div>
  );
}
