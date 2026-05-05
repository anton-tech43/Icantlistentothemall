// Agent 2: Pass 2 — Framework selection and chapter outline generation (real-time API)
const { callClaude } = require('../utils/claude');
const { getActivePrompt } = require('../utils/prompt-versions');
const { logPipelineStep, logCost } = require('../utils/logger');
const { supabase } = require('../utils/supabase');
const { sendAlertEmail } = require('../utils/email');
const { fillPrompt } = require('./pass1-extract');

const WORKER_BASE_URL = process.env.WORKER_BASE_URL || 'http://localhost:3001';

async function runPass2(episodeId, mergedExtractions, episodeInfo) {
  const structurePrompt = await getActivePrompt('pass_2_structure');

  const prompt = fillPrompt(structurePrompt.prompt_text, {
    MERGED_EXTRACTIONS: mergedExtractions,
    EPISODE_TITLE: episodeInfo.title,
    GUEST_NAME: episodeInfo.guestName || 'Unknown',
    PODCAST_NAME: episodeInfo.podcastName,
    FORMAT_TAG: episodeInfo.formatTag,
  });

  const startedAt = new Date().toISOString();
  const result = await callClaude(prompt, { maxTokens: 4096, temperature: 0.3 });
  const finishedAt = new Date().toISOString();

  await logPipelineStep({
    episodeId,
    stepName: 'pass_2_structure',
    promptVersionId: structurePrompt.id,
    startedAt,
    finishedAt,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    costUsd: result.cost,
    status: 'success',
  });

  await logCost({
    episodeId,
    service: 'claude',
    operation: 'pass_2_structure',
    tokensIn: result.inputTokens,
    tokensOut: result.outputTokens,
    costUsd: result.cost,
  });

  const parsed = parseStructureOutput(result.text);

  await supabase
    .from('processed_content')
    .update({
      pass_2_framework_selected: parsed.framework,
      guest_name: parsed.guestName,
    })
    .eq('episode_id', episodeId);

  await sendOutlineReviewEmail(episodeId, episodeInfo, parsed);

  return {
    outline: result.text,
    framework: parsed.framework,
    pageCount: parsed.pageCount,
    guestName: parsed.guestName,
    gaps: parsed.gaps,
    cost: result.cost,
  };
}

async function sendOutlineReviewEmail(episodeId, episodeInfo, parsed) {
  const approveUrl = `${WORKER_BASE_URL}/api/outline/approve/${episodeId}`;
  const flagUrl = `${WORKER_BASE_URL}/api/outline/flag/${episodeId}`;

  const body = `OUTLINE REVIEW — ${episodeInfo.title}

Podcast: ${episodeInfo.podcastName}
Guest: ${parsed.guestName}
Framework: ${parsed.framework}
Estimated pages: ${parsed.pageCount}

${parsed.gaps !== 'None' ? `GAPS/CONCERNS: ${parsed.gaps}\n\n` : ''}---

${parsed.rawOutline}

---

APPROVE: ${approveUrl}
FLAG FOR REVIEW: ${flagUrl}

(Click Approve to trigger Pass 3 automatically. Click Flag to pause processing.)`;

  await sendAlertEmail(`Outline Review: ${episodeInfo.title}`, body);
}

function parseStructureOutput(text) {
  const guestMatch = text.match(/GUEST NAME:\s*(.+)/i);
  const frameworkMatch = text.match(/FRAMEWORK SELECTED:\s*(.+?)(?:\s*—|\s*-|\n)/i);
  const pagesMatch = text.match(/ESTIMATED PAGES:\s*(\d+)/i);
  const gapsMatch = text.match(/GAPS OR CONCERNS:\s*([\s\S]*?)$/i);

  const chapterOutlineStart = text.indexOf('CHAPTER 1');
  const gapsStart = text.search(/GAPS OR CONCERNS/i);
  const rawOutline = chapterOutlineStart >= 0
    ? text.slice(chapterOutlineStart, gapsStart >= 0 ? gapsStart : undefined).trim()
    : text;

  return {
    guestName: guestMatch ? guestMatch[1].trim() : 'Unknown',
    framework: frameworkMatch ? frameworkMatch[1].trim() : 'Three Things Worth Knowing',
    pageCount: pagesMatch ? parseInt(pagesMatch[1], 10) : 6,
    gaps: gapsMatch ? gapsMatch[1].trim() : 'None',
    rawOutline,
  };
}

module.exports = { runPass2 };
