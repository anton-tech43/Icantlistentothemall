// Agent 2: Pass 1 — Dual extraction, comparison, and merge via Batch API
const { createBatch, pollBatch, getBatchResults, parseBatchResult } = require('../utils/claude');
const { getActivePrompt } = require('../utils/prompt-versions');
const { logPipelineStep, logCost } = require('../utils/logger');
const { supabase } = require('../utils/supabase');

async function runPass1(episodeId, chunks, podcastContext) {
  const extractionPrompt = await getActivePrompt('pass_1_extraction');
  const alternativePrompt = await getActivePrompt('pass_1_alternative');
  const comparisonPrompt = await getActivePrompt('pass_1_comparison');

  // Build batch requests for all chunks (Instance A + Instance B)
  const batchRequests = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i].text;

    batchRequests.push({
      id: `chunk-${i}-a`,
      prompt: fillPrompt(extractionPrompt.prompt_text, {
        PODCAST_CONTEXT: podcastContext,
        CHUNK_TEXT: chunkText,
      }),
    });

    batchRequests.push({
      id: `chunk-${i}-b`,
      prompt: fillPrompt(alternativePrompt.prompt_text, {
        PODCAST_CONTEXT: podcastContext,
        CHUNK_TEXT: chunkText,
      }),
    });
  }

  const startedAt = new Date().toISOString();
  const batch = await createBatch(batchRequests);
  const completedBatch = await pollBatch(batch.id);
  const results = await getBatchResults(batch.id);

  const parsed = {};
  let totalCost = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const result of results) {
    const p = parseBatchResult(result);
    parsed[p.id] = p;
    totalCost += p.cost;
    totalInputTokens += p.inputTokens;
    totalOutputTokens += p.outputTokens;
  }

  await logPipelineStep({
    episodeId,
    stepName: 'pass_1_instance_a',
    promptVersionId: extractionPrompt.id,
    startedAt,
    finishedAt: new Date().toISOString(),
    inputTokens: totalInputTokens / 2,
    outputTokens: totalOutputTokens / 2,
    costUsd: totalCost / 2,
    status: 'success',
  });

  await logPipelineStep({
    episodeId,
    stepName: 'pass_1_instance_b',
    promptVersionId: alternativePrompt.id,
    startedAt,
    finishedAt: new Date().toISOString(),
    inputTokens: totalInputTokens / 2,
    outputTokens: totalOutputTokens / 2,
    costUsd: totalCost / 2,
    status: 'success',
  });

  await logCost({
    episodeId,
    service: 'claude',
    operation: 'pass_1_extraction',
    tokensIn: totalInputTokens,
    tokensOut: totalOutputTokens,
    costUsd: totalCost,
  });

  // Run comparisons for each chunk
  const comparisonRequests = [];
  for (let i = 0; i < chunks.length; i++) {
    const instanceA = parsed[`chunk-${i}-a`];
    const instanceB = parsed[`chunk-${i}-b`];

    if (!instanceA?.text || !instanceB?.text) continue;

    comparisonRequests.push({
      id: `compare-${i}`,
      prompt: fillPrompt(comparisonPrompt.prompt_text, {
        EXTRACTION_A: instanceA.text,
        EXTRACTION_B: instanceB.text,
      }),
    });
  }

  const compStartedAt = new Date().toISOString();
  const compBatch = await createBatch(comparisonRequests);
  const compCompleted = await pollBatch(compBatch.id);
  const compResults = await getBatchResults(compBatch.id);

  let compCost = 0;
  let compInputTokens = 0;
  let compOutputTokens = 0;
  const chunkResults = [];
  const agreementScores = [];
  const strongerInstances = [];

  for (const result of compResults) {
    const p = parseBatchResult(result);
    compCost += p.cost;
    compInputTokens += p.inputTokens;
    compOutputTokens += p.outputTokens;

    const chunkIndex = parseInt(p.id.replace('compare-', ''), 10);
    const comparison = parseComparison(p.text);

    agreementScores.push(comparison.agreementScore);
    strongerInstances.push(comparison.strongerInstance);

    chunkResults.push({
      chunkIndex,
      instanceA: parsed[`chunk-${chunkIndex}-a`]?.text,
      instanceB: parsed[`chunk-${chunkIndex}-b`]?.text,
      comparison: p.text,
      mergedExtraction: comparison.mergedExtraction,
      agreementScore: comparison.agreementScore,
      strongerInstance: comparison.strongerInstance,
      action: comparison.action,
    });
  }

  await logPipelineStep({
    episodeId,
    stepName: 'pass_1_comparison',
    promptVersionId: comparisonPrompt.id,
    startedAt: compStartedAt,
    finishedAt: new Date().toISOString(),
    inputTokens: compInputTokens,
    outputTokens: compOutputTokens,
    costUsd: compCost,
    status: 'success',
    metadata: { agreementScores, strongerInstances },
  });

  await logCost({
    episodeId,
    service: 'claude',
    operation: 'pass_1_comparison',
    tokensIn: compInputTokens,
    tokensOut: compOutputTokens,
    costUsd: compCost,
  });

  // Store chunk extractions in transcripts.chunks JSONB
  const enrichedChunks = chunks.map((chunk, i) => {
    const result = chunkResults.find((r) => r.chunkIndex === i);
    return {
      ...chunk,
      extractionA: result?.instanceA || null,
      extractionB: result?.instanceB || null,
      mergedExtraction: result?.mergedExtraction || null,
      agreementScore: result?.agreementScore || null,
      strongerInstance: result?.strongerInstance || null,
    };
  });

  await supabase
    .from('transcripts')
    .update({ chunks: enrichedChunks })
    .eq('episode_id', episodeId);

  // Aggregate results
  const avgAgreement = agreementScores.length > 0
    ? Math.round(agreementScores.reduce((a, b) => a + b, 0) / agreementScores.length)
    : null;

  const aCount = strongerInstances.filter((s) => s === 'A').length;
  const bCount = strongerInstances.filter((s) => s === 'B').length;
  const dominantInstance = aCount >= bCount ? 'A' : 'B';

  const allMerged = chunkResults
    .map((r) => r.mergedExtraction)
    .filter(Boolean)
    .join('\n\n---\n\n');

  const totalInsights = countInsights(allMerged);
  const needsPause = chunkResults.some((r) => r.action === 'PAUSE');
  const hasFlags = chunkResults.some((r) => r.action === 'PROCEED WITH FLAG');

  const divergentInsights = chunkResults
    .filter((r) => r.agreementScore < 7)
    .map((r) => ({ chunkIndex: r.chunkIndex, score: r.agreementScore }));

  // Update processed_content with Pass 1 metrics
  await supabase.from('processed_content').upsert({
    episode_id: episodeId,
    pass_1_insight_count: totalInsights,
    pass_1_agreement_score: avgAgreement,
    pass_1_divergent_insights: divergentInsights.length > 0 ? divergentInsights : null,
    pass_1_stronger_instance: dominantInstance,
    status: 'draft',
  }, { onConflict: 'episode_id' });

  return {
    mergedExtractions: allMerged,
    totalInsights,
    avgAgreement,
    dominantInstance,
    needsPause,
    hasFlags,
    totalCost: totalCost + compCost,
  };
}

function fillPrompt(template, variables) {
  let filled = template;
  for (const [key, value] of Object.entries(variables)) {
    filled = filled.replace(`[${key}]`, value || '');
  }
  return filled;
}

function parseComparison(text) {
  const scoreMatch = text.match(/AGREEMENT SCORE[^:]*:\s*(\d+)/i);
  const strongerMatch = text.match(/STRONGER EXTRACTION[^:]*:\s*(A|B)/i);
  const actionMatch = text.match(/(PROCEED|PAUSE)[^"]*/i);
  const mergedMatch = text.match(/MERGED EXTRACTION[:\s]*([\s\S]*?)$/i);

  let action = 'PROCEED';
  if (actionMatch) {
    const raw = actionMatch[0].toUpperCase();
    if (raw.includes('PAUSE')) action = 'PAUSE';
    else if (raw.includes('FLAG')) action = 'PROCEED WITH FLAG';
  }

  return {
    agreementScore: scoreMatch ? parseInt(scoreMatch[1], 10) : 5,
    strongerInstance: strongerMatch ? strongerMatch[1] : 'A',
    action,
    mergedExtraction: mergedMatch ? mergedMatch[1].trim() : text,
  };
}

function countInsights(mergedText) {
  const insightLines = mergedText.match(/^\d+\.\s/gm) || [];
  const bulletPoints = mergedText.match(/^-\s/gm) || [];
  return insightLines.length + bulletPoints.length;
}

module.exports = { runPass1, fillPrompt };
