// Agent 2: Claude API client — supports both real-time and batch modes
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic();

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const BATCH_MODEL = CLAUDE_MODEL;

// Cost per million tokens (Sonnet pricing)
const COST_PER_M_INPUT = 3.0;
const COST_PER_M_OUTPUT = 15.0;

function calculateCost(inputTokens, outputTokens, isBatch = false) {
  const discount = isBatch ? 0.5 : 1.0;
  const inputCost = (inputTokens / 1_000_000) * COST_PER_M_INPUT * discount;
  const outputCost = (outputTokens / 1_000_000) * COST_PER_M_OUTPUT * discount;
  return parseFloat((inputCost + outputCost).toFixed(4));
}

async function callClaude(prompt, { maxTokens = 4096, temperature = 0.3 } = {}) {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  return {
    text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cost: calculateCost(response.usage.input_tokens, response.usage.output_tokens, false),
  };
}

async function createBatch(requests) {
  const batch = await anthropic.messages.batches.create({
    requests: requests.map((req, i) => ({
      custom_id: req.id || `req-${i}`,
      params: {
        model: BATCH_MODEL,
        max_tokens: req.maxTokens || 4096,
        temperature: req.temperature || 0.3,
        messages: [{ role: 'user', content: req.prompt }],
      },
    })),
  });
  return batch;
}

async function pollBatch(batchId, intervalMs = 30000) {
  while (true) {
    const batch = await anthropic.messages.batches.retrieve(batchId);
    if (batch.processing_status === 'ended') {
      return batch;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

async function getBatchResults(batchId) {
  const results = [];
  for await (const result of anthropic.messages.batches.results(batchId)) {
    results.push(result);
  }
  return results;
}

function parseBatchResult(result) {
  if (result.result.type !== 'succeeded') {
    return {
      id: result.custom_id,
      error: result.result.error || result.result.type,
      text: null,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
  }

  const message = result.result.message;
  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  return {
    id: result.custom_id,
    text,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    cost: calculateCost(message.usage.input_tokens, message.usage.output_tokens, true),
  };
}

module.exports = {
  callClaude,
  createBatch,
  pollBatch,
  getBatchResults,
  parseBatchResult,
  calculateCost,
  CLAUDE_MODEL,
};
