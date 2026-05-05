// Agent 2: save-summary — store the Pass 3 summary text.
// Usage: cat summary.txt | node src/agent-2/scripts/save-summary.js <episode_id>
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
  const episodeId = process.argv[2];
  if (!episodeId) {
    console.error('Usage: save-summary.js <episode_id> < summary.txt');
    process.exit(2);
  }
  const text = (await readStdin()).trim();
  if (!text) { console.error('Empty summary'); process.exit(2); }

  const { error } = await supabase
    .from('processed_content')
    .update({ summary_text: text })
    .eq('episode_id', episodeId);
  if (error) throw new Error(error.message);

  console.log(JSON.stringify({ ok: true, length: text.length }));
}

main().catch((err) => { console.error('FAILED:', err.message); process.exit(1); });
