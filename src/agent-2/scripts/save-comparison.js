// Agent 2: save-comparison — parse a Pass 1 comparison output and persist
// the merged extraction + agreement score + stronger instance for one chunk.
//
// Usage:
//   cat comparison.txt | node src/agent-2/scripts/save-comparison.js <episode_id> <chunk_index>
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

function parseComparison(text) {
  const scoreMatch = text.match(/AGREEMENT SCORE[^:]*:\s*(\d+)/i);
  const strongerMatch = text.match(/STRONGER EXTRACTION[^:]*:\s*([AB])/i);
  const actionMatch = text.match(/RECOMMENDED ACTION[^:]*:\s*"?(PROCEED[^"\n]*|PAUSE[^"\n]*)/i);
  const mergedMatch = text.match(/MERGED EXTRACTION[:\s]*([\s\S]*?)$/i);

  let action = 'PROCEED';
  if (actionMatch) {
    const raw = actionMatch[1].toUpperCase();
    if (raw.includes('PAUSE')) action = 'PAUSE';
    else if (raw.includes('FLAG')) action = 'PROCEED_WITH_FLAG';
  }

  return {
    agreementScore: scoreMatch ? parseInt(scoreMatch[1], 10) : null,
    strongerInstance: strongerMatch ? strongerMatch[1] : 'A',
    action,
    mergedExtraction: mergedMatch ? mergedMatch[1].trim() : text.trim(),
  };
}

async function main() {
  const [episodeId, chunkIndexStr] = process.argv.slice(2);
  const chunkIndex = parseInt(chunkIndexStr, 10);

  if (!episodeId || isNaN(chunkIndex)) {
    console.error('Usage: save-comparison.js <episode_id> <chunk_index> < comparison.txt');
    process.exit(2);
  }

  const text = await readStdin();
  if (!text.trim()) {
    console.error('Empty comparison text on stdin');
    process.exit(2);
  }

  const parsed = parseComparison(text);

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

  chunks[chunkIndex].comparison = text.trim();
  chunks[chunkIndex].mergedExtraction = parsed.mergedExtraction;
  chunks[chunkIndex].agreementScore = parsed.agreementScore;
  chunks[chunkIndex].strongerInstance = parsed.strongerInstance;
  chunks[chunkIndex].action = parsed.action;

  const { error: updErr } = await supabase
    .from('transcripts')
    .update({ chunks })
    .eq('episode_id', episodeId);
  if (updErr) throw new Error(`Update failed: ${updErr.message}`);

  console.log(JSON.stringify({ ok: true, ...parsed }));
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
