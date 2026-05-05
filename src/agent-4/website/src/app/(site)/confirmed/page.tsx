import Link from "next/link";

export default function ConfirmedPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 md:py-24">
      <div className="mb-12">
        <p className="text-sm">
          &ldquo;You&rsquo;re in&rdquo; he said
        </p>
        <p className="text-sm mt-2">
          &ndash;Headphones off we said
        </p>
      </div>

      <p className="text-sm text-secondary leading-relaxed mb-8 max-w-md">
        You&rsquo;ll get the next issue in your inbox. In the meantime:
      </p>

      <div className="flex flex-col gap-3 text-sm">
        <Link href="/newsletter">Browse the newsletter archive</Link>
        <Link href="/ebooks">Read the latest e-books</Link>
      </div>
    </div>
  );
}
