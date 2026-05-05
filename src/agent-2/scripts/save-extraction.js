// Agent 2: save-extraction — write a Pass 1 extraction (instance A or B) for one chunk.
// Reads the extraction text from stdin (so it can hold long output safely).
//
// Usage:
//   cat extraction.txt | node src/agent-2/scripts/save-extraction.js <episode_id> <chunk_index> A
//   cat extraction.txt | node src/agent-2/scripts/save-extraction.js <episode_id> <chunk_index> B
const { supabase } = require('../utils/supabase');

async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

async function main() {
  const [episodeId, chunkIndexStr, instance] = process.argv.slice(2);
  const chunkIndex = parseInt(chunkIndexStr, 10);

  if (!episodeId || isNaN(chunkIndex) || !['A', 'B'].includes(instance)) {
    console.error('Usage: save-extraction.js <episode_id> <chunk_index> <A|B> < extraction.txt');
    process.exit(2);
  }

  const text = await readStdin();
  if (!text.trim()) {
    console.error('Empty extraction text on stdin');
    process.exit(2);
  }

  const { data, error } = await supabase
    .from('transcripts')
    .select('chunks')
    .eq('episode_id', episodeId)
    .single();
  if (error) throw new Error(`Transcript not found: ${error.message}`);

  const chunks = data.chunks || [];
  if (!chunks[chunkIndex]) {
    console.error(`Chunk ${chunkIndex} not found`);
    process.exit(1);
  }

  const fieldName = instance === 'A' ? 'extractionA' : 'extractionB';
  chunks[chunkIndex][fieldName] = text.trim();

  const { error: updErr } = await supabase
    .from('transcripts')
    .update({ chunks })
    .eq('episode_id', episodeId);
  if (updErr) throw new Error(`Update failed: ${updErr.message}`);

  console.log(JSON.stringify({ ok: true, episodeId, chunkIndex, instance, length: text.length }));
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
