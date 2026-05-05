// Agent 2: Self-review — content accuracy + writing quality on ebook only
const { createBatch, pollBatch, getBatchResults, parseBatchResult } = require('../utils/claude');
const { getActivePrompt } = require('../utils/prompt-versions');
const { logPipelineStep, logCost } = require('../utils/logger');
const { supabase } = require('../utils/supabase');

const ACCURACY_THRESHOLD = 7;
const WRITING_THRESHOLD = 35;

async function runSelfReview(episodeId, ebookText, mergedExtractions) {
  const accuracyPrompt = await getActivePrompt('self_review_accuracy');
  const writingPrompt = await getActivePrompt('self_review_writing');

  const batchRequests = [
    {
      id: 'accuracy',
      prompt: accuracyPrompt.prompt_text
        .replace('[EXTRACTIONS]', mergedExtractions)
        .replace('[EBOOK_TEXT]', ebookText),
      maxTokens: 4096,
    },
    {
      id: 'writing',
      prompt: writingPrompt.prompt_text
        .replace('[EBOOK_TEXT]', ebookText),
      maxTokens: 4096,
    },
  ];

  const startedAt = new Date().toISOString();
  const batch = await createBatch(batchRequests);
  await pollBatch(batch.id);
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

  const accuracy = parseAccuracyReview(parsed['accuracy']?.text || '');
  const writing = parseWritingReview(parsed['writing']?.text || '');

  await logPipelineStep({
    episodeId,
    stepName: 'self_review_ebook',
    promptVersionId: accuracyPrompt.id,
    startedAt,
    finishedAt: new Date().toISOString(),
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    costUsd: totalCost,
    status: 'success',
    metadata: { accuracy, writing },
  });

  await logCost({
    episodeId,
    service: 'claude',
    operation: 'self_review',
    tokensIn: totalInputTokens,
    tokensOut: totalOutputTokens,
    costUsd: totalCost,
  });

  const selfReviewScores = {
    ebook: {
      accuracy_score: accuracy.score,
      accuracy_pass: accuracy.pass,
      directness: writing.scores.directness,
      rhythm: writing.scores.rhythm,
      trust: writing.scores.trust,
      authenticity: writing.scores.authenticity,
      density: writing.scores.density,
      writing_total: writing.total,
      writing_pass: writing.pass,
    },
  };

  await supabase
    .from('processed_content')
    .update({
      self_review_scores: selfReviewScores,
      self_review_accuracy_score: accuracy.score,
    })
    .eq('episode_id', episodeId);

  return {
    accuracyPass: accuracy.pass,
    writingPass: writing.pass,
    accuracyScore: accuracy.score,
    writingTotal: writing.total,
    corrections: accuracy.corrections,
    writingIssues: writing.issues,
    selfReviewScores,
    totalCost,
  };
}

async function runRewrite(episodeId, ebookText, mergedExtractions, corrections, writingIssues) {
  const ebookPrompt = await getActivePrompt('pass_3_ebook');

  const rewriteInstructions = `REWRITE INSTRUCTIONS:
The previous version had these issues that must be fixed:

${corrections ? `ACCURACY CORRECTIONS:\n${corrections}\n\n` : ''}${writingIssues ? `WRITING ISSUES:\n${writingIssues}\n\n` : ''}
Fix these specific issues while keeping the overall structure. Here is the previous ebook text to revise:

${ebookText}`;

  const startedAt = new Date().toISOString();
  const batch = await createBatch([{
    id: 'rewrite',
    prompt: rewriteInstructions,
    maxTokens: 8192,
  }]);

  await pollBatch(batch.id);
  const results = await getBatchResults(batch.id);
  const result = parseBatchResult(results[0]);

  await logPipelineStep({
    episodeId,
    stepName: 'pass_3_ebook_rewrite',
    startedAt,
    finishedAt: new Date().toISOString(),
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    costUsd: result.cost,
    status: result.text ? 'success' : 'failed',
  });

  await logCost({
    episodeId,
    service: 'claude',
    operation: 'pass_3_rewrite',
    tokensIn: result.inputTokens,
    tokensOut: result.outputTokens,
    costUsd: result.cost,
  });

  if (result.text) {
    await supabase
      .from('processed_content')
      .update({ ebook_content: result.text })
      .eq('episode_id', episodeId);
  }

  return result.text;
}

function parseAccuracyReview(text) {
  const scoreMatch = text.match(/ACCURACY SCORE[:\s]*(\d+)/i);
  const passMatch = text.match(/PASS\/FAIL[:\s]*(PASS|FAIL)/i);
  const correctionsMatch = text.match(/CORRECTIONS NEEDED[:\s]*([\s\S]*?)$/i);

  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 5;
  return {
    score,
    pass: passMatch ? passMatch[1] === 'PASS' : score >= ACCURACY_THRESHOLD,
    corrections: correctionsMatch ? correctionsMatch[1].trim() : null,
  };
}

function parseWritingReview(text) {
  const scores = {};
  const dimensions = ['DIRECTNESS', 'RHYTHM', 'TRUST', 'AUTHENTICITY', 'DENSITY'];

  for (const dim of dimensions) {
    const match = text.match(new RegExp(`${dim}[:\\s]*(\\d+)`, 'i'));
    scores[dim.toLowerCase()] = match ? parseInt(match[1], 10) : 5;
  }

  const totalMatch = text.match(/TOTAL[:\s]*(\d+)/i);
  const total = totalMatch ? parseInt(totalMatch[1], 10) : Object.values(scores).reduce((a, b) => a + b, 0);
  const passMatch = text.match(/PASS\/FAIL[:\s]*(PASS|FAIL)/i);

  const issuesMatch = text.match(/SPECIFIC ISSUES[:\s]*([\s\S]*?)(?=PASS\/FAIL|$)/i);

  return {
    scores,
    total,
    pass: passMatch ? passMatch[1] === 'PASS' : total >= WRITING_THRESHOLD,
    issues: issuesMatch ? issuesMatch[1].trim() : null,
  };
}

module.exports = { runSelfReview, runRewrite, ACCURACY_THRESHOLD, WRITING_THRESHOLD };
