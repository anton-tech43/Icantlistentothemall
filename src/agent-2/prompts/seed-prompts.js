// Agent 2: Seeds all v1 prompts into the prompt_versions table
// Run once after Supabase schema is created: node src/agent-2/prompts/seed-prompts.js
const { createPromptVersion } = require('../utils/prompt-versions');
const { V1_PROMPTS } = require('./v1-prompts');

async function seedV1Prompts() {
  console.log('Seeding v1 prompts into prompt_versions table...\n');

  const promptNames = Object.keys(V1_PROMPTS);
  let seeded = 0;
  let skipped = 0;

  for (const promptName of promptNames) {
    const { text, changeNotes } = V1_PROMPTS[promptName];
    try {
      const result = await createPromptVersion({
        promptName,
        promptText: text,
        changeNotes,
        setActive: true,
      });
      console.log(`  [OK] ${promptName} v${result.version} (active)`);
      seeded++;
    } catch (err) {
      if (err.message.includes('duplicate key')) {
        console.log(`  [SKIP] ${promptName} — already exists`);
        skipped++;
      } else {
        console.error(`  [FAIL] ${promptName}:`, err.message);
      }
    }
  }

  console.log(`\nDone. Seeded: ${seeded}, Skipped: ${skipped}, Total prompts: ${promptNames.length}`);
}

seedV1Prompts().catch(console.error);
