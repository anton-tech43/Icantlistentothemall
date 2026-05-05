import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full py-12 text-center text-xs text-secondary">
      <div className="flex items-center justify-center gap-3">
        <span>icantlistentothemall</span>
        <span>&middot;</span>
        <Link href="/privacy">Privacy</Link>
      </div>
    </footer>
  );
}
