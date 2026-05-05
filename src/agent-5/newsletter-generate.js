// Agent 5 — Newsletter generation: pull eligible episodes, call Claude, self-review, store draft
// Bi-weekly cron entry point.

const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const db = require('./db');
const { sendToAnton, BASE_URL } = require('./resend');
const { antonNotificationEmail } = require('./email-templates');
const {
  buildNewsletterPrompt,
  buildSelfReviewPrompt,
  parseNewsletterResponse,
  parseSelfReviewResponse,
} = require('./newsletter-prompt');

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

const COST_PER_M_INPUT = 3.0;
const COST_PER_M_OUTPUT = 15.0;

function calculateCost(inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1_000_000) * COST_PER_M_INPUT;
  const outputCost = (outputTokens / 1_000_000) * COST_PER_M_OUTPUT;
  return parseFloat((inputCost + outputCost).toFixed(4));
}

async function callClaude(prompt, { maxTokens = 4096, temperature = 0.3 } = {}) {
  if (!anthropic) throw new Error('Claude not configured — set ANTHROPIC_API_KEY');

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');

  return {
    text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cost: calculateCost(response.usage.input_tokens, response.usage.output_tokens),
  };
}

function getEligibleEpisodes() {
  const dbInstance = db.getDb();

  const hasTable = dbInstance.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='processed_content'"
  ).get();
  if (!hasTable) return [];

  return dbInstance.prepare(`
    SELECT pc.*, e.title, e.published_at, p.name as podcast_name, p.accent_colour
    FROM processed_content pc
    JOIN episodes e ON pc.episode_id = e.id
    JOIN podcasts p ON e.podcast_id = p.id
    WHERE pc.newsletter_included = 0 AND pc.status = 'published'
    ORDER BY e.published_at ASC
  `).all();
}

function markEpisodesIncluded(episodeIds) {
  const dbInstance = db.getDb();
  const stmt = dbInstance.prepare('UPDATE processed_content SET newsletter_included = 1 WHERE episode_id = ?');
  for (const id of episodeIds) {
    stmt.run(id);
  }
}

async function generateNewsletter() {
  console.log('=== Newsletter Generation ===');

  const episodes = getEligibleEpisodes();
  console.log(`Found ${episodes.length} eligible episode(s)`);

  if (episodes.length < 3) {
    console.log('Fewer than 3 episodes — skipping this issue');
    const nlId = db.createNewsletter({
      subjectLine: null,
      topInsight: null,
      surprisingStat: null,
      actionableTip: null,
      exercise: null,
      episodeIds: episodes.map(e => e.episode_id),
    });
    db.skipNewsletter(nlId, `Only ${episodes.length} episode(s) available (minimum 3)`);

    await sendToAnton({
      subject: 'Newsletter skipped — thin issue',
      text: `Only ${episodes.length} episode(s) have newsletter material ready. Minimum is 3. Skipping this issue.\n\nEpisodes available:\n${episodes.map(e => `- ${e.title} (${e.podcast_name})`).join('\n') || '(none)'}`,
      label: 'thin newsletter notification',
    }).catch(err => console.error('Failed to notify Anton:', err.message));

    return { skipped: true, reason: 'thin issue', episodeCount: episodes.length };
  }

  const episodeData = episodes.map(ep => ({
    title: ep.title,
    podcastName: ep.podcast_name,
    guestName: ep.guest_name || null,
    newsletterInsight: ep.newsletter_insight,
    newsletterStat: ep.newsletter_stat,
    newsletterTip: ep.newsletter_tip,
    newsletterExercise: ep.newsletter_exercise,
    ebookUrl: ep.ebook_pdf_url,
    pageCount: ep.final_page_count,
  }));

  // Step 1: Generate newsletter content
  console.log('Calling Claude for newsletter composition...');
  const prompt = buildNewsletterPrompt(episodeData);
  const result = await callClaude(prompt, { maxTokens: 2048 });
  console.log(`  Composition cost: $${result.cost} (${result.inputTokens} in, ${result.outputTokens} out)`);

  const parsed = parseNewsletterResponse(result.text);

  // Step 2: Self-review
  console.log('Running self-review...');
  const reviewText = [
    `TOP INSIGHT: ${parsed.topInsight.text}`,
    `SURPRISING STAT: ${parsed.surprisingStat}`,
    `ACTIONABLE TIP: ${parsed.actionableTip}`,
    `EXERCISE: ${parsed.exercise}`,
  ].join('\n\n');

  const reviewPrompt = buildSelfReviewPrompt(reviewText);
  const reviewResult = await callClaude(reviewPrompt, { maxTokens: 1024 });
  console.log(`  Review cost: $${reviewResult.cost}`);

  const review = parseSelfReviewResponse(reviewResult.text);
  console.log(`  Self-review score: ${review.total}/50 — ${review.passed ? 'PASS' : 'FAIL'}`);

  let finalParsed = parsed;
  let finalReview = review;

  // Step 3: If self-review fails, rewrite once
  if (!review.passed && review.total !== null) {
    console.log('Self-review failed — attempting rewrite...');
    const rewritePrompt = buildNewsletterPrompt(episodeData) +
      `\n\nIMPORTANT: A previous version scored ${review.total}/50. Issues found:\n${reviewResult.text}\n\nFix the identified issues. Aim for 35/50 or higher.`;

    const rewriteResult = await callClaude(rewritePrompt, { maxTokens: 2048 });
    console.log(`  Rewrite cost: $${rewriteResult.cost}`);
    finalParsed = parseNewsletterResponse(rewriteResult.text);

    const reReviewPrompt = buildSelfReviewPrompt([
      `TOP INSIGHT: ${finalParsed.topInsight.text}`,
      `SURPRISING STAT: ${finalParsed.surprisingStat}`,
      `ACTIONABLE TIP: ${finalParsed.actionableTip}`,
      `EXERCISE: ${finalParsed.exercise}`,
    ].join('\n\n'));

    const reReviewResult = await callClaude(reReviewPrompt, { maxTokens: 1024 });
    finalReview = parseSelfReviewResponse(reReviewResult.text);
    console.log(`  Re-review score: ${finalReview.total}/50 — ${finalReview.passed ? 'PASS' : 'FAIL'}`);
  }

  // Step 4: Store draft
  const episodeIds = episodes.map(e => e.episode_id);
  const dialogueText = finalParsed.dialogueHeader.reader && finalParsed.dialogueHeader.response
    ? `${finalParsed.dialogueHeader.reader}\n${finalParsed.dialogueHeader.response}`
    : null;

  const nlId = db.createNewsletter({
    subjectLine: finalParsed.subjectLines[0] || 'New issue',
    dialogueHeader: dialogueText,
    topInsight: finalParsed.topInsight.text,
    surprisingStat: finalParsed.surprisingStat,
    actionableTip: finalParsed.actionableTip,
    exercise: finalParsed.exercise,
    footerEbookLinks: finalParsed.footerEbookLinks,
    selfReviewScore: finalReview.dimensions || null,
    episodeIds,
  });

  console.log(`Newsletter draft stored: ${nlId}`);

  // Step 5: Notify Anton
  const approveUrl = `${BASE_URL}/api/newsletter/approve?id=${nlId}`;
  const holdUrl = `${BASE_URL}/api/newsletter/hold?id=${nlId}`;

  const notificationHtml = antonNotificationEmail({
    newsletter: {
      subjectLine: finalParsed.subjectLines[0],
      alternativeSubjects: finalParsed.subjectLines.slice(1),
      dialogueHeader: dialogueText,
      topInsight: finalParsed.topInsight.text,
      surprisingStat: finalParsed.surprisingStat,
      actionableTip: finalParsed.actionableTip,
      exercise: finalParsed.exercise,
      selfReviewScore: finalReview.total ? `${finalReview.total}/50` : 'N/A',
      episodeCount: episodes.length,
    },
    approveUrl,
    holdUrl,
  });

  await sendToAnton({
    subject: `Newsletter draft ready — "${finalParsed.subjectLines[0] || 'New issue'}"`,
    html: notificationHtml,
    label: 'newsletter draft notification',
  }).catch(err => console.error('Failed to notify Anton:', err.message));

  console.log('Anton notified. Awaiting approval.');

  return {
    skipped: false,
    newsletterId: nlId,
    subjectLine: finalParsed.subjectLines[0],
    selfReviewScore: finalReview.total,
    episodeCount: episodes.length,
  };
}

module.exports = {
  generateNewsletter,
  getEligibleEpisodes,
  markEpisodesIncluded,
};
