// Agent 2: Pass 3 — Summary, ebook, and newsletter material generation via Batch API
const { createBatch, pollBatch, getBatchResults, parseBatchResult } = require('../utils/claude');
const { getActivePrompt } = require('../utils/prompt-versions');
const { logPipelineStep, logCost } = require('../utils/logger');
const { supabase } = require('../utils/supabase');
const { fillPrompt } = require('./pass1-extract');

async function runPass3(episodeId, { outline, mergedExtractions, episodeInfo, framework, pageCount }) {
  const summaryPrompt = await getActivePrompt('pass_3_summary');
  const ebookPrompt = await getActivePrompt('pass_3_ebook');
  const newsletterPrompt = await getActivePrompt('pass_3_newsletter');

  const top5Insights = extractTop5(mergedExtractions);

  const batchRequests = [
    {
      id: 'summary',
      prompt: fillPrompt(summaryPrompt.prompt_text, {
        EPISODE_TITLE: episodeInfo.title,
        GUEST_NAME: episodeInfo.guestName,
        PODCAST_NAME: episodeInfo.podcastName,
        OUTLINE: outline,
        TOP_5_INSIGHTS: top5Insights,
      }),
      maxTokens: 1024,
    },
    {
      id: 'ebook',
      prompt: fillPrompt(ebookPrompt.prompt_text, {
        EPISODE_TITLE: episodeInfo.title,
        GUEST_NAME: episodeInfo.guestName,
        PODCAST_NAME: episodeInfo.podcastName,
        FRAMEWORK: framework,
        OUTLINE: outline,
        MERGED_EXTRACTIONS: mergedExtractions,
        PAGE_COUNT: String(pageCount),
      }),
      maxTokens: 8192,
    },
  ];

  const startedAt = new Date().toISOString();
  const batch = await createBatch(batchRequests);
  const completedBatch = await pollBatch(batch.id);
  const results = await getBatchResults(batch.id);

  const parsed = {};
  for (const result of results) {
    const p = parseBatchResult(result);
    parsed[p.id] = p;
  }

  const summaryResult = parsed['summary'];
  const ebookResult = parsed['ebook'];

  await logPipelineStep({
    episodeId,
    stepName: 'pass_3_summary',
    promptVersionId: summaryPrompt.id,
    startedAt,
    finishedAt: new Date().toISOString(),
    inputTokens: summaryResult?.inputTokens || 0,
    outputTokens: summaryResult?.outputTokens || 0,
    costUsd: summaryResult?.cost || 0,
    status: summaryResult?.text ? 'success' : 'failed',
    errorMessage: summaryResult?.error || null,
  });

  await logPipelineStep({
    episodeId,
    stepName: 'pass_3_ebook',
    promptVersionId: ebookPrompt.id,
    startedAt,
    finishedAt: new Date().toISOString(),
    inputTokens: ebookResult?.inputTokens || 0,
    outputTokens: ebookResult?.outputTokens || 0,
    costUsd: ebookResult?.cost || 0,
    status: ebookResult?.text ? 'success' : 'failed',
    errorMessage: ebookResult?.error || null,
  });

  const summaryEbookCost = (summaryResult?.cost || 0) + (ebookResult?.cost || 0);

  // Now run newsletter material extraction (needs summary as input)
  const newsletterBatch = await createBatch([{
    id: 'newsletter',
    prompt: fillPrompt(newsletterPrompt.prompt_text, {
      EPISODE_TITLE: episodeInfo.title,
      GUEST_NAME: episodeInfo.guestName,
      PODCAST_NAME: episodeInfo.podcastName,
      SUMMARY: summaryResult?.text || '',
      TOP_INSIGHTS: top5Insights,
      OUTLINE: outline,
    }),
    maxTokens: 2048,
  }]);

  const nlCompleted = await pollBatch(newsletterBatch.id);
  const nlResults = await getBatchResults(newsletterBatch.id);
  const nlParsed = parseBatchResult(nlResults[0]);

  await logPipelineStep({
    episodeId,
    stepName: 'pass_3_newsletter',
    promptVersionId: newsletterPrompt.id,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    inputTokens: nlParsed.inputTokens,
    outputTokens: nlParsed.outputTokens,
    costUsd: nlParsed.cost,
    status: nlParsed.text ? 'success' : 'failed',
  });

  const totalCost = summaryEbookCost + (nlParsed.cost || 0);

  await logCost({
    episodeId,
    service: 'claude',
    operation: 'pass_3',
    tokensIn: (summaryResult?.inputTokens || 0) + (ebookResult?.inputTokens || 0) + nlParsed.inputTokens,
    tokensOut: (summaryResult?.outputTokens || 0) + (ebookResult?.outputTokens || 0) + nlParsed.outputTokens,
    costUsd: totalCost,
  });

  const newsletter = parseNewsletter(nlParsed.text || '');

  await supabase
    .from('processed_content')
    .update({
      summary_text: summaryResult?.text || null,
      ebook_content: ebookResult?.text || null,
      newsletter_insight: newsletter.insight,
      newsletter_stat: newsletter.stat,
      newsletter_tip: newsletter.tip,
      newsletter_exercise: newsletter.exercise,
    })
    .eq('episode_id', episodeId);

  return {
    summary: summaryResult?.text,
    ebook: ebookResult?.text,
    newsletter,
    totalCost,
  };
}

function extractTop5(mergedExtractions) {
  const lines = mergedExtractions.split('\n');
  const insights = lines
    .filter((line) => /^\d+\.\s/.test(line.trim()))
    .slice(0, 5)
    .join('\n');
  return insights || mergedExtractions.slice(0, 2000);
}

function parseNewsletter(text) {
  const sections = {
    insight: null,
    stat: null,
    tip: null,
    exercise: null,
  };

  const insightMatch = text.match(/(?:TOP INSIGHT|1\.)[:\s]*([\s\S]*?)(?=(?:SURPRISING|2\.)|$)/i);
  const statMatch = text.match(/(?:SURPRISING STAT|2\.)[:\s]*([\s\S]*?)(?=(?:ACTIONABLE|3\.)|$)/i);
  const tipMatch = text.match(/(?:ACTIONABLE TIP|3\.)[:\s]*([\s\S]*?)(?=(?:EXERCISE|4\.)|$)/i);
  const exerciseMatch = text.match(/(?:EXERCISE|CHALLENGE|4\.)[:\s]*([\s\S]*?)$/i);

  sections.insight = insightMatch ? insightMatch[1].trim() : null;
  sections.stat = statMatch ? statMatch[1].trim() : null;
  sections.tip = tipMatch ? tipMatch[1].trim() : null;
  sections.exercise = exerciseMatch ? exerciseMatch[1].trim() : null;

  return sections;
}

module.exports = { runPass3 };
