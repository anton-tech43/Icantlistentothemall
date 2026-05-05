// Agent 1 — Database layer
// Local SQLite for development. Swap to Supabase client when Agent 4 sets up the schema.

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'dev.sqlite');

let _db = null;

function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
}

function initSchema(db) {
  db.exec(`
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
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(podcast_id, guid),
      UNIQUE(podcast_id, guid_hash)
    );

    CREATE TABLE IF NOT EXISTS processing_queue (
      id TEXT PRIMARY KEY,
      episode_id TEXT NOT NULL REFERENCES episodes(id),
      status TEXT NOT NULL DEFAULT 'queued',
      current_step TEXT,
      retry_count INTEGER DEFAULT 0,
      last_retry_at TEXT,
      started_at TEXT,
      completed_at TEXT,
      error_log TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function uuid() {
  return crypto.randomUUID();
}

function guidHash(title, pubDate) {
  const input = `${title || ''}|${pubDate || ''}`;
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}

// --- Podcast operations ---

function insertPodcast({ name, rssFeedUrl, accentColour, formatTag, podcastContext }) {
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO podcasts (id, name, rss_feed_url, accent_colour, format_tag, podcast_context)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, rssFeedUrl, accentColour, formatTag, podcastContext || null);
  return id;
}

function getActivePodcasts() {
  return getDb().prepare('SELECT * FROM podcasts WHERE active = 1').all();
}

function getPodcastById(id) {
  return getDb().prepare('SELECT * FROM podcasts WHERE id = ?').get(id);
}

function updatePodcastFeedUrl(id, newUrl) {
  getDb().prepare('UPDATE podcasts SET rss_feed_url = ? WHERE id = ?').run(newUrl, id);
}

function recordFetchSuccess(podcastId) {
  getDb().prepare(`
    UPDATE podcasts SET last_successful_fetch = datetime('now'), consecutive_failures = 0 WHERE id = ?
  `).run(podcastId);
}

function recordFetchFailure(podcastId) {
  getDb().prepare(`
    UPDATE podcasts SET consecutive_failures = consecutive_failures + 1 WHERE id = ?
  `).run(podcastId);
}

function deactivatePodcast(id) {
  getDb().prepare('UPDATE podcasts SET active = 0 WHERE id = ?').run(id);
}

// --- Episode operations ---

function episodeExists(podcastId, guid, hash) {
  const db = getDb();
  if (guid) {
    const row = db.prepare('SELECT id FROM episodes WHERE podcast_id = ? AND guid = ?').get(podcastId, guid);
    if (row) return true;
  }
  if (hash) {
    const row = db.prepare('SELECT id FROM episodes WHERE podcast_id = ? AND guid_hash = ?').get(podcastId, hash);
    if (row) return true;
  }
  return false;
}

function insertEpisode({ podcastId, guid, title, audioUrl, durationSeconds, durationSource, publishedAt, status, skipReason }) {
  const db = getDb();
  const id = uuid();
  const hash = guidHash(title, publishedAt);
  db.prepare(`
    INSERT INTO episodes (id, podcast_id, guid, guid_hash, title, audio_url, duration_seconds, duration_source, published_at, status, skip_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, podcastId, guid || null, hash, title, audioUrl, durationSeconds || null, durationSource || 'unknown', publishedAt || null, status || 'queued', skipReason || null);
  return id;
}

function getEpisodesByStatus(status) {
  return getDb().prepare('SELECT * FROM episodes WHERE status = ? ORDER BY created_at ASC').all(status);
}

function updateEpisodeStatus(id, status, skipReason) {
  getDb().prepare('UPDATE episodes SET status = ?, skip_reason = ? WHERE id = ?').run(status, skipReason || null, id);
}

// --- Processing queue operations ---

function enqueueEpisode(episodeId) {
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO processing_queue (id, episode_id, status, current_step)
    VALUES (?, ?, 'queued', 'pending')
  `).run(id, episodeId);
  return id;
}

function getQueuedItems() {
  return getDb().prepare(`
    SELECT pq.*, e.title, e.audio_url, e.podcast_id
    FROM processing_queue pq
    JOIN episodes e ON pq.episode_id = e.id
    WHERE pq.status = 'queued'
    ORDER BY pq.created_at ASC
  `).all();
}

function updateQueueStatus(id, status, currentStep, errorLog) {
  const db = getDb();
  const updates = ['status = ?', 'current_step = ?'];
  const params = [status, currentStep || null];

  if (errorLog) {
    updates.push('error_log = ?');
    params.push(errorLog);
  }
  if (status === 'processing') {
    updates.push("started_at = datetime('now')");
  }
  if (status === 'complete' || status === 'failed') {
    updates.push("completed_at = datetime('now')");
  }

  params.push(id);
  db.prepare(`UPDATE processing_queue SET ${updates.join(', ')} WHERE id = ?`).run(...params);
}

function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

module.exports = {
  getDb,
  uuid,
  guidHash,
  insertPodcast,
  getActivePodcasts,
  getPodcastById,
  updatePodcastFeedUrl,
  recordFetchSuccess,
  recordFetchFailure,
  deactivatePodcast,
  episodeExists,
  insertEpisode,
  getEpisodesByStatus,
  updateEpisodeStatus,
  enqueueEpisode,
  getQueuedItems,
  updateQueueStatus,
  closeDb,
};
