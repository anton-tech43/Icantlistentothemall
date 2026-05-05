// Agent 2: mark-failed — when the playbook hits an unrecoverable error,
// mark the episode failed and email Anton so the next routine fire skips it.
//
// Usage:
//   node src/agent-2/scripts/mark-failed.js <episode_id> "<reason>"
const { supabase } = require('../utils/supabase');
const { sendAlertEmail } = require('../utils/email');
const { logPipelineStep } = require('../utils/logger');

async function main() {
  const [episodeId, ...reasonParts] = process.argv.slice(2);
  const reason = reasonParts.join(' ').trim() || 'unspecified';

  if (!episodeId) {
    console.error('Usage: mark-failed.js <episode_id> <reason>');
    process.exit(2);
  }

  await supabase
    .from('processing_queue')
    .update({ status: 'failed', error_log: reason })
    .eq('episode_id', episodeId);

  await supabase.from('episodes').update({ status: 'failed' }).eq('id', episodeId);

  await logPipelineStep({
    episodeId,
    stepName: 'pipeline_failed',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    status: 'failed',
    errorMessage: reason,
  });

  const { data: ep } = await supabase
    .from('episodes')
    .select('title, podcasts(name)')
    .eq('id', episodeId)
    .single();

  await sendAlertEmail(
    `Pipeline failed: ${ep?.title || episodeId}`,
    `Episode: ${ep?.title || episodeId}\nPodcast: ${ep?.podcasts?.name || '(unknown)'}\nReason:\n${reason}\n\nThe routine will skip this episode on future fires until status is reset.`
  );

  console.log(JSON.stringify({ ok: true }));
}

main().catch((err) => { console.error('FAILED:', err.message); process.exit(1); });
