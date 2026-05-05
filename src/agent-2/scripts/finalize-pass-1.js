// Agent 2: finalize-pass-1 — after all chunks have extractions A, B, and a
// merged comparison, this script aggregates Pass 1 metrics into processed_content
// and advances the episode to pass_2_pending.
//
// Usage: node src/agent-2/scripts/finalize-pass-1.js <episode_id>
const { supabase } = require('../utils/supabase');
const { sendAlertEmail } = require('../utils/email');
const { setStep } = require('./_set-step');

const MIN_INSIGHTS = 6;

function countInsights(mergedText) {
  if (!mergedText) return 0;
  const numbered = mergedText.match(/^\s*\d+\.\s/gm) || [];
  const bullets = mergedText.match(/^\s*-\s/gm) || [];
  return numbered.length + bullets.length;
}

async function main(episodeId) {
  if (!episodeId) {
    console.error('Usage: finalize-pass-1.js <episode_id>');
    process.exit(2);
  }

  const { data: t, error } = await supabase
    .from('transcripts')
    .select('chunks')
    .eq('episode_id', episodeId)
    .single();
  if (error) throw new Error(`Transcript not found: ${error.message}`);

  const chunks = t.chunks || [];
  const merged = chunks.map((c) => c.mergedExtraction).filter(Boolean);
  const totalInsights = merged.reduce((sum, m) => sum + countInsights(m), 0);

  const scores = chunks.map((c) => c.agreementScore).filter((s) => s != null);
  const avgAgreement = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const stronger = chunks.map((c) => c.strongerInstance).filter(Boolean);
  const aCount = stronger.filter((s) => s === 'A').length;
  const bCount = stronger.filter((s) => s === 'B').length;
  const dominantInstance = aCount >= bCount ? 'A' : 'B';

  const divergent = chunks
    .map((c, i) => ({ chunkIndex: i, score: c.agreementScore, action: c.action }))
    .filter((x) => x.score != null && x.score < 7);

  const needsPause = chunks.some((c) => c.action === 'PAUSE');

  const { error: upErr } = await supabase.from('processed_content').upsert(
    {
      episode_id: episodeId,
      pass_1_insight_count: totalInsights,
      pass_1_agreement_score: avgAgreement,
      pass_1_divergent_insights: divergent.length > 0 ? divergent : null,
      pass_1_stronger_instance: dominantInstance,
      status: 'draft',
    },
    { onConflict: 'episode_id' }
  );
  if (upErr) throw new Error(`Upsert processed_content failed: ${upErr.message}`);

  // Quality threshold check
  if (totalInsights < MIN_INSIGHTS) {
    await sendAlertEmail(
      `Low insight count: episode ${episodeId}`,
      `Only ${totalInsights} insights extracted across ${chunks.length} chunks (minimum: ${MIN_INSIGHTS}).\n\nDecide: continue with shorter ebook, or skip.\nTo skip: update processing_queue.status='failed' for episode ${episodeId}.`
    );
  }

  if (needsPause) {
    await setStep(episodeId, 'processing', 'pass_1_review_needed', 'pass_1');
    await sendAlertEmail(
      `Extraction divergence: episode ${episodeId}`,
      `Agreement score < 5 on at least one chunk. Manual review recommended.\nDivergent chunks: ${JSON.stringify(divergent)}\nAvg agreement: ${avgAgreement}`
    );
    console.log(JSON.stringify({ ok: true, paused: true, totalInsights, avgAgreement }));
    return;
  }

  await setStep(episodeId, 'processing', 'pass_2_pending', 'pass_2');
  console.log(JSON.stringify({ ok: true, totalInsights, avgAgreement, dominantInstance, chunkCount: chunks.length }));
}

main(process.argv[2]).catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
