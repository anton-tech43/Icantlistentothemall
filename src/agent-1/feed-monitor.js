// Agent 1 — Feed monitor orchestrator
// Checks all active podcast feeds for new episodes, filters, deduplicates, and queues.
// Designed to run on a 6-hour cron cycle.

const db = require('./db');
const { parseFeed } = require('./rss-parser');
const { detectNewEpisodes } = require('./episode-detector');
const { checkFeedHealth } = require('./feed-health');
const { validateAudioUrl } = require('./audio-acquisition');
const { withRetry } = require('./retry');
const { seedLaunchPodcasts } = require('./podcast-manager');

async function runCycle() {
  console.log(`\n=== Feed Monitor Cycle — ${new Date().toISOString()} ===\n`);

  const podcasts = db.getActivePodcasts();

  if (podcasts.length === 0) {
    console.log('No active podcasts. Seeding launch podcasts...');
    seedLaunchPodcasts();
    return runCycle();
  }

  console.log(`Checking ${podcasts.length} active podcasts...\n`);

  const cycleSummary = {
    podcastsChecked: 0,
    newEpisodes: 0,
    duplicates: 0,
    skipped: 0,
    fetchErrors: 0,
    alerts: [],
  };

  for (const podcast of podcasts) {
    console.log(`[${podcast.name}]`);
    cycleSummary.podcastsChecked++;

    try {
      const feedData = await withRetry(
        () => parseFeed(podcast.rss_feed_url),
        { label: `fetch ${podcast.name}`, maxAttempts: 2 }
      );

      db.recordFetchSuccess(podcast.id);
      console.log(`  Fetched: ${feedData.episodes.length} episodes in feed`);

      const results = detectNewEpisodes(podcast.id, feedData.episodes);

      cycleSummary.newEpisodes += results.new.length;
      cycleSummary.duplicates += results.duplicate.length;
      cycleSummary.skipped += results.skipped.length;

      if (results.new.length > 0) {
        console.log(`  New: ${results.new.length} episodes queued`);
        for (const ep of results.new.slice(0, 5)) {
          console.log(`    + ${ep.title} (${ep.durationSeconds ? Math.round(ep.durationSeconds / 60) + 'm' : '?m'})`);
        }
        if (results.new.length > 5) {
          console.log(`    ... and ${results.new.length - 5} more`);
        }
      }

      if (results.skipped.length > 0) {
        console.log(`  Skipped: ${results.skipped.length}`);
        for (const ep of results.skipped.slice(0, 3)) {
          console.log(`    - ${ep.title}: ${ep.skipReason}`);
        }
        if (results.skipped.length > 3) {
          console.log(`    ... and ${results.skipped.length - 3} more`);
        }
      }

      if (results.duplicate.length > 0) {
        console.log(`  Duplicates: ${results.duplicate.length} (already in DB)`);
      }

      // Validate audio URLs for the 5 most recent queued episodes (skip bulk backlog)
      const toValidate = results.new.slice(0, 5);
      if (toValidate.length > 0) {
        console.log(`  Validating audio URLs (${toValidate.length} of ${results.new.length})...`);
        for (const ep of toValidate) {
          const validation = await validateAudioUrl(ep.audioUrl);
          if (!validation.reachable) {
            console.log(`    ⚠ Audio URL not reachable for "${ep.title}": ${validation.error || 'HTTP ' + validation.statusCode}`);
          }
        }
      }

    } catch (err) {
      cycleSummary.fetchErrors++;
      db.recordFetchFailure(podcast.id);
      console.log(`  ERROR: ${err.message}`);
    }

    console.log('');
  }

  // Check feed health after all fetches
  const healthAlerts = checkFeedHealth();
  cycleSummary.alerts = healthAlerts;

  if (healthAlerts.length > 0) {
    console.log('--- ALERTS ---');
    for (const alert of healthAlerts) {
      console.log(`  [${alert.severity.toUpperCase()}] ${alert.message}`);
    }
    console.log('');
  }

  // Print queue status
  const queued = db.getQueuedItems();
  console.log(`--- Queue: ${queued.length} episodes waiting for processing ---`);

  // Summary
  console.log('\n--- Cycle Summary ---');
  console.log(`  Podcasts checked: ${cycleSummary.podcastsChecked}`);
  console.log(`  New episodes queued: ${cycleSummary.newEpisodes}`);
  console.log(`  Duplicates skipped: ${cycleSummary.duplicates}`);
  console.log(`  Filtered out: ${cycleSummary.skipped}`);
  console.log(`  Fetch errors: ${cycleSummary.fetchErrors}`);
  console.log(`  Alerts: ${cycleSummary.alerts.length}`);

  return cycleSummary;
}

// CLI entry point
if (require.main === module) {
  runCycle()
    .then((summary) => {
      console.log('\nCycle complete.');
      db.closeDb();
    })
    .catch((err) => {
      console.error('Fatal error:', err);
      db.closeDb();
      process.exit(1);
    });
}

module.exports = { runCycle };
