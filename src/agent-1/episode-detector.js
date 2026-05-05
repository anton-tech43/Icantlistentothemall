// Agent 1 — Episode detection and deduplication
// Detects new episodes from parsed feed data and deduplicates against the database.

const db = require('./db');
const { filterEpisode } = require('./episode-filter');

function detectNewEpisodes(podcastId, parsedEpisodes) {
  const results = {
    new: [],
    duplicate: [],
    skipped: [],
  };

  for (const episode of parsedEpisodes) {
    if (!episode.audioUrl) {
      results.skipped.push({ ...episode, skipReason: 'no audio URL' });
      continue;
    }

    const hash = db.guidHash(episode.title, episode.publishedAt);
    const exists = db.episodeExists(podcastId, episode.guid, hash);

    if (exists) {
      results.duplicate.push(episode);
      continue;
    }

    const filter = filterEpisode(episode);

    if (!filter.pass) {
      results.skipped.push({ ...episode, skipReason: filter.reason });

      db.insertEpisode({
        podcastId,
        guid: episode.guid,
        title: episode.title,
        audioUrl: episode.audioUrl,
        durationSeconds: episode.durationSeconds,
        durationSource: episode.durationSource,
        publishedAt: episode.publishedAt,
        status: 'skipped',
        skipReason: filter.reason,
      });
      continue;
    }

    const episodeId = db.insertEpisode({
      podcastId,
      guid: episode.guid,
      title: episode.title,
      audioUrl: episode.audioUrl,
      durationSeconds: episode.durationSeconds,
      durationSource: episode.durationSource,
      publishedAt: episode.publishedAt,
      status: 'queued',
    });

    db.enqueueEpisode(episodeId);

    results.new.push({ ...episode, episodeId });
  }

  return results;
}

module.exports = { detectNewEpisodes };
