// Agent 2: Pipeline orchestrator — processes one episode at a time through all stages
const { supabase } = require('../utils/supabase');
const { logPipelineStep, getEpisodeCost, getWeeklyCost } = require('../utils/logger');
const { sendAlertEmail } = require('../utils/email');
const { transcribeEpisode } = require('./transcribe');
const { chunkTranscript } = require('./chunk');
const { runPass1 } = require('./pass1-extract');
const { runPass2 } = require('./pass2-structure');
const { runPass3 } = require('./pass3-write');
const { runSelfReview, runRewrite } = require('./self-review');
const { isOutlineApproved } = require('./outline-approval');
const { generateSelfRatingNote } = require('../utils/self-rating');

const EPISODE_COST_CAP = 8.0;
const WEEKLY_COST_CAP = 30.0;
const MIN_INSIGHTS = 6;

async function processNextEpisode() {
  const weeklyCost = await getWeeklyCost();
  if (weeklyCost >= WEEKLY_COST_CAP) {
    console.log(`Weekly cost cap reached ($${weeklyCost.toFixed(2)}/$${WEEKLY_COST_CAP}). Pausing.`);
    await sendAlertEmail('Weekly Cost Cap Reached', `Weekly spend: $${weeklyCost.toFixed(2)}. Processing paused until next week or manual override.`);
    return null;
  }

  const { data: queueItem } = await supabase
    .from('processing_queue')
    .select('*, episodes(*), episodes(podcasts(*))')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (!queueItem) {
    // Check for episodes waiting for outline approval that are now approved
    const { data: waitingItem } = await supabase
      .from('processing_queue')
      .select('*, episodes(*), episodes(podcasts(*))')
      .eq('status', 'processing')
      .eq('current_step', 'pass_3')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (waitingItem) {
      const approved = await isOutlineApproved(waitingItem.episode_id);
      if (approved) {
        return await resumeFromPass3(waitingItem);
      }
    }

    console.log('No episodes to process.');
    return null;
  }

  return await processEpisode(queueItem);
}

async function processEpisode(queueItem) {
  const episodeId = queueItem.episode_id;
  const episode = queueItem.episodes;
  const podcast = episode?.podcasts;

  console.log(`Processing: ${episode.title} (${podcast?.name})`);

  try {
    // Update status: transcribing
    await updateStatus(episodeId, 'processing', 'transcribing', 'transcribing');

    // Step 1: Transcribe
    const transcript = await transcribeEpisode(episodeId, episode.audio_url);
    await checkCostCap(episodeId);

    // Step 2: Chunk
    const chunks = chunkTranscript(transcript.rawText, transcript.speakerLabels, transcript.deepgramMetadata?.paragraphs || []);
    console.log(`  Chunked into ${chunks.length} chunks`);

    // Update status: pass_1
    await updateStatus(episodeId, 'processing', 'pass_1', 'pass_1');

    // Step 3: Pass 1 — Dual extraction
    const pass1Result = await runPass1(episodeId, chunks, podcast?.podcast_context || '');
    await checkCostCap(episodeId);

    // Quality threshold check
    if (pass1Result.totalInsights < MIN_INSIGHTS) {
      await sendAlertEmail(
        `Low Insight Count: ${episode.title}`,
        `Only ${pass1Result.totalInsights} insights extracted (minimum: ${MIN_INSIGHTS}).\n\nEpisode: ${episode.title}\nPodcast: ${podcast?.name}\n\nDecide: continue with shorter ebook, or skip this episode.\nTo skip: update processing_queue status to 'failed' for episode ${episodeId}.`
      );
    }

    if (pass1Result.needsPause) {
      await sendAlertEmail(
        `Extraction Divergence: ${episode.title}`,
        `Agreement score < 5 on one or more chunks. Manual review needed.\n\nEpisode: ${episode.title}\nAvg agreement: ${pass1Result.avgAgreement}\n\nReview extractions in transcripts.chunks for episode ${episodeId}.`
      );
      await updateStatus(episodeId, 'processing', 'pass_1_review', 'pass_1');
      return { status: 'paused_for_review', episodeId };
    }

    // Step 4: Pass 2 — Structure (real-time API, sends outline email)
    await updateStatus(episodeId, 'processing', 'pass_2', 'pass_2');

    const episodeInfo = {
      title: episode.title,
      guestName: episode.guest_name || 'Unknown',
      podcastName: podcast?.name || 'Unknown',
      formatTag: podcast?.format_tag || 'interview',
    };

    const pass2Result = await runPass2(episodeId, pass1Result.mergedExtractions, episodeInfo);
    await checkCostCap(episodeId);

    // Update guest_name from Pass 2 extraction
    episodeInfo.guestName = pass2Result.guestName;

    // Pause here — wait for Anton's outline approval via email link
    await updateStatus(episodeId, 'processing', 'awaiting_approval', 'pass_2');
    console.log(`  Outline sent for review. Waiting for approval.`);

    return { status: 'awaiting_approval', episodeId, outline: pass2Result };

  } catch (err) {
    console.error(`Pipeline error for episode ${episodeId}:`, err);
    await handleError(episodeId, err, episode);
    return { status: 'failed', episodeId, error: err.message };
  }
}

async function resumeFromPass3(queueItem) {
  const episodeId = queueItem.episode_id;
  const episode = queueItem.episodes;
  const podcast = episode?.podcasts;

  console.log(`Resuming Pass 3: ${episode.title}`);

  try {
    // Get stored data
    const { data: content } = await supabase
      .from('processed_content')
      .select('*')
      .eq('episode_id', episodeId)
      .single();

    const { data: transcript } = await supabase
      .from('transcripts')
      .select('chunks')
      .eq('episode_id', episodeId)
      .single();

    const mergedExtractions = (transcript?.chunks || [])
      .map((c) => c.mergedExtraction)
      .filter(Boolean)
      .join('\n\n---\n\n');

    // Retrieve the outline from pipeline_logs
    const { data: outlineLog } = await supabase
      .from('pipeline_logs')
      .select('metadata')
      .eq('episode_id', episodeId)
      .eq('step_name', 'pass_2_structure')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const episodeInfo = {
      title: episode.title,
      guestName: content?.guest_name || 'Unknown',
      podcastName: podcast?.name || 'Unknown',
      formatTag: podcast?.format_tag || 'interview',
    };

    // Step 5: Pass 3 — Write
    await updateStatus(episodeId, 'processing', 'pass_3', 'pass_3');

    // We need the outline text — stored in the pass_2 step's output
    // For now, regenerate from the pipeline log or use a stored version
    const { data: pass2Log } = await supabase
      .from('pipeline_logs')
      .select('*')
      .eq('episode_id', episodeId)
      .eq('step_name', 'pass_2_structure')
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const outline = pass2Log?.metadata?.outline || 'No outline available';

    const pass3Result = await runPass3(episodeId, {
      outline,
      mergedExtractions,
      episodeInfo,
      framework: content?.pass_2_framework_selected || 'Three Things Worth Knowing',
      pageCount: content?.final_page_count || 6,
    });
    await checkCostCap(episodeId);

    // Step 6: Self-review (ebook only)
    await updateStatus(episodeId, 'processing', 'reviewing', 'reviewing');

    const reviewResult = await runSelfReview(episodeId, pass3Result.ebook, mergedExtractions);
    let rewriteCount = 0;

    if (!reviewResult.accuracyPass || !reviewResult.writingPass) {
      console.log(`  Self-review failed. Attempting rewrite...`);
      rewriteCount = 1;

      const rewrittenEbook = await runRewrite(
        episodeId,
        pass3Result.ebook,
        mergedExtractions,
        reviewResult.corrections,
        reviewResult.writingIssues
      );

      if (rewrittenEbook) {
        const retryReview = await runSelfReview(episodeId, rewrittenEbook, mergedExtractions);
        if (!retryReview.accuracyPass || !retryReview.writingPass) {
          await sendAlertEmail(
            `Quality Gate Failed: ${episode.title}`,
            `Ebook failed self-review after rewrite.\nAccuracy: ${retryReview.accuracyScore}/10\nWriting: ${retryReview.writingTotal}/50\n\nManual review needed for episode ${episodeId}.`
          );
          await updateStatus(episodeId, 'processing', 'needs_review', 'reviewing');
          return { status: 'needs_review', episodeId };
        }
      }
    }

    // Step 7: Generate self-rating note and finalize
    const framework = content?.pass_2_framework_selected || 'Three Things Worth Knowing';
    const pageCount = estimatePageCount(pass3Result.ebook);
    const selfRatingNote = generateSelfRatingNote(framework, pageCount);

    await supabase
      .from('processed_content')
      .update({
        self_rating_note: selfRatingNote,
        final_page_count: pageCount,
        self_review_rewrites: rewriteCount,
        status: 'draft',
      })
      .eq('episode_id', episodeId);

    await updateStatus(episodeId, 'complete', 'complete', 'draft');

    console.log(`  Complete. Framework: ${framework}, Pages: ${pageCount}, Cost: $${(await getEpisodeCost(episodeId)).toFixed(2)}`);

    return { status: 'complete', episodeId };

  } catch (err) {
    console.error(`Pipeline error (Pass 3 resume) for episode ${episodeId}:`, err);
    await handleError(episodeId, err, episode);
    return { status: 'failed', episodeId, error: err.message };
  }
}

async function checkCostCap(episodeId) {
  const cost = await getEpisodeCost(episodeId);
  if (cost >= EPISODE_COST_CAP) {
    await supabase.from('processing_queue').update({ status: 'cost_exceeded' }).eq('episode_id', episodeId);
    await supabase.from('episodes').update({ status: 'cost_exceeded' }).eq('id', episodeId);
    await sendAlertEmail(
      `Episode Cost Exceeded: $${cost.toFixed(2)}`,
      `Episode ${episodeId} exceeded the $${EPISODE_COST_CAP} cap. Processing killed.\nTotal cost so far: $${cost.toFixed(2)}`
    );
    throw new Error(`Episode cost cap exceeded: $${cost.toFixed(2)}`);
  }
}

async function updateStatus(episodeId, queueStatus, currentStep, episodeStatus) {
  await supabase.from('processing_queue').update({ status: queueStatus, current_step: currentStep }).eq('episode_id', episodeId);
  await supabase.from('episodes').update({ status: episodeStatus }).eq('id', episodeId);
}

async function handleError(episodeId, err, episode) {
  await supabase.from('processing_queue').update({
    status: 'failed',
    error_log: err.message,
  }).eq('episode_id', episodeId);

  await supabase.from('episodes').update({ status: 'failed' }).eq('id', episodeId);

  await logPipelineStep({
    episodeId,
    stepName: 'pipeline_error',
    startedAt: new Date().toISOString(),
    status: 'failed',
    errorMessage: err.message,
  });

  await sendAlertEmail(
    `Pipeline Failed: ${episode?.title || episodeId}`,
    `Error: ${err.message}\n\nEpisode ID: ${episodeId}\n\nCheck pipeline_logs for details.`
  );
}

function estimatePageCount(ebookText) {
  if (!ebookText) return 4;
  const words = ebookText.split(/\s+/).length;
  // ~500 words per page for manuscript style
  return Math.max(4, Math.min(10, Math.round(words / 500)));
}

module.exports = { processNextEpisode, resumeFromPass3 };
