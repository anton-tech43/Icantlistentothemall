import { NewsletterSignup } from "@/components/newsletter-signup";

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 md:py-24">
      {/* Dialogue */}
      <div className="mb-12">
        <p className="text-sm">
          &ldquo;Why does this exist?&rdquo; she asked
        </p>
        <p className="text-sm mt-2">
          &ndash;Because some of us would rather read we said
        </p>
      </div>

      <div className="text-sm text-secondary leading-relaxed space-y-6 mb-16 max-w-lg">
        <p>
          There are too many podcasts and not enough time. The best
          conversations happen in 2-hour episodes that most people will never
          listen to.
        </p>
        <p>
          So we listen for you. We take the best episodes from podcasts like
          Diary of a CEO, My First Million, Tim Ferriss, Hormozi, and
          Lenny&rsquo;s Podcast and turn them into short, free e-books you can
          read in 15 minutes.
        </p>
        <p>
          Every two weeks we send a newsletter with the top insight, a
          surprising stat, something you can do today, and a reflection
          exercise. Plus links to the latest e-books.
        </p>
        <p>
          Everything is free. No ads. No sponsors. No paywalls.
        </p>
      </div>

      <NewsletterSignup />
    </div>
  );
}
