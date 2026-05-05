import { notFound } from "next/navigation";
import { NewsletterSignup } from "@/components/newsletter-signup";

export default async function NewsletterArchivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // TODO: fetch from Supabase newsletters table
  // For now, return not found since no newsletters exist yet
  notFound();

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 md:py-24">
      <p className="text-xs text-secondary mb-8">Newsletter archive</p>

      <h1 className="text-base mb-8">{slug}</h1>

      <hr className="border-foreground/10 mb-8" />

      <div className="text-sm leading-relaxed space-y-8 mb-12">
        <div>
          <p className="text-xs text-secondary uppercase tracking-wider mb-2">Top Insight</p>
        </div>
        <div>
          <p className="text-xs text-secondary uppercase tracking-wider mb-2">Surprising Stat</p>
        </div>
        <div>
          <p className="text-xs text-secondary uppercase tracking-wider mb-2">Do This Today</p>
        </div>
        <div>
          <p className="text-xs text-secondary uppercase tracking-wider mb-2">Reflect On This</p>
        </div>
      </div>

      <hr className="border-foreground/10 mb-8" />

      <p className="text-sm mb-4">Want insights like this every two weeks?</p>
      <NewsletterSignup />
    </div>
  );
}
