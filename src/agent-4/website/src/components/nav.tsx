import Link from "next/link";

export function Nav() {
  return (
    <nav className="w-full px-6 py-6 flex items-baseline justify-between max-w-2xl mx-auto gap-6">
      <Link href="/" className="text-sm tracking-wide no-underline shrink-0">
        icantlistentothemall
      </Link>
      <div className="flex items-baseline gap-3 text-xs md:text-sm md:gap-5 shrink-0">
        <Link href="/ebooks" className="whitespace-nowrap">E-books</Link>
        <span className="text-secondary">&middot;</span>
        <Link href="/newsletter">Newsletter</Link>
        <span className="text-secondary">&middot;</span>
        <Link href="/about">About</Link>
      </div>
    </nav>
  );
}
