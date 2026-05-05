// Agent 2: save-pass-3-done — advance state to review_pending after Pass 3 is saved.
// Usage: node src/agent-2/scripts/save-pass-3-done.js <episode_id>
const { setStep } = require('./_set-step');

async function main(episodeId) {
  if (!episodeId) {
    console.error('Usage: save-pass-3-done.js <episode_id>');
    process.exit(2);
  }
  await setStep(episodeId, 'processing', 'review_pending', 'reviewing');
  console.log(JSON.stringify({ ok: true, step: 'review_pending' }));
}

main(process.argv[2]).catch((err) => { console.error('FAILED:', err.message); process.exit(1); });
