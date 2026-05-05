// Agent 2: get-merged-extractions — print all merged extractions for an episode
// concatenated with chunk separators. Used as input for Pass 2 (structuring)
// and Pass 3 (writing).
//
// Usage: node src/agent-2/scripts/get-merged-extractions.js <episode_id>
const { supabase } = require('../utils/supabase');

async function main(episodeId) {
  if (!episodeId) {
    console.error('Usage: get-merged-extractions.js <episode_id>');
    process.exit(2);
  }

  const { data, error } = await supabase
    .from('transcripts')
    .select('chunks')
    .eq('episode_id', episodeId)
    .single();
  if (error) throw new Error(`Transcript not found: ${error.message}`);

  const chunks = data.chunks || [];
  const merged = chunks
    .map((c, i) => c.mergedExtraction ? `=== CHUNK ${i} (topic: ${c.topic || 'untitled'}) ===\n${c.mergedExtraction}` : null)
    .filter(Boolean);

  if (merged.length === 0) {
    console.error('No merged extractions found. Run Pass 1 first.');
    process.exit(1);
  }

  process.stdout.write(merged.join('\n\n'));
}

main(process.argv[2]).catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
