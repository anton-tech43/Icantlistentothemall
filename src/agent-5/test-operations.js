// Agent 5 — Test script for Phase 3: operations (backup, digest, alerts, cleanup)
// Run with: node src/agent-5/test-operations.js

require('dotenv').config();
const db = require('./db');
const { exportTable } = require('./backup');
const { buildDigest } = require('./digest');
const { runAlertCheck, ALERT_CHECKS } = require('./alerts');
const { runCleanup } = require('./unsubscribe');

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

function seedFullTestData() {
  const dbInstance = db.getDb();

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS podcasts (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, rss_feed_url TEXT NOT NULL,
      accent_colour TEXT NOT NULL, format_tag TEXT NOT NULL, podcast_context TEXT,
      active INTEGER DEFAULT 1, last_successful_fetch TEXT,
      consecutive_failures INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY, podcast_id TEXT NOT NULL REFERENCES podcasts(id),
      guid TEXT, guid_hash TEXT, title TEXT NOT NULL, audio_url TEXT NOT NULL,
      duration_seconds INTEGER, duration_source TEXT, published_at TEXT,
      status TEXT NOT NULL DEFAULT 'queued', skip_reason TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS processed_content (
      id TEXT PRIMARY KEY, episode_id TEXT REFERENCES episodes(id),
      summary_text TEXT, ebook_content TEXT, ebook_pdf_url TEXT,
      self_rating_note TEXT, final_page_count INTEGER, guest_name TEXT,
      newsletter_insight TEXT, newsletter_stat TEXT, newsletter_tip TEXT,
      newsletter_exercise TEXT, newsletter_included INTEGER DEFAULT 0,
      pass_1_insight_count INTEGER, pass_1_agreement_score INTEGER,
      pass_2_framework_selected TEXT, pass_2_outline_approved INTEGER,
      pass_2_outline_edited INTEGER, self_review_scores TEXT,
      self_review_accuracy_score INTEGER, self_review_rewrites INTEGER,
      status TEXT NOT NULL DEFAULT 'draft', published_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS processing_queue (
      id TEXT PRIMARY KEY, episode_id TEXT REFERENCES episodes(id),
      status TEXT NOT NULL DEFAULT 'queued', current_step TEXT,
      retry_count INTEGER DEFAULT 0, last_retry_at TEXT,
      started_at TEXT, completed_at TEXT, error_log TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS pipeline_logs (
      id TEXT PRIMARY KEY, episode_id TEXT, step_name TEXT NOT NULL,
      prompt_version_id TEXT, started_at TEXT NOT NULL, finished_at TEXT,
      duration_seconds NUMERIC, input_tokens INTEGER, output_tokens INTEGER,
      audio_duration_seconds NUMERIC, cost_usd NUMERIC,
      status TEXT NOT NULL, error_message TEXT, metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS cost_tracking (
      id TEXT PRIMARY KEY, episode_id TEXT, service TEXT NOT NULL,
      operation TEXT NOT NULL, tokens_in INTEGER, tokens_out INTEGER,
      cost_usd NUMERIC NOT NULL, created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed podcast
  dbInstance.prepare(`INSERT OR IGNORE INTO podcasts (id, name, rss_feed_url, accent_colour, format_tag, consecutive_failures) VALUES (?, ?, ?, ?, ?, ?)`).run('pod-1', 'The Game', 'https://example.com/rss', '#A0522D', 'solo', 0);

  // Seed episode
  dbInstance.prepare(`INSERT OR IGNORE INTO episodes (id, podcast_id, guid, title, audio_url, status, created_at) VALUES (?, ?, ?, ?, ?, 'published', datetime('now'))`).run('ep-1', 'pod-1', 'guid-1', 'Test Episode', 'https://example.com/audio.mp3');

  // Seed processed content
  dbInstance.prepare(`INSERT OR IGNORE INTO processed_content (id, episode_id, summary_text, pass_2_framework_selected, self_review_accuracy_score, self_review_rewrites, pass_2_outline_approved, pass_2_outline_edited, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', datetime('now'))`).run('pc-1', 'ep-1', 'Test summary', 'The Big Idea', 8, 0, 1, 0);

  // Seed cost tracking
  dbInstance.prepare(`INSERT OR IGNORE INTO cost_tracking (id, episode_id, service, operation, cost_usd, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`).run('cost-1', 'ep-1', 'claude', 'pass_1', 2.50);

  // Seed pipeline logs
  dbInstance.prepare(`INSERT OR IGNORE INTO pipeline_logs (id, episode_id, step_name, started_at, finished_at, duration_seconds, cost_usd, status, created_at) VALUES (?, ?, ?, datetime('now'), datetime('now'), ?, ?, 'success', datetime('now'))`).run('log-1', 'ep-1', 'pass_1_instance_a', 120, 1.50);

  // Seed subscribers
  db.createSubscriber('active@example.com');
  const sub = db.getSubscriberByEmail('active@example.com');
  if (sub && sub.status === 'pending') db.confirmSubscriber(sub.confirmation_token);
}

async function runTests() {
  console.log('=== Agent 5: Operations Test (Phase 3) ===\n');

  seedFullTestData();

  // Test 1: Backup export
  console.log('1. Backup table export');
  const subscribers = exportTable('subscribers');
  assert('Subscribers exported', Array.isArray(subscribers) && subscribers.length >= 1);

  const podcasts = exportTable('podcasts');
  assert('Podcasts exported', Array.isArray(podcasts) && podcasts.length >= 1);

  const episodes = exportTable('episodes');
  assert('Episodes exported', Array.isArray(episodes) && episodes.length >= 1);

  const missing = exportTable('nonexistent_table');
  assert('Missing table returns empty array', Array.isArray(missing) && missing.length === 0);

  // Test 2: Digest building
  console.log('\n2. Weekly digest');
  const digest = buildDigest();
  assert('Digest text generated', typeof digest.text === 'string' && digest.text.length > 100);
  assert('Digest contains header', digest.text.includes('WEEKLY DIGEST'));
  assert('Digest contains PIPELINE section', digest.text.includes('PIPELINE'));
  assert('Digest contains QUALITY section', digest.text.includes('QUALITY'));
  assert('Digest contains SITE section', digest.text.includes('SITE'));
  assert('Digest contains NEWSLETTER section', digest.text.includes('NEWSLETTER'));
  assert('Digest contains HEALTH section', digest.text.includes('HEALTH'));
  assert('Digest contains analytics placeholder', digest.text.includes('analytics integration pending'));
  assert('Digest has stats object', typeof digest.stats === 'object');
  assert('Stats has totalActive', typeof digest.stats.totalActive === 'number');
  console.log(`  Digest preview (first 300 chars):\n${digest.text.slice(0, 300)}...`);

  // Test 3: Alert checks (no alerts should fire with normal data)
  console.log('\n3. Alert checks (normal state — no alerts expected)');
  const alerts = [];
  for (const check of ALERT_CHECKS) {
    try {
      const result = check.check();
      if (result) alerts.push({ name: check.name, message: result });
    } catch (err) {
      console.log(`  Warning: ${check.name} threw: ${err.message}`);
    }
  }
  assert('No alerts triggered on normal data', alerts.length === 0);

  // Test 4: Alert check — feed failure
  console.log('\n4. Alert check — simulate feed failure');
  const dbInstance = db.getDb();
  dbInstance.prepare('UPDATE podcasts SET consecutive_failures = 5 WHERE id = ?').run('pod-1');
  const feedCheck = ALERT_CHECKS.find(a => a.name === 'feed_failure');
  const feedAlert = feedCheck.check();
  assert('Feed failure alert triggered', feedAlert !== null && feedAlert.includes('The Game'));
  dbInstance.prepare('UPDATE podcasts SET consecutive_failures = 0 WHERE id = ?').run('pod-1');

  // Test 5: Alert check — worker stalled
  console.log('\n5. Alert check — simulate worker stall');
  dbInstance.prepare(`INSERT INTO processing_queue (id, episode_id, status, current_step, created_at) VALUES (?, ?, 'queued', 'pending', datetime('now', '-3 days'))`).run('pq-stall-1', 'ep-1');
  const stallCheck = ALERT_CHECKS.find(a => a.name === 'worker_stalled');
  const stallAlert = stallCheck.check();
  assert('Worker stall alert triggered', stallAlert !== null && stallAlert.includes('queued'));
  dbInstance.prepare('DELETE FROM processing_queue WHERE id = ?').run('pq-stall-1');

  // Test 6: Subscriber cleanup
  console.log('\n6. Subscriber cleanup');
  db.createSubscriber('cleanup-test@example.com');
  const cleanupSub = db.getSubscriberByEmail('cleanup-test@example.com');
  db.confirmSubscriber(cleanupSub.confirmation_token);
  db.unsubscribe('cleanup-test@example.com');

  const deletedRecent = runCleanup(30);
  assert('Recent unsubscribe not deleted', deletedRecent === 0);

  const deletedNow = runCleanup(0);
  assert('Zero-day cleanup deletes unsubscribed', deletedNow === 1);
  assert('Cleaned subscriber is gone', !db.getSubscriberByEmail('cleanup-test@example.com'));

  // Test 7: All alert checks exist
  console.log('\n7. Alert check coverage');
  const expectedAlerts = [
    'weekly_cost_cap', 'episode_cost_exceeded', 'monthly_budget_warning',
    'quality_degradation', 'feed_failure', 'worker_stalled',
    'api_error_spike', 'subscriber_milestone',
  ];
  for (const name of expectedAlerts) {
    assert(`Alert "${name}" exists`, ALERT_CHECKS.some(a => a.name === name));
  }

  // Test 8: Cron module loads
  console.log('\n8. Cron entry points');
  const crons = require('./crons');
  assert('cronNewsletter exists', typeof crons.cronNewsletter === 'function');
  assert('cronHourly exists', typeof crons.cronHourly === 'function');
  assert('cronNightlyBackup exists', typeof crons.cronNightlyBackup === 'function');
  assert('cronWeeklyDigest exists', typeof crons.cronWeeklyDigest === 'function');
  assert('cronDailyCleanup exists', typeof crons.cronDailyCleanup === 'function');

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
