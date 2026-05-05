// Agent 2: Pipeline logging — writes structured logs to pipeline_logs and cost_tracking tables
const { supabase } = require('./supabase');

async function logPipelineStep({
  episodeId,
  stepName,
  promptVersionId = null,
  startedAt,
  finishedAt = null,
  inputTokens = null,
  outputTokens = null,
  audioDurationSeconds = null,
  costUsd = null,
  status,
  errorMessage = null,
  metadata = null,
}) {
  const durationSeconds = finishedAt
    ? (new Date(finishedAt) - new Date(startedAt)) / 1000
    : null;

  const { data, error } = await supabase.from('pipeline_logs').insert({
    episode_id: episodeId,
    step_name: stepName,
    prompt_version_id: promptVersionId,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_seconds: durationSeconds,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    audio_duration_seconds: audioDurationSeconds,
    cost_usd: costUsd,
    status,
    error_message: errorMessage,
    metadata,
  }).select().single();

  if (error) {
    console.error(`Failed to log pipeline step ${stepName}:`, error);
  }
  return data;
}

async function logCost({
  episodeId = null,
  service,
  operation,
  tokensIn = null,
  tokensOut = null,
  costUsd,
}) {
  const { data, error } = await supabase.from('cost_tracking').insert({
    episode_id: episodeId,
    service,
    operation,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
    cost_usd: costUsd,
  }).select().single();

  if (error) {
    console.error(`Failed to log cost for ${service}/${operation}:`, error);
  }
  return data;
}

async function getEpisodeCost(episodeId) {
  const { data, error } = await supabase
    .from('cost_tracking')
    .select('cost_usd')
    .eq('episode_id', episodeId);

  if (error) {
    console.error('Failed to get episode cost:', error);
    return 0;
  }
  return data.reduce((sum, row) => sum + parseFloat(row.cost_usd), 0);
}

async function getWeeklyCost() {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('cost_tracking')
    .select('cost_usd')
    .gte('created_at', weekStart.toISOString());

  if (error) {
    console.error('Failed to get weekly cost:', error);
    return 0;
  }
  return data.reduce((sum, row) => sum + parseFloat(row.cost_usd), 0);
}

module.exports = { logPipelineStep, logCost, getEpisodeCost, getWeeklyCost };
