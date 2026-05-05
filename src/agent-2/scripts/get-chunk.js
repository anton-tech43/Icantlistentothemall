// Agent 2: get-chunk — fetch one chunk's text for the playbook to read.
//
// Usage:
//   node src/agent-2/scripts/get-chunk.js <episode_id> <chunk_index> [--field text|extractionA|extractionB|mergedExtraction]
//
// Default field: text. Outputs the field value to stdout.
const { supabase } = require('../utils/supabase');

async function main() {
  const args = process.argv.slice(2);
  const episodeId = args[0];
  const chunkIndex = parseInt(args[1], 10);
  const fieldIdx = args.indexOf('--field');
  const field = fieldIdx >= 0 ? args[fieldIdx + 1] : 'text';

  if (!episodeId || isNaN(chunkIndex)) {
    console.error('Usage: get-chunk.js <episode_id> <chunk_index> [--field text|extractionA|extractionB|mergedExtraction]');
    process.exit(2);
  }

  const { data, error } = await supabase
    .from('transcripts')
    .select('chunks')
    .eq('episode_id', episodeId)
    .single();

  if (error) throw new Error(`Transcript not found: ${error.message}`);
  const chunks = data.chunks || [];
  const chunk = chunks[chunkIndex];
  if (!chunk) {
    console.error(`Chunk ${chunkIndex} not found (episode has ${chunks.length} chunks)`);
    process.exit(1);
  }

  process.stdout.write(chunk[field] || '');
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
