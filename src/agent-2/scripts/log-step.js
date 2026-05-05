// Agent 2: log-step — record a pipeline_logs entry for an AI step Claude
// just performed. Tokens-in/out are unknown when Claude does the work
// natively (no API), so we only record duration and step metadata.
//
// Usage:
//   node src/agent-2/scripts/log-step.js <episode_id> <step_name> [--prompt-name <name>] [--metadata-json '{}']
const { logPipelineStep } = require('../utils/logger');
const { getActivePrompt } = require('../utils/prompt-versions');

async function main() {
  const args = process.argv.slice(2);
  const episodeId = args[0];
  const stepName = args[1];

  if (!episodeId || !stepName) {
    console.error('Usage: log-step.js <episode_id> <step_name> [--prompt-name <name>] [--metadata-json <json>]');
    process.exit(2);
  }

  const promptIdx = args.indexOf('--prompt-name');
  const promptName = promptIdx >= 0 ? args[promptIdx + 1] : null;

  const metaIdx = args.indexOf('--metadata-json');
  const metadata = metaIdx >= 0 ? JSON.parse(args[metaIdx + 1]) : null;

  let promptVersionId = null;
  if (promptName) {
    try {
      const p = await getActivePrompt(promptName);
      promptVersionId = p.id;
    } catch (e) {
      console.error(`Note: could not resolve prompt "${promptName}": ${e.message}`);
    }
  }

  await logPipelineStep({
    episodeId,
    stepName,
    promptVersionId,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    status: 'success',
    metadata,
  });

  console.log(JSON.stringify({ ok: true, stepName, promptVersionId }));
}

main().catch((err) => { console.error('FAILED:', err.message); process.exit(1); });
