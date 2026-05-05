// Agent 2: save-review — parse self-review outputs (accuracy + writing) and
// persist scores. If either fails the threshold, increment self_review_rewrites
// and exit with code 10 to signal the playbook that a rewrite is needed.
//
// Usage:
//   cat accuracy.txt | node src/agent-2/scripts/save-review.js <episode_id> --kind accuracy
//   cat writing.txt | node src/agent-2/scripts/save-review.js <episode_id> --kind writing
const { supabase } = require('../utils/supabase');

const ACCURACY_THRESHOLD = 7;
const WRITING_THRESHOLD = 35;

async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function parseAccuracy(text) {
  const scoreMatch = text.match(/ACCURACY SCORE[:\s]*(\d+)/i);
  const passMatch = text.match(/PASS\/FAIL[:\s]*(PASS|FAIL)/i);
  const correctionsMatch = text.match(/CORRECTIONS NEEDED[:\s]*([\s\S]*?)$/i);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 5;
  return {
    score,
    pass: passMatch ? passMatch[1] === 'PASS' : score >= ACCURACY_THRESHOLD,
    corrections: correctionsMatch ? correctionsMatch[1].trim() : null,
  };
}

function parseWriting(text) {
  const dims = ['DIRECTNESS', 'RHYTHM', 'TRUST', 'AUTHENTICITY', 'DENSITY'];
  const scores = {};
  for (const d of dims) {
    const m = text.match(new RegExp(`${d}[:\\s]*(\\d+)`, 'i'));
    scores[d.toLowerCase()] = m ? parseInt(m[1], 10) : 5;
  }
  const totalMatch = text.match(/TOTAL[:\s]*(\d+)/i);
  const total = totalMatch ? parseInt(totalMatch[1], 10) : Object.values(scores).reduce((a, b) => a + b, 0);
  const passMatch = text.match(/PASS\/FAIL[:\s]*(PASS|FAIL)/i);
  const issuesMatch = text.match(/SPECIFIC ISSUES[:\s]*([\s\S]*?)(?=PASS\/FAIL|$)/i);
  return {
    scores,
    total,
    pass: passMatch ? passMatch[1] === 'PASS' : total >= WRITING_THRESHOLD,
    issues: issuesMatch ? issuesMatch[1].trim() : null,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const episodeId = args[0];
  const kindIdx = args.indexOf('--kind');
  const kind = kindIdx >= 0 ? args[kindIdx + 1] : null;
  if (!episodeId || !['accuracy', 'writing'].includes(kind)) {
    console.error('Usage: save-review.js <episode_id> --kind accuracy|writing < review.txt');
    process.exit(2);
  }
  const text = (await readStdin()).trim();
  if (!text) { console.error('Empty review'); process.exit(2); }

  const { data: existing } = await supabase
    .from('processed_content')
    .select('self_review_scores')
    .eq('episode_id', episodeId)
    .single();
  const merged = existing?.self_review_scores || {};

  let parsed;
  if (kind === 'accuracy') {
    parsed = parseAccuracy(text);
    merged.accuracy = parsed;
  } else {
    parsed = parseWriting(text);
    merged.writing = parsed;
  }

  const updates = { self_review_scores: merged };
  if (kind === 'accuracy') updates.self_review_accuracy_score = parsed.score;

  const { error } = await supabase
    .from('processed_content')
    .update(updates)
    .eq('episode_id', episodeId);
  if (error) throw new Error(error.message);

  console.log(JSON.stringify({ ok: true, kind, pass: parsed.pass, score: parsed.score || parsed.total }));

  // Exit code 10 = soft fail (rewrite needed) — playbook checks this
  if (!parsed.pass) process.exit(10);
}

main().catch((err) => { console.error('FAILED:', err.message); process.exit(1); });
