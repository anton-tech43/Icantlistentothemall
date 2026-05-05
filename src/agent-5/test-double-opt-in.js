// Agent 5 — End-to-end test for the double opt-in flow
// Tests: signup → confirmation → welcome email → unsubscribe → cleanup
// Run with: node src/agent-5/test-double-opt-in.js
// Requires RESEND_API_KEY in .env for real email sending (or runs DB-only without it).

require('dotenv').config();
const db = require('./db');
const { handleSignup, handleConfirmation } = require('./double-opt-in');
const { handleUnsubscribe, runCleanup } = require('./unsubscribe');

const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const DRY_RUN = !process.env.RESEND_API_KEY;

async function runTests() {
  console.log('=== Agent 5: Double Opt-In Flow Test ===\n');
  console.log(DRY_RUN ? '(DRY RUN — no RESEND_API_KEY, testing DB operations only)\n' : '(LIVE — will send real emails)\n');

  let passed = 0;
  let failed = 0;

  function assert(label, condition) {
    if (condition) {
      console.log(`  PASS: ${label}`);
      passed++;
    } else {
      console.log(`  FAIL: ${label}`);
      failed++;
    }
  }

  // Test 1: Create a new subscriber
  console.log('1. Signup with new email');
  if (DRY_RUN) {
    const { id, token, alreadyActive } = db.createSubscriber(TEST_EMAIL);
    assert('Subscriber created', !!id);
    assert('Token generated', !!token);
    assert('Not already active', !alreadyActive);

    const subscriber = db.getSubscriberByEmail(TEST_EMAIL);
    assert('Status is pending', subscriber.status === 'pending');
    assert('Token stored', subscriber.confirmation_token === token);

    // Test 2: Confirm the subscriber
    console.log('\n2. Confirm subscription');
    const result = db.confirmSubscriber(token);
    assert('Confirmation succeeded', !!result);
    assert('Not already confirmed', !result.alreadyConfirmed);

    const confirmed = db.getSubscriberByEmail(TEST_EMAIL);
    assert('Status is active', confirmed.status === 'active');
    assert('confirmed_at set', !!confirmed.confirmed_at);
    assert('subscribed_at set', !!confirmed.subscribed_at);
    assert('Token cleared', !confirmed.confirmation_token);

    // Test 3: Duplicate signup (already active)
    console.log('\n3. Duplicate signup (already active)');
    const dup = db.createSubscriber(TEST_EMAIL);
    assert('Returns existing id', dup.id === id);
    assert('No new token (already active)', dup.token === null);
    assert('Flagged as already active', dup.alreadyActive === true);

    // Test 4: Confirm with invalid token
    console.log('\n4. Invalid confirmation token');
    const invalid = db.confirmSubscriber('bad-token-12345');
    assert('Returns null for bad token', invalid === null);

    // Test 5: Unsubscribe
    console.log('\n5. Unsubscribe');
    const unsub = handleUnsubscribe(TEST_EMAIL);
    assert('Unsubscribe succeeded', unsub.success);

    const unsubbed = db.getSubscriberByEmail(TEST_EMAIL);
    assert('Status is inactive', unsubbed.status === 'inactive');
    assert('unsubscribed_at set', !!unsubbed.unsubscribed_at);

    // Test 6: Re-subscribe (after unsubscribe)
    console.log('\n6. Re-subscribe after unsubscribe');
    const resub = db.createSubscriber(TEST_EMAIL);
    assert('Gets new token', !!resub.token);
    assert('Not flagged as active', !resub.alreadyActive);

    const resubbed = db.getSubscriberByEmail(TEST_EMAIL);
    assert('Status back to pending', resubbed.status === 'pending');

    // Test 7: Cleanup (won't delete because unsubscribed_at was just set)
    console.log('\n7. Cleanup cron (nothing to delete — too recent)');
    db.confirmSubscriber(resub.token);
    handleUnsubscribe(TEST_EMAIL);
    const deleted = runCleanup(30);
    assert('No subscribers deleted (too recent)', deleted === 0);

    // Test 8: Cleanup with 0-day threshold (should delete)
    console.log('\n8. Cleanup cron (0-day threshold — should delete)');
    const deleted0 = runCleanup(0);
    assert('Subscriber deleted', deleted0 === 1);

    const gone = db.getSubscriberByEmail(TEST_EMAIL);
    assert('Subscriber removed from DB', !gone);

  } else {
    // Live test with real emails
    console.log(`  Sending confirmation email to ${TEST_EMAIL}...`);
    try {
      const result = await handleSignup(TEST_EMAIL);
      assert('Signup succeeded', result.success);
      assert('Subscriber ID returned', !!result.subscriberId);

      const subscriber = db.getSubscriberByEmail(TEST_EMAIL);
      assert('Status is pending', subscriber.status === 'pending');
      console.log(`  Confirmation token: ${subscriber.confirmation_token}`);
      console.log(`  Check ${TEST_EMAIL} for the confirmation email.`);
      console.log(`  To complete the test, run:`);
      console.log(`    node -e "require('./src/agent-5/double-opt-in').handleConfirmation('${subscriber.confirmation_token}').then(console.log)"`);
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
      failed++;
    }
  }

  // Test: Newsletter DB operations
  console.log('\n9. Newsletter DB operations');
  const nlId = db.createNewsletter({
    subjectLine: 'The pricing mistake that costs most founders 5x revenue',
    dialogueHeader: '"I missed another episode" he said\n–We caught it for you we said',
    topInsight: 'Hormozi argues value-based pricing captures 5-10x more revenue than cost-based.',
    surprisingStat: '83% of SaaS founders price based on competitor benchmarks rather than customer outcomes.',
    actionableTip: 'List three measurable outcomes your product delivers. Price against the most valuable one.',
    exercise: 'Ask yourself: if your product disappeared tomorrow, what would your best customer lose in dollars?',
    footerEbookLinks: [{ title: 'The Pricing Framework', podcastName: 'The Game', pdfUrl: 'https://example.com/test.pdf', pageCount: 8 }],
    episodeIds: ['ep-001', 'ep-002', 'ep-003'],
  });
  assert('Newsletter created', !!nlId);

  const nl = db.getNewsletterById(nlId);
  assert('Newsletter retrievable', !!nl);
  assert('Status is draft', nl.status === 'draft');
  assert('Episode IDs parsed', Array.isArray(nl.episode_ids) && nl.episode_ids.length === 3);
  assert('Footer links parsed', Array.isArray(nl.footer_ebook_links) && nl.footer_ebook_links.length === 1);

  db.approveNewsletter(nlId);
  const approved = db.getNewsletterById(nlId);
  assert('Newsletter approved', approved.status === 'approved');

  db.markNewsletterSent(nlId);
  const sent = db.getNewsletterById(nlId);
  assert('Newsletter marked sent', sent.status === 'sent');
  assert('sent_at set', !!sent.sent_at);

  // Summary
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  db.closeDb();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test error:', err);
  db.closeDb();
  process.exit(1);
});
