// Agent 2: finalize-episode — generate the self-rating note from framework +
// page count, mark the episode as complete (status='draft' so Agent 3 picks
// it up for PDF generation), and log the final cost summary.
//
// Usage: node src/agent-2/scripts/finalize-episode.js <episode_id>
const { supabase } = require('../utils/supabase');
const { generateSelfRatingNote } = require('../utils/self-rating');
const { getEpisodeCost, logPipelineStep } = require('../utils/logger');
const { setStep } = require('./_set-step');

function estimatePageCount(text) {
  if (!text) return 4;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(4, Math.min(10, Math.round(words / 500)));
}

async function main(episodeId) {
  if (!episodeId) {
    console.error('Usage: finalize-episode.js <episode_id>');
    process.exit(2);
  }

  const { data: pc, error } = await supabase
    .from('processed_content')
    .select('pass_2_framework_selected, ebook_content, final_page_count, self_review_scores')
    .eq('episode_id', episodeId)
    .single();
  if (error) throw new Error(error.message);

  const framework = pc.pass_2_framework_selected || 'Three Things Worth Knowing';
  const pageCount = pc.final_page_count || estimatePageCount(pc.ebook_content);
  const note = generateSelfRatingNote(framework, pageCount);

  // Count rewrites if any
  const reviews = pc.self_review_scores || {};
  const rewrites = (reviews.rewriteCount || 0);

  const { error: upErr } = await supabase
    .from('processed_content')
    .update({
      self_rating_note: note,
      final_page_count: pageCount,
      self_review_rewrites: rewrites,
      status: 'draft',
    })
    .eq('episode_id', episodeId);
  if (upErr) throw new Error(upErr.message);

  await supabase
    .from('processing_queue')
    .update({ status: 'complete', current_step: 'complete', completed_at: new Date().toISOString() })
    .eq('episode_id', episodeId);

  await supabase.from('episodes').update({ status: 'draft' }).eq('id', episodeId);

  const totalCost = await getEpisodeCost(episodeId);

  await logPipelineStep({
    episodeId,
    stepName: 'finalize',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    status: 'success',
    costUsd: 0,
    metadata: { framework, pageCount, totalEpisodeCostUsd: totalCost, selfRatingNote: note },
  });

  console.log(JSON.stringify({ ok: true, framework, pageCount, totalCost, selfRatingNote: note }));
}

main(process.argv[2]).catch((err) => { console.error('FAILED:', err.message); process.exit(1); });
