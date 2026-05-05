// Agent 1 — Supabase database layer
// Production DB layer replacing SQLite. Same interface as db.js.

require('dotenv').config({ path: __dirname + '/.env' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function guidHash(title, pubDate) {
  const input = `${title || ''}|${pubDate || ''}`;
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}

// --- Podcast operations ---

async function insertPodcast({ name, rssFeedUrl, accentColour, formatTag, podcastContext }) {
  const { data, error } = await supabase.from('podcasts').insert({
    name,
    rss_feed_url: rssFeedUrl,
    accent_colour: accentColour,
    format_tag: formatTag,
    podcast_context: podcastContext || null,
    active: true,
  }).select('id').single();

  if (error) throw new Error(`insertPodcast: ${error.message}`);
  return data.id;
}

async function getActivePodcasts() {
  const { data, error } = await supabase.from('podcasts').select('*').eq('active', true);
  if (error) throw new Error(`getActivePodcasts: ${error.message}`);
  return data;
}

async function getPodcastById(id) {
  const { data, error } = await supabase.from('podcasts').select('*').eq('id', id).single();
  if (error) throw new Error(`getPodcastById: ${error.message}`);
  return data;
}

async function updatePodcastFeedUrl(id, newUrl) {
  const { error } = await supabase.from('podcasts').update({ rss_feed_url: newUrl }).eq('id', id);
  if (error) throw new Error(`updatePodcastFeedUrl: ${error.message}`);
}

async function recordFetchSuccess(podcastId) {
  const { error } = await supabase.from('podcasts').update({
    last_successful_fetch: new Date().toISOString(),
    consecutive_failures: 0,
  }).eq('id', podcastId);
  if (error) throw new Error(`recordFetchSuccess: ${error.message}`);
}

async function recordFetchFailure(podcastId) {
  const podcast = await getPodcastById(podcastId);
  const { error } = await supabase.from('podcasts').update({
    consecutive_failures: (podcast.consecutive_failures || 0) + 1,
  }).eq('id', podcastId);
  if (error) throw new Error(`recordFetchFailure: ${error.message}`);
}

async function deactivatePodcast(id) {
  const { error } = await supabase.from('podcasts').update({ active: false }).eq('id', id);
  if (error) throw new Error(`deactivatePodcast: ${error.message}`);
}

// --- Episode operations ---

async function episodeExists(podcastId, guid, hash) {
  if (guid) {
    const { data } = await supabase.from('episodes')
      .select('id')
      .eq('podcast_id', podcastId)
      .eq('guid', guid)
      .limit(1);
    if (data && data.length > 0) return true;
  }
  if (hash) {
    const { data } = await supabase.from('episodes')
      .select('id')
      .eq('podcast_id', podcastId)
      .eq('guid_hash', hash)
      .limit(1);
    if (data && data.length > 0) return true;
  }
  return false;
}

async function insertEpisode({ podcastId, guid, title, audioUrl, durationSeconds, durationSource, publishedAt, status, skipReason }) {
  const hash = guidHash(title, publishedAt);
  const { data, error } = await supabase.from('episodes').insert({
    podcast_id: podcastId,
    guid: guid || null,
    guid_hash: hash,
    title,
    audio_url: audioUrl,
    duration_seconds: durationSeconds || null,
    duration_source: durationSource || 'unknown',
    published_at: publishedAt || null,
    status: status || 'queued',
    skip_reason: skipReason || null,
  }).select('id').single();

  if (error) throw new Error(`insertEpisode: ${error.message}`);
  return data.id;
}

async function getEpisodesByStatus(status) {
  const { data, error } = await supabase.from('episodes')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`getEpisodesByStatus: ${error.message}`);
  return data;
}

async function updateEpisodeStatus(id, status, skipReason) {
  const { error } = await supabase.from('episodes').update({
    status,
    skip_reason: skipReason || null,
  }).eq('id', id);
  if (error) throw new Error(`updateEpisodeStatus: ${error.message}`);
}

// --- Processing queue operations ---

async function enqueueEpisode(episodeId) {
  const { data, error } = await supabase.from('processing_queue').insert({
    episode_id: episodeId,
    status: 'queued',
    current_step: 'pending',
  }).select('id').single();

  if (error) throw new Error(`enqueueEpisode: ${error.message}`);
  return data.id;
}

async function getQueuedItems() {
  const { data, error } = await supabase.from('processing_queue')
    .select('*, episodes(title, audio_url, podcast_id)')
    .eq('status', 'queued')
    .order('created_at', { ascending: true });
  if (error) throw new Error(`getQueuedItems: ${error.message}`);
  return data;
}

async function updateQueueStatus(id, status, currentStep, errorLog) {
  const updates = { status, current_step: currentStep || null };
  if (errorLog) updates.error_log = errorLog;
  if (status === 'processing') updates.started_at = new Date().toISOString();
  if (status === 'complete' || status === 'failed') updates.completed_at = new Date().toISOString();

  const { error } = await supabase.from('processing_queue').update(updates).eq('id', id);
  if (error) throw new Error(`updateQueueStatus: ${error.message}`);
}

function closeDb() {
  // No-op for Supabase (connection is stateless)
}

module.exports = {
  supabase,
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
