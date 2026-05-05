import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <div className="mb-12">
        <p className="text-sm">
          &ldquo;This page doesn&rsquo;t exist&rdquo; he said
        </p>
        <p className="text-sm mt-2">
          &ndash;Neither does the time to listen to all those podcasts we said
        </p>
      </div>

      <Link href="/" className="text-sm">
        Go home
      </Link>
    </div>
  );
}
