import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen">
      {/* Dialogue — true center of viewport */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm">
            &ldquo;I can&rsquo;t listen to them all&rdquo; he said
          </p>
          <p className="text-sm mt-2">
            &ndash;And you don&rsquo;t have to we said calmly
          </p>
        </div>
      </div>

      {/* Explanation + links pinned to bottom */}
      <div className="absolute bottom-12 md:bottom-16 left-0 right-0 text-center px-6">
        <p className="text-xs text-secondary mb-8 max-w-sm mx-auto leading-relaxed">
          The best ideas from the best podcasts.
          <br />
          Turned into free e-books and a bi-weekly newsletter.
        </p>
        <div className="flex items-center justify-center gap-8 md:gap-12 text-sm">
          <Link href="/newsletter">Newsletter</Link>
          <Link href="/ebooks">E-books</Link>
          <Link href="/summaries">Quick summaries</Link>
        </div>
      </div>
    </div>
  );
}
