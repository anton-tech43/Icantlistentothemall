export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 md:py-24">
      <h1 className="text-base mb-12">Privacy</h1>

      <div className="text-sm text-secondary leading-relaxed space-y-6 max-w-lg">
        <p>
          We collect your email address when you sign up for the newsletter.
          That&rsquo;s it.
        </p>
        <p>
          We use it to send you the bi-weekly newsletter. We don&rsquo;t sell
          it, share it, or do anything weird with it.
        </p>
        <p>
          We use Plausible for analytics, which doesn&rsquo;t use cookies and
          doesn&rsquo;t collect personal data. We can see how many people visit
          the site and which pages they look at. We can&rsquo;t see who they
          are.
        </p>
        <p>
          Every email includes a one-click unsubscribe link. If you
          unsubscribe, we delete your email address within 30 days.
        </p>
        <p>
          If you have questions, email us.
        </p>
      </div>
    </div>
  );
}
