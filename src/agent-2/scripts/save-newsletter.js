// Agent 2: save-newsletter — parse the 4-section newsletter material and
// persist each piece to its own column in processed_content.
//
// Usage: cat newsletter.txt | node src/agent-2/scripts/save-newsletter.js <episode_id>
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

function parseSections(text) {
  const insightMatch = text.match(/(?:^|\n)\s*(?:1\.|TOP INSIGHT)[:\s]*([\s\S]*?)(?=\n\s*(?:2\.|SURPRISING)|$)/i);
  const statMatch = text.match(/(?:^|\n)\s*(?:2\.|SURPRISING(?:\s+STAT)?(?:\s+OR\s+INSIGHT)?)[:\s]*([\s\S]*?)(?=\n\s*(?:3\.|ACTIONABLE)|$)/i);
  const tipMatch = text.match(/(?:^|\n)\s*(?:3\.|ACTIONABLE(?:\s+TIP)?)[:\s]*([\s\S]*?)(?=\n\s*(?:4\.|EXERCISE|CHALLENGE)|$)/i);
  const exerciseMatch = text.match(/(?:^|\n)\s*(?:4\.|EXERCISE(?:\s+OR\s+CHALLENGE)?|CHALLENGE)[:\s]*([\s\S]*?)$/i);

  return {
    insight: insightMatch ? insightMatch[1].trim() : null,
    stat: statMatch ? statMatch[1].trim() : null,
    tip: tipMatch ? tipMatch[1].trim() : null,
    exercise: exerciseMatch ? exerciseMatch[1].trim() : null,
  };
}

async function main() {
  const episodeId = process.argv[2];
  if (!episodeId) {
    console.error('Usage: save-newsletter.js <episode_id> < newsletter.txt');
    process.exit(2);
  }
  const text = (await readStdin()).trim();
  if (!text) { console.error('Empty newsletter material'); process.exit(2); }

  const parsed = parseSections(text);
  const missing = Object.entries(parsed).filter(([k, v]) => !v).map(([k]) => k);
  if (missing.length > 0) {
    console.error('Could not parse sections:', missing.join(', '));
  }

  const { error } = await supabase
    .from('processed_content')
    .update({
      newsletter_insight: parsed.insight,
      newsletter_stat: parsed.stat,
      newsletter_tip: parsed.tip,
      newsletter_exercise: parsed.exercise,
    })
    .eq('episode_id', episodeId);
  if (error) throw new Error(error.message);

  console.log(JSON.stringify({ ok: true, parsed: Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, v ? v.slice(0, 60) + '...' : null])) }));
}

main().catch((err) => { console.error('FAILED:', err.message); process.exit(1); });
