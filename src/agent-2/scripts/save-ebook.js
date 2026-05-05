// Agent 2: save-ebook — store the Pass 3 ebook content (structured Markdown
// with YAML front matter). Validates that the content has the front matter
// block and at least one chapter heading.
//
// Usage: cat ebook.md | node src/agent-2/scripts/save-ebook.js <episode_id>
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

function validate(text) {
  const issues = [];
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) {
    issues.push('Missing YAML front matter (must start with `---`)');
  }
  if (!/\n#\s+Chapter\s+\d+/i.test(text)) {
    issues.push('No `# Chapter N: ...` headings found');
  }
  if (text.length < 1000) {
    issues.push(`Suspiciously short (${text.length} chars)`);
  }
  return issues;
}

async function main() {
  const episodeId = process.argv[2];
  if (!episodeId) {
    console.error('Usage: save-ebook.js <episode_id> < ebook.md');
    process.exit(2);
  }
  const text = (await readStdin()).trim();
  if (!text) { console.error('Empty ebook'); process.exit(2); }

  const issues = validate(text);
  if (issues.length > 0) {
    console.error('Validation issues:');
    issues.forEach((i) => console.error('  -', i));
    console.error('Saving anyway. Review before publishing.');
  }

  const { error } = await supabase
    .from('processed_content')
    .update({ ebook_content: text })
    .eq('episode_id', episodeId);
  if (error) throw new Error(error.message);

  console.log(JSON.stringify({ ok: true, length: text.length, validationIssues: issues }));
}

main().catch((err) => { console.error('FAILED:', err.message); process.exit(1); });
