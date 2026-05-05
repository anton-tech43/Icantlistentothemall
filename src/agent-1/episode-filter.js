// Agent 1 — Episode filtering
// Applies duration and title-based filters to determine which episodes to process.

const MIN_DURATION_SECONDS = 35 * 60; // 35 minutes

const SKIP_TITLE_PATTERNS = [
  'trailer',
  'teaser',
  'best of',
  'rerun',
  'replay',
  'bonus',
];

const SKIP_EPISODE_TYPES = ['trailer', 'bonus'];

function filterEpisode(episode) {
  const title = (episode.title || '').toLowerCase();
  const episodeType = (episode.episodeType || 'full').toLowerCase();

  if (SKIP_EPISODE_TYPES.includes(episodeType)) {
    return { pass: false, reason: `episodeType: ${episodeType}` };
  }

  for (const pattern of SKIP_TITLE_PATTERNS) {
    if (title.includes(pattern)) {
      return { pass: false, reason: `title contains "${pattern}"` };
    }
  }

  if (episode.durationSeconds !== null && episode.durationSeconds < MIN_DURATION_SECONDS) {
    return { pass: false, reason: `duration ${Math.round(episode.durationSeconds / 60)}m < 35m minimum` };
  }

  // If duration is unknown, let it through but flag it
  if (episode.durationSeconds === null) {
    return { pass: true, reason: 'duration unknown — skipping duration filter, flagged for review' };
  }

  return { pass: true, reason: null };
}

module.exports = { filterEpisode, MIN_DURATION_SECONDS, SKIP_TITLE_PATTERNS };
