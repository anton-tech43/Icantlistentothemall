import { NewsletterSignup } from "@/components/newsletter-signup";

export default function NewsletterPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 md:py-24">
      {/* Dialogue */}
      <div className="mb-12">
        <p className="text-sm">
          &ldquo;I missed another 3-hour episode&rdquo; he said
        </p>
        <p className="text-sm mt-2">
          &ndash;We caught it for you we said
        </p>
      </div>

      <p className="text-sm text-secondary leading-relaxed mb-12 max-w-md">
        Every two weeks, we read the best podcast episodes so you don&rsquo;t
        have to listen. One email with the top insight, a surprising stat,
        something you can do today, and a reflection exercise. Plus links to
        free e-books.
      </p>

      <div className="mb-16">
        <NewsletterSignup />
      </div>

      <hr className="border-foreground/10 mb-12" />

      {/* Archive placeholder */}
      <h2 className="text-sm mb-8">Past issues</h2>
      <p className="text-xs text-secondary">
        No issues yet. The first one is coming soon.
      </p>
    </div>
  );
}
