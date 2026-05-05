// Agent 1 — Feed monitor orchestrator (Supabase version)
// Populates the real Supabase database with episodes from all 5 podcast feeds.

const db = require('./db-supabase');
const { parseFeed } = require('./rss-parser');
const { detectNewEpisodes } = require('./episode-detector-supabase');
const { validateAudioUrl } = require('./audio-acquisition');
const { withRetry } = require('./retry');

const LAUNCH_PODCASTS = require('./podcast-manager').LAUNCH_PODCASTS;

async function seedPodcasts() {
  const existing = await db.getActivePodcasts();
  const existingNames = new Set(existing.map(p => p.name));
  let added = 0;

  for (const podcast of LAUNCH_PODCASTS) {
    if (existingNames.has(podcast.name)) {
      console.log(`  Already exists: ${podcast.name}`);
      continue;
    }
    const id = await db.insertPodcast(podcast);
    console.log(`  Added: ${podcast.name} (${id})`);
    added++;
  }

  return added;
}

async function runCycle({ limit } = {}) {
  console.log(`\n=== Feed Monitor Cycle (Supabase) — ${new Date().toISOString()} ===\n`);

  let podcasts = await db.getActivePodcasts();

  if (podcasts.length === 0) {
    console.log('No active podcasts. Seeding launch podcasts...');
    await seedPodcasts();
    podcasts = await db.getActivePodcasts();
  }

  console.log(`Checking ${podcasts.length} active podcasts...\n`);

  const cycleSummary = {
    podcastsChecked: 0,
    newEpisodes: 0,
    duplicates: 0,
    skipped: 0,
    fetchErrors: 0,
  };

  for (const podcast of podcasts) {
    console.log(`[${podcast.name}]`);
    cycleSummary.podcastsChecked++;

    try {
      const feedData = await withRetry(
        () => parseFeed(podcast.rss_feed_url),
        { label: `fetch ${podcast.name}`, maxAttempts: 2 }
      );

      await db.recordFetchSuccess(podcast.id);

      let episodes = feedData.episodes;
      if (limit) {
        episodes = episodes.slice(0, limit);
        console.log(`  Fetched: ${feedData.episodes.length} in feed, processing first ${limit}`);
      } else {
        console.log(`  Fetched: ${episodes.length} episodes in feed`);
      }

      const results = await detectNewEpisodes(podcast.id, episodes);

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
      }

      if (results.duplicate.length > 0) {
        console.log(`  Duplicates: ${results.duplicate.length} (already in DB)`);
      }

      // Validate audio URLs for 3 most recent queued episodes
      const toValidate = results.new.slice(0, 3);
      for (const ep of toValidate) {
        const validation = await validateAudioUrl(ep.audioUrl);
        if (!validation.reachable) {
          console.log(`    ⚠ Audio unreachable: "${ep.title}": ${validation.error || 'HTTP ' + validation.statusCode}`);
        }
      }

    } catch (err) {
      cycleSummary.fetchErrors++;
      await db.recordFetchFailure(podcast.id).catch(() => {});
      console.log(`  ERROR: ${err.message}`);
    }

    console.log('');
  }

  const queued = await db.getQueuedItems();
  console.log(`--- Queue: ${queued.length} episodes waiting for processing ---`);

  console.log('\n--- Cycle Summary ---');
  console.log(`  Podcasts checked: ${cycleSummary.podcastsChecked}`);
  console.log(`  New episodes queued: ${cycleSummary.newEpisodes}`);
  console.log(`  Duplicates skipped: ${cycleSummary.duplicates}`);
  console.log(`  Filtered out: ${cycleSummary.skipped}`);
  console.log(`  Fetch errors: ${cycleSummary.fetchErrors}`);

  return cycleSummary;
}

// CLI: pass --limit=N to only process first N episodes per feed (for testing)
if (require.main === module) {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

  runCycle({ limit })
    .then(() => {
      console.log('\nCycle complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { runCycle };
