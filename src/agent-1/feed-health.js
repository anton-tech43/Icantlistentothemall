// Agent 1 — Feed health monitoring
// Tracks consecutive failures, stale feeds, and auto-updates redirected URLs.

const db = require('./db');

const FAILURE_ALERT_THRESHOLD = 3; // 3 consecutive failures = 18 hours
const STALE_DAYS_THRESHOLD = 30;

function checkFeedHealth() {
  const podcasts = db.getActivePodcasts();
  const alerts = [];

  for (const podcast of podcasts) {
    if (podcast.consecutive_failures >= FAILURE_ALERT_THRESHOLD) {
      alerts.push({
        type: 'feed_failure',
        severity: 'medium',
        podcast: podcast.name,
        podcastId: podcast.id,
        message: `${podcast.name}: ${podcast.consecutive_failures} consecutive fetch failures`,
      });
    }

    if (podcast.last_successful_fetch) {
      const lastFetch = new Date(podcast.last_successful_fetch);
      const daysSince = (Date.now() - lastFetch.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > STALE_DAYS_THRESHOLD) {
        alerts.push({
          type: 'stale_feed',
          severity: 'low',
          podcast: podcast.name,
          podcastId: podcast.id,
          message: `${podcast.name}: no new episodes for ${Math.round(daysSince)} days`,
        });
      }
    }
  }

  return alerts;
}

function handleRedirect(podcastId, originalUrl, redirectedUrl) {
  if (originalUrl !== redirectedUrl) {
    console.log(`  Feed URL redirected: ${originalUrl} → ${redirectedUrl}`);
    db.updatePodcastFeedUrl(podcastId, redirectedUrl);
    return true;
  }
  return false;
}

module.exports = {
  checkFeedHealth,
  handleRedirect,
  FAILURE_ALERT_THRESHOLD,
  STALE_DAYS_THRESHOLD,
};
