// Agent 5 — Test script for Phase 2: newsletter generation pipeline
// Tests prompt building, response parsing, DB operations, and send flow.
// Run with: node src/agent-5/test-newsletter.js

require('dotenv').config();
const db = require('./db');
const {
  buildNewsletterPrompt,
  buildSelfReviewPrompt,
  parseNewsletterResponse,
  parseSelfReviewResponse,
} = require('./newsletter-prompt');
const { handleApprove, handleHold } = require('./newsletter-send');

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

function seedTestData() {
  const dbInstance = db.getDb();

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS podcasts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      rss_feed_url TEXT NOT NULL,
      accent_colour TEXT NOT NULL,
      format_tag TEXT NOT NULL,
      podcast_context TEXT,
      active INTEGER DEFAULT 1,
      last_successful_fetch TEXT,
      consecutive_failures INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY,
      podcast_id TEXT NOT NULL REFERENCES podcasts(id),
      guid TEXT,
      guid_hash TEXT,
      title TEXT NOT NULL,
      audio_url TEXT NOT NULL,
      duration_seconds INTEGER,
      duration_source TEXT,
      published_at TEXT,
      status TEXT NOT NULL DEFAULT 'queued',
      skip_reason TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS processed_content (
      id TEXT PRIMARY KEY,
      episode_id TEXT REFERENCES episodes(id),
      summary_text TEXT,
      ebook_content TEXT,
      ebook_pdf_url TEXT,
      self_rating_note TEXT,
      final_page_count INTEGER,
      guest_name TEXT,
      newsletter_insight TEXT,
      newsletter_stat TEXT,
      newsletter_tip TEXT,
      newsletter_exercise TEXT,
      newsletter_included INTEGER DEFAULT 0,
      pass_1_insight_count INTEGER,
      pass_1_agreement_score INTEGER,
      pass_2_framework_selected TEXT,
      self_review_scores TEXT,
      self_review_accuracy_score INTEGER,
      self_review_rewrites INTEGER,
      status TEXT NOT NULL DEFAULT 'draft',
      published_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const podcastId = 'pod-test-001';
  dbInstance.prepare(`INSERT OR IGNORE INTO podcasts (id, name, rss_feed_url, accent_colour, format_tag) VALUES (?, ?, ?, ?, ?)`).run(podcastId, 'The Game w/ Alex Hormozi', 'https://example.com/rss', '#A0522D', 'solo');

  const testEpisodes = [
    {
      id: 'ep-test-001', title: 'The Pricing Framework Most Founders Get Wrong', pageCount: 8,
      insight: 'Hormozi argues that pricing based on cost leaves 5-10x revenue on the table. Value-based pricing ties your price to the measurable outcome your customer gets, not what it costs you to deliver.',
      stat: '83% of SaaS founders price based on competitor benchmarks rather than customer outcomes.',
      tip: 'List three measurable outcomes your product delivers. Price against the most valuable one.',
      exercise: 'Ask yourself: if your product disappeared tomorrow, what would your best customer lose in dollars?',
    },
    {
      id: 'ep-test-002', title: 'Three Hiring Mistakes That Cost Him $2M', pageCount: 6,
      insight: 'The most expensive hire is the one you keep too long. Bartlett spent $2M on a C-suite executive who looked perfect on paper but poisoned the team culture for 18 months before he acted.',
      stat: 'Companies that fire fast spend 40% less on bad hires over a 5-year period than companies that "give it time."',
      tip: 'Set a 90-day review for every new hire. Write down what success looks like on day one. Compare at day 90 with no renegotiation.',
      exercise: 'Reflect on this: name one person on your team whose departure would secretly relieve you. What are you waiting for?',
    },
    {
      id: 'ep-test-003', title: 'Why Cold Outreach Still Works in 2026', pageCount: 4,
      insight: 'Sam Parr and Shaan Puri tested 12 cold email frameworks. The only one that consistently worked: one sentence about the prospect, one sentence about the offer, one question. Three sentences total.',
      stat: 'A 3-sentence cold email gets 4.2x the reply rate of a 7-sentence email with the same offer.',
      tip: 'Rewrite your last cold email in exactly three sentences. Send it to 20 prospects this week and track the reply rate.',
      exercise: 'This week, count the sentences in every email you send. Flag any over five sentences and ask: could this be shorter?',
    },
  ];

  for (const ep of testEpisodes) {
    dbInstance.prepare(`INSERT OR IGNORE INTO episodes (id, podcast_id, guid, title, audio_url, duration_seconds, published_at, status) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 'published')`).run(ep.id, podcastId, ep.id, ep.title, 'https://example.com/audio.mp3', 3600);

    dbInstance.prepare(`INSERT OR IGNORE INTO processed_content (id, episode_id, ebook_pdf_url, final_page_count, newsletter_insight, newsletter_stat, newsletter_tip, newsletter_exercise, newsletter_included, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'published', datetime('now'))`).run(
      `pc-${ep.id}`, ep.id, `https://example.com/${ep.id}.pdf`, ep.pageCount,
      ep.insight, ep.stat, ep.tip, ep.exercise
    );
  }

  return testEpisodes;
}

async function runTests() {
  console.log('=== Agent 5: Newsletter Generation Test ===\n');

  // Seed test data
  console.log('0. Seeding test data');
  const testEpisodes = seedTestData();
  assert('Test episodes seeded', testEpisodes.length === 3);

  // Test 1: Prompt building
  console.log('\n1. Newsletter prompt building');
  const episodeData = testEpisodes.map(ep => ({
    title: ep.title,
    podcastName: 'The Game w/ Alex Hormozi',
    guestName: 'Alex Hormozi',
    newsletterInsight: ep.insight,
    newsletterStat: ep.stat,
    newsletterTip: ep.tip,
    newsletterExercise: ep.exercise,
    ebookUrl: `https://example.com/${ep.id}.pdf`,
    pageCount: ep.pageCount,
  }));

  const prompt = buildNewsletterPrompt(episodeData);
  assert('Prompt contains episode count', prompt.includes('3 recent episodes'));
  assert('Prompt contains episode titles', prompt.includes('The Pricing Framework'));
  assert('Prompt contains dialogue examples', prompt.includes('I missed another 3-hour episode'));
  assert('Prompt contains anti-slop rules', prompt.includes('No throat-clearing'));
  assert('Prompt contains output format', prompt.includes('DIALOGUE_HEADER_READER'));
  console.log(`  Prompt length: ${prompt.length} chars`);

  // Test 2: Response parsing
  console.log('\n2. Newsletter response parsing');
  const mockResponse = `DIALOGUE_HEADER_READER: "I've got 47 episodes in my queue" he said
DIALOGUE_HEADER_RESPONSE: –We picked the five that matter we said

TOP_INSIGHT: Hormozi argues that pricing based on cost leaves 5-10x revenue on the table. Value-based pricing ties your price to the measurable outcome your customer gets.
TOP_INSIGHT_EPISODE: The Pricing Framework Most Founders Get Wrong
TOP_INSIGHT_PODCAST: The Game w/ Alex Hormozi
TOP_INSIGHT_EBOOK_URL: https://example.com/ep-test-001.pdf

SURPRISING_STAT: A 3-sentence cold email gets 4.2x the reply rate of a 7-sentence email with the same offer.

ACTIONABLE_TIP: List three measurable outcomes your product delivers. Price against the most valuable one.

EXERCISE: Ask yourself: if your product disappeared tomorrow, what would your best customer lose in dollars?

SUBJECT_LINE_1: The pricing mistake that costs most founders 5x revenue
SUBJECT_LINE_2: Why 3-sentence emails outperform 7-sentence ones by 4x
SUBJECT_LINE_3: The $2M hiring lesson Bartlett learned too late

FOOTER_LINKS:
- The Pricing Framework Most Founders Get Wrong | The Game | 8 pages | https://example.com/ep-test-001.pdf
- Three Hiring Mistakes That Cost Him $2M | The Game | 6 pages | https://example.com/ep-test-002.pdf
- Why Cold Outreach Still Works in 2026 | The Game | 4 pages | https://example.com/ep-test-003.pdf`;

  const parsed = parseNewsletterResponse(mockResponse);
  assert('Dialogue reader parsed', parsed.dialogueHeader.reader === '"I\'ve got 47 episodes in my queue" he said');
  assert('Dialogue response parsed', parsed.dialogueHeader.response === '–We picked the five that matter we said');
  assert('Top insight text parsed', parsed.topInsight.text && parsed.topInsight.text.includes('pricing'));
  assert('Top insight episode parsed', parsed.topInsight.episodeTitle === 'The Pricing Framework Most Founders Get Wrong');
  assert('Surprising stat parsed', parsed.surprisingStat && parsed.surprisingStat.includes('4.2x'));
  assert('Actionable tip parsed', parsed.actionableTip && parsed.actionableTip.includes('measurable outcomes'));
  assert('Exercise parsed', parsed.exercise && parsed.exercise.includes('disappeared'));
  assert('3 subject lines parsed', parsed.subjectLines.length === 3);
  assert('Subject line 1 is most specific', parsed.subjectLines[0].includes('pricing'));
  assert('3 footer links parsed', parsed.footerEbookLinks.length === 3);
  assert('Footer link has title', parsed.footerEbookLinks[0].title === 'The Pricing Framework Most Founders Get Wrong');
  assert('Footer link has URL', parsed.footerEbookLinks[0].pdfUrl === 'https://example.com/ep-test-001.pdf');

  // Test 3: Self-review parsing
  console.log('\n3. Self-review response parsing');
  const mockReview = `- Directness: 8 — Every sentence states its point without preamble.
- Rhythm: 7 — Good mix of sentence lengths, though the tip section could vary more.
- Trust: 9 — No hedging or over-explanation. Treats the reader as competent.
- Authenticity: 8 — Reads like a person wrote it. The cold email stat lands naturally.
- Density: 7 — Every section earns its place. The exercise could be tighter.
- TOTAL: 39/50

SPECIFIC ISSUES:
1. "List three measurable outcomes" — slightly generic, could name an example outcome type.

PASS/FAIL: PASS`;

  const review = parseSelfReviewResponse(mockReview);
  assert('Total score parsed', review.total === 39);
  assert('Pass/fail parsed', review.passed === true);
  assert('Directness dimension parsed', review.dimensions.directness === 8);
  assert('Trust dimension parsed', review.dimensions.trust === 9);

  // Test 4: Newsletter DB draft + approve + hold
  console.log('\n4. Newsletter draft storage and approval flow');
  const nlId = db.createNewsletter({
    subjectLine: parsed.subjectLines[0],
    dialogueHeader: `${parsed.dialogueHeader.reader}\n${parsed.dialogueHeader.response}`,
    topInsight: parsed.topInsight.text,
    surprisingStat: parsed.surprisingStat,
    actionableTip: parsed.actionableTip,
    exercise: parsed.exercise,
    footerEbookLinks: parsed.footerEbookLinks,
    selfReviewScore: review.dimensions,
    episodeIds: ['ep-test-001', 'ep-test-002', 'ep-test-003'],
  });
  assert('Newsletter draft created', !!nlId);

  const draft = db.getNewsletterById(nlId);
  assert('Draft status is draft', draft.status === 'draft');
  assert('Subject line stored', draft.subject_line === parsed.subjectLines[0]);

  // Test hold
  const holdResult = await handleHold(nlId);
  assert('Hold succeeds', holdResult.success);
  const held = db.getNewsletterById(nlId);
  assert('Status still draft after hold', held.status === 'draft');

  // Test approve (will fail sending without Resend, but approval logic works)
  db.approveNewsletter(nlId);
  const approved = db.getNewsletterById(nlId);
  assert('Status is approved', approved.status === 'approved');

  // Test 5: Eligible episodes query
  console.log('\n5. Eligible episodes query');
  const { getEligibleEpisodes } = require('./newsletter-generate');
  const eligible = getEligibleEpisodes();
  assert('Found 3 eligible episodes', eligible.length === 3);
  assert('Episodes have newsletter material', !!eligible[0].newsletter_insight);
  assert('Episodes have podcast name', !!eligible[0].podcast_name);

  // Test 6: Mark episodes included
  console.log('\n6. Mark episodes as newsletter_included');
  const { markEpisodesIncluded } = require('./newsletter-generate');
  markEpisodesIncluded(['ep-test-001', 'ep-test-002', 'ep-test-003']);
  const afterMark = getEligibleEpisodes();
  assert('No more eligible episodes after marking', afterMark.length === 0);

  // Test 7: Create subscriber for send test
  console.log('\n7. Subscriber for send test');
  db.createSubscriber('test-newsletter@example.com');
  db.confirmSubscriber(db.getSubscriberByEmail('test-newsletter@example.com').confirmation_token);
  const subs = db.getActiveSubscribers();
  assert('Active subscriber exists for send', subs.length >= 1);

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
