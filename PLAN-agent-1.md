# PLAN — Agent 1: RSS Monitor & Audio Acquisition

## Status: Phase 1 & 2 COMPLETE

## What Was Built

### Phase 1: RSS Parser Test
- Standalone test script (`src/agent-1/01-rss-test.js`) that parses all 5 launch feeds
- Generated `feed-quirks.md` with full quirk documentation
- Generated `episodes.json` with 5 most recent episodes per feed
- Discovered updated feed URLs (Diary of a CEO moved to FlightCast, My First Million changed Megaphone URL)

### Phase 2: Core RSS Monitor
All modules in `src/agent-1/`:

| File | Purpose |
|---|---|
| `db.js` | SQLite database layer (mirrors Supabase schema for podcasts, episodes, processing_queue) |
| `podcast-manager.js` | Podcast subscription management, seeds 5 launch podcasts with metadata + context |
| `rss-parser.js` | RSS feed parser with duration normalization (handles seconds, HH:MM:SS, MM:SS) |
| `episode-filter.js` | Duration filter (≥35min) and title pattern filter (trailer, teaser, best of, etc.) |
| `episode-detector.js` | New episode detection with GUID + fallback hash dedup |
| `feed-health.js` | Consecutive failure tracking (alert after 3), stale feed detection (30 days) |
| `audio-acquisition.js` | Audio URL validation (HEAD request) + fallback download to temp filesystem |
| `retry.js` | Exponential backoff (0, 5min, 30min, 2hr) per Technical Addendum §8 |
| `feed-monitor.js` | Main orchestrator — runs full cycle against all active feeds |

## Database Tables I Write To
- **podcasts** — name, rss_feed_url, accent_colour, format_tag, podcast_context
- **episodes** — podcast_id, guid, guid_hash, title, audio_url, duration, status (queued/skipped)
- **processing_queue** — episode_id, status (queued)

## What Agent 2 Gets From Me
Episodes in `processing_queue` with status `queued`, linked to `episodes` table with:
- audio_url (validated)
- duration_seconds
- podcast_id (links to podcasts table with podcast_context for extraction prompts)

## Integration Test Results
- All 5 feeds parse successfully
- 2,606 episodes queued, 1,272 filtered out
- Dedup verified: second run finds 0 new episodes
- Audio URL validation working for recent episodes

## Feed URL Updates (IMPORTANT)
The spec documents list outdated URLs. Current working URLs:
- Diary of a CEO: `https://rss2.flightcast.com/xmsftuzjjykcmqwolaqn6mdn` (was Megaphone)
- My First Million: `https://feeds.megaphone.fm/HS2300184645` (changed Megaphone path)
- Tim Ferriss: `https://rss.art19.com/tim-ferriss-show`
- Hormozi: `https://feeds.captivate.fm/the-game-alex-hormozi/`
- Lenny's Podcast: `https://api.substack.com/feed/podcast/10845.rss`

## Dependencies
- **Waiting on Agent 4:** Supabase schema creation. Currently using local SQLite. DB layer (`db.js`) is a thin wrapper — swap to Supabase client when ready.

## Decisions Made
1. Used `rss-parser` npm package (sufficient — did not need Podgrab patterns)
2. Audio URL validation limited to 5 most recent per feed per cycle (avoids timeout on backlog)
3. All historical episodes queued on first run (2,606 episodes) — production may want to limit initial backfill
4. SQLite for local dev with schema matching the Supabase spec
