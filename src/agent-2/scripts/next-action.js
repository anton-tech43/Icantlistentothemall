// Agent 2: next-action — routing brain for the routine playbook.
// Outputs a single JSON object describing what the routine should do this fire.
//
// Usage: node src/agent-2/scripts/next-action.js
//
// Possible actions:
//   { action: "idle", reason: "..." }
//   { action: "transcribe", episode: {...} }
//   { action: "pass_1", episode: {...}, podcastContext: "...", chunkCount: N }
//   { action: "pass_2", episode: {...} }
//   { action: "awaiting_approval", episode: {...} }
//   { action: "pass_3", episode: {...} }
//   { action: "self_review", episode: {...} }
//   { action: "finalize", episode: {...} }
//   { action: "cost_exceeded", episode: {...}, weeklyCost: $ }
const { supabase } = require('../utils/supabase');
const { getWeeklyCost, getEpisodeCost } = require('../utils/logger');

const WEEKLY_COST_CAP = 30.0;
const EPISODE_COST_CAP = 8.0;

async function nextAction() {
  const weeklyCost = await getWeeklyCost();
  if (weeklyCost >= WEEKLY_COST_CAP) {
    return { action: 'idle', reason: `weekly_cost_cap`, weeklyCost };
  }

  // Find an active in-flight episode first (already mid-pipeline)
  const { data: active } = await supabase
    .from('processing_queue')
    .select('episode_id, status, current_step, episodes(*, podcasts(*))')
    .in('status', ['queued', 'processing'])
    .neq('current_step', 'awaiting_approval')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!active) {
    // Check if there's an episode awaiting approval that just got approved
    const { data: approved } = await supabase
      .from('processing_queue')
      .select('episode_id, status, current_step, episodes(*, podcasts(*))')
      .eq('current_step', 'awaiting_approval')
      .limit(10);

    for (const item of approved || []) {
      const { data: pc } = await supabase
        .from('processed_content')
        .select('pass_2_outline_approved')
        .eq('episode_id', item.episode_id)
        .maybeSingle();
      if (pc?.pass_2_outline_approved === true) {
        // Resume from pass_3
        return await actionForStatus({ ...item, current_step: 'pass_3_pending' });
      }
    }

    return { action: 'idle', reason: 'no_work' };
  }

  // Per-episode cost cap check
  const epCost = await getEpisodeCost(active.episode_id);
  if (epCost >= EPISODE_COST_CAP) {
    return { action: 'cost_exceeded', episode: minimalEpisode(active.episodes), episodeCost: epCost };
  }

  return await actionForStatus(active);
}

async function actionForStatus(queueItem) {
  const ep = queueItem.episodes;
  const podcast = ep?.podcasts;
  const baseEpisode = minimalEpisode(ep);

  const status = queueItem.current_step || queueItem.status;

  // Decide based on episode flow state (use processing_queue.current_step)
  switch (status) {
    case 'pending':
    case 'queued':
      return { action: 'transcribe', episode: baseEpisode, audioUrl: ep.audio_url };

    case 'transcribed':
    case 'pass_1_pending': {
      const { data: t } = await supabase
        .from('transcripts')
        .select('chunks')
        .eq('episode_id', queueItem.episode_id)
        .maybeSingle();
      const chunkCount = (t?.chunks || []).length;
      return {
        action: 'pass_1',
        episode: baseEpisode,
        podcastContext: podcast?.podcast_context || '',
        chunkCount,
      };
    }

    case 'pass_1_done':
    case 'pass_2_pending':
      return { action: 'pass_2', episode: baseEpisode, podcastFormat: podcast?.format_tag || 'interview', podcastName: podcast?.name };

    case 'awaiting_approval':
      return { action: 'awaiting_approval', episode: baseEpisode };

    case 'pass_3_pending':
    case 'approved':
      return { action: 'pass_3', episode: baseEpisode };

    case 'pass_3_done':
    case 'review_pending':
      return { action: 'self_review', episode: baseEpisode };

    case 'review_done':
    case 'finalize_pending':
      return { action: 'finalize', episode: baseEpisode };

    case 'complete':
      return { action: 'idle', reason: 'episode_complete', episodeId: queueItem.episode_id };

    default:
      return { action: 'idle', reason: `unknown_state: ${status}`, episodeId: queueItem.episode_id };
  }
}

function minimalEpisode(ep) {
  if (!ep) return null;
  return {
    id: ep.id,
    title: ep.title,
    podcastId: ep.podcast_id,
    podcastName: ep.podcasts?.name || null,
    podcastContext: ep.podcasts?.podcast_context || null,
    formatTag: ep.podcasts?.format_tag || null,
    audioUrl: ep.audio_url,
    durationSeconds: ep.duration_seconds,
  };
}

nextAction()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error(JSON.stringify({ action: 'error', message: err.message, stack: err.stack }));
    process.exit(1);
  });
