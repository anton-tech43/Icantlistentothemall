import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { episodes, getEpisodeBySlug, formatDuration } from "@/lib/seed-data";
import { NewsletterSignup } from "@/components/newsletter-signup";

export function generateStaticParams() {
  return episodes.map((ep) => ({ slug: ep.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ep = getEpisodeBySlug(slug);
  if (!ep) return {};

  return {
    title: ep.title,
    description: ep.content.summary_text.slice(0, 160),
    openGraph: {
      title: `${ep.title} — icantlistentothemall`,
      description: ep.content.summary_text.slice(0, 160),
      type: "article",
    },
  };
}

export default async function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ep = getEpisodeBySlug(slug);
  if (!ep) notFound();

  const { content, podcast } = ep;

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 md:py-24">
      <h1 className="text-base mb-4">{ep.title}</h1>

      <div className="flex items-center gap-2 text-xs text-secondary mb-2">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: podcast.accent_colour }}
        />
        <span>{content.guest_name}</span>
        <span>&middot;</span>
        <span>{podcast.name}</span>
      </div>

      <p className="text-xs text-secondary mb-8">
        Episode aired: {new Date(ep.published_at).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}
        {" "}&middot; Duration: {formatDuration(ep.duration_seconds)}
        <br />
        {content.final_page_count} pages &middot; {content.pass_2_framework_selected}
      </p>

      <hr className="border-foreground/10 mb-8" />

      {/* Summary */}
      <p className="text-sm leading-relaxed mb-8">
        {content.summary_text}
      </p>

      <hr className="border-foreground/10 mb-8" />

      {/* Chapters */}
      <p className="text-xs text-secondary mb-4">What&rsquo;s inside:</p>
      <ol className="list-decimal list-inside text-sm leading-loose mb-8">
        {content.chapters.map((ch, i) => (
          <li key={i}>{ch}</li>
        ))}
      </ol>

      <hr className="border-foreground/10 mb-8" />

      {/* Self-rating note */}
      <p className="text-xs text-secondary leading-relaxed mb-4">
        {content.self_rating_note}
      </p>

      {/* Download */}
      {content.ebook_pdf_url ? (
        <a
          href={content.ebook_pdf_url}
          download
          className="inline-block text-sm mb-8"
        >
          Get the e-book &darr;
        </a>
      ) : (
        <p className="text-sm text-secondary mb-8">
          E-book coming soon
        </p>
      )}

      <hr className="border-foreground/10 mb-8" />

      {/* Newsletter material */}
      <div className="text-sm leading-relaxed space-y-6 mb-12">
        <div>
          <p className="text-xs text-secondary mb-1">Surprising stat from this episode:</p>
          <p>{content.newsletter_stat}</p>
        </div>
        <div>
          <p className="text-xs text-secondary mb-1">Something you can do today:</p>
          <p>{content.newsletter_tip}</p>
        </div>
        <div>
          <p className="text-xs text-secondary mb-1">Reflect on this:</p>
          <p>{content.newsletter_exercise}</p>
        </div>
      </div>

      <hr className="border-foreground/10 mb-8" />

      {/* Signup */}
      <p className="text-sm mb-4">Want insights like this every two weeks?</p>
      <NewsletterSignup />
    </div>
  );
}
