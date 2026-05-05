// Agent 2: load-prompt — fetch the active prompt from prompt_versions
// and fill in [PLACEHOLDERS] from named arguments. Reads variable values
// from a JSON file (passed via --vars) so chunk text and other large
// inputs don't have to fit on the command line.
//
// Usage:
//   node src/agent-2/scripts/load-prompt.js <prompt_name> --vars vars.json
//   node src/agent-2/scripts/load-prompt.js pass_1_extraction --vars /tmp/v.json
//
// vars.json shape: { "PODCAST_CONTEXT": "...", "CHUNK_TEXT": "..." }
//
// Outputs the filled prompt to stdout.
const fs = require('fs');
const { getActivePrompt } = require('../utils/prompt-versions');

async function main() {
  const args = process.argv.slice(2);
  const promptName = args[0];
  const varsIdx = args.indexOf('--vars');
  const varsPath = varsIdx >= 0 ? args[varsIdx + 1] : null;

  if (!promptName) {
    console.error('Usage: load-prompt.js <prompt_name> [--vars path/to/vars.json]');
    process.exit(2);
  }

  const prompt = await getActivePrompt(promptName);

  let vars = {};
  if (varsPath) {
    try {
      vars = JSON.parse(fs.readFileSync(varsPath, 'utf8'));
    } catch (err) {
      console.error(`Failed to read vars file ${varsPath}: ${err.message}`);
      process.exit(2);
    }
  }

  let filled = prompt.prompt_text;
  for (const [key, value] of Object.entries(vars)) {
    filled = filled.split(`[${key}]`).join(String(value || ''));
  }

  // Print prompt metadata as a leading comment so the routine knows the version
  process.stdout.write(filled);
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
