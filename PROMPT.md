# icantlistentothemall — Routine Playbook

You are the Agent-2 AI pipeline. On every routine fire, advance **one episode** as far as possible toward a published draft. You are not in a long-running worker — each fire is a fresh session, so be deliberate and commit progress to the database as you go.

## What this product does

Turns business-podcast episodes into short, well-edited ebooks (PDFs) and a bi-weekly newsletter. You handle the AI work: transcription post-processing, insight extraction, structuring, writing, and self-review. Agent 3 handles PDF generation; Agent 5 handles newsletter delivery; both consume what you write to `processed_content`.

## Setup at the start of every fire

```bash
npm ci --silent
node src/agent-2/scripts/bootstrap-secrets.js
```

The bootstrap step calls a Supabase Edge Function with the `PIPELINE_API_TOKEN`
from the Cloud Environment, fetches the actual service keys
(`SUPABASE_SERVICE_ROLE_KEY`, `DEEPGRAM_API_KEY`, `RESEND_API_KEY`) from
Supabase's encrypted secret store, and writes them to `.env` at the repo
root. All subsequent scripts use `require('dotenv').config()` and pick
them up automatically.

If bootstrap fails, every other script will fail too — stop the fire and
report the bootstrap error. Common causes: PIPELINE_API_TOKEN mismatch,
SUPABASE_URL wrong, or the function isn't deployed.

## Fire flow

1. Get the next action:
   ```bash
   node src/agent-2/scripts/next-action.js
   ```
   It returns one JSON object. Use the `action` field to decide what to do.

2. Do exactly **one** of the actions below. Each section ends with a state advance — if you can't complete the action, stop and let the next fire retry. Don't loop on failures.

3. After completing the action, **stop the fire**. The next scheduled fire will pick up the next state.

If `action: "idle"`, exit cleanly. There's nothing to do.

If `action: "cost_exceeded"`, stop. Anton has been alerted.

If `action: "awaiting_approval"`, stop. The routine cannot move forward until Anton clicks the Approve link in the outline review email.

---

## Action: `transcribe`

The episode is in the queue with no transcript yet. Run Deepgram + chunking in one shot:

```bash
node src/agent-2/scripts/transcribe-and-chunk.js <episode.id>
```

That script handles:
- Deepgram URL passthrough transcription with diarisation
- Chunking (2,500-word target, 200-word overlap, 12-min max per chunk)
- Saving chunks to `transcripts.chunks`
- Logging cost + step
- Advancing state to `pass_1_pending`

Stop after this completes. The next fire will pick up Pass 1.

---

## Action: `pass_1`

The episode has chunks ready. You'll do dual extraction + comparison **per chunk**, in your own turn (no API calls — you ARE the model).

For each chunk index from 0 to `chunkCount - 1`:

### Step 1A — Standard extraction (Instance A)

Build the prompt:

```bash
# Write podcast context + chunk text into a temp vars file
mkdir -p /tmp/agent2
cat > /tmp/agent2/vars-A-<chunk_index>.json <<'JSON'
{
  "PODCAST_CONTEXT": "<the podcastContext from next-action output>",
  "CHUNK_TEXT": "<run get-chunk and embed the result here>"
}
JSON

# Get the chunk text (stream it into the JSON via jq or by concatenation)
node src/agent-2/scripts/get-chunk.js <episode.id> <chunk_index> > /tmp/agent2/chunk-<chunk_index>.txt

# Build the filled prompt and read it
node src/agent-2/scripts/load-prompt.js pass_1_extraction --vars /tmp/agent2/vars-A-<chunk_index>.json > /tmp/agent2/prompt-A-<chunk_index>.txt
```

Easier path (recommended): use a small Node helper to assemble the vars file safely. Don't try to embed multi-paragraph text into a heredoc — the chunk content can contain quotes that break shell escaping. Use Read/Write tools instead, or pipe through `node -e`:

```bash
node -e "
  const fs = require('fs');
  const ctx = process.argv[1]; // pass via CLI carefully or via env var
  const text = fs.readFileSync('/tmp/agent2/chunk-<chunk_index>.txt', 'utf8');
  fs.writeFileSync('/tmp/agent2/vars-A-<chunk_index>.json', JSON.stringify({
    PODCAST_CONTEXT: ctx,
    CHUNK_TEXT: text
  }));
" "<podcastContext>"
```

Now read `prompt-A-<chunk_index>.txt`. **You** perform the extraction by reading the prompt and producing the structured response (TOPIC, INSIGHTS, FACTS & DATA, FRAMEWORKS, ACTIONABLE ADVICE, NOTABLE QUOTES, CONTINUED TOPIC). Write your response to `/tmp/agent2/extract-A-<chunk_index>.txt`, then save it:

```bash
cat /tmp/agent2/extract-A-<chunk_index>.txt | node src/agent-2/scripts/save-extraction.js <episode.id> <chunk_index> A
```

### Step 1B — Alternative extraction (Instance B)

Same pattern with prompt `pass_1_alternative`. Save with `save-extraction.js ... B`.

### Step 1C — Comparison

Build vars from the two extractions:

```bash
node -e "
  const fs = require('fs');
  fs.writeFileSync('/tmp/agent2/vars-cmp-<chunk_index>.json', JSON.stringify({
    EXTRACTION_A: fs.readFileSync('/tmp/agent2/extract-A-<chunk_index>.txt', 'utf8'),
    EXTRACTION_B: fs.readFileSync('/tmp/agent2/extract-B-<chunk_index>.txt', 'utf8')
  }));
"
node src/agent-2/scripts/load-prompt.js pass_1_comparison --vars /tmp/agent2/vars-cmp-<chunk_index>.json > /tmp/agent2/prompt-cmp-<chunk_index>.txt
```

Read the comparison prompt, perform the comparison yourself, write to `/tmp/agent2/cmp-<chunk_index>.txt`, then save:

```bash
cat /tmp/agent2/cmp-<chunk_index>.txt | node src/agent-2/scripts/save-comparison.js <episode.id> <chunk_index>
```

After all chunks are done, run:

```bash
node src/agent-2/scripts/finalize-pass-1.js <episode.id>
```

That aggregates totals, checks the < 6 insights threshold, and advances state to `pass_2_pending`. If the threshold check fails or any chunk's comparison says PAUSE, the script will pause processing and email Anton.

Then log the step:

```bash
node src/agent-2/scripts/log-step.js <episode.id> pass_1 --prompt-name pass_1_extraction
```

---

## Action: `pass_2`

Load all merged extractions and the structuring prompt, do the structuring yourself, save the outline:

```bash
node src/agent-2/scripts/get-merged-extractions.js <episode.id> > /tmp/agent2/merged.txt

# Episode metadata (you have it from next-action: episode.title, podcastName, formatTag)
node -e "
  const fs = require('fs');
  fs.writeFileSync('/tmp/agent2/vars-pass2.json', JSON.stringify({
    MERGED_EXTRACTIONS: fs.readFileSync('/tmp/agent2/merged.txt', 'utf8'),
    EPISODE_TITLE: process.argv[1],
    GUEST_NAME: 'Unknown',
    PODCAST_NAME: process.argv[2],
    FORMAT_TAG: process.argv[3]
  }));
" "<episode.title>" "<podcastName>" "<formatTag>"

node src/agent-2/scripts/load-prompt.js pass_2_structure --vars /tmp/agent2/vars-pass2.json > /tmp/agent2/prompt-pass2.txt
```

Read the prompt. Perform the structuring (framework selection, chapter outline with pull-forwards, page count, gaps, guest name extraction). Format your response per the prompt's FORMAT section. Write to `/tmp/agent2/outline.txt`, then:

```bash
cat /tmp/agent2/outline.txt | node src/agent-2/scripts/save-pass-2.js <episode.id>
node src/agent-2/scripts/log-step.js <episode.id> pass_2 --prompt-name pass_2_structure
```

`save-pass-2.js` parses the outline, stores framework + outline + guest + page count, sends the outline review email to Anton with Approve/Flag links, and advances state to `awaiting_approval`. Stop the fire.

---

## Action: `awaiting_approval`

Anton hasn't clicked Approve yet. Exit immediately:

```bash
echo "Awaiting outline approval — exiting."
exit 0
```

When Anton clicks the Approve link in the email, a Supabase Edge Function flips `processed_content.pass_2_outline_approved = true`. The next routine fire will pick that up and return `action: "pass_3"`.

---

## Action: `pass_3`

Generate summary, ebook, and newsletter material — three separate AI passes you do yourself.

### Step 3A — Summary

```bash
node src/agent-2/scripts/get-merged-extractions.js <episode.id> > /tmp/agent2/merged.txt
# Read processed_content.pass_2_outline for the outline (or call get-pass2.js if you build one)
node -e "
  const { createClient } = require('@supabase/supabase-js');
  const c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  c.from('processed_content').select('pass_2_outline, guest_name, pass_2_framework_selected, final_page_count').eq('episode_id', process.argv[1]).single().then(({data}) => {
    require('fs').writeFileSync('/tmp/agent2/pc.json', JSON.stringify(data));
  });
" <episode.id>

# Build vars for the summary prompt
node -e "
  const fs = require('fs');
  const pc = JSON.parse(fs.readFileSync('/tmp/agent2/pc.json', 'utf8'));
  fs.writeFileSync('/tmp/agent2/vars-summary.json', JSON.stringify({
    EPISODE_TITLE: process.argv[1],
    GUEST_NAME: pc.guest_name,
    PODCAST_NAME: process.argv[2],
    OUTLINE: pc.pass_2_outline,
    TOP_5_INSIGHTS: fs.readFileSync('/tmp/agent2/merged.txt', 'utf8').slice(0, 4000)
  }));
" "<episode.title>" "<podcastName>"

node src/agent-2/scripts/load-prompt.js pass_3_summary --vars /tmp/agent2/vars-summary.json > /tmp/agent2/prompt-summary.txt
```

Perform the summary (3-5 sentences, third person, no throat-clearing). Save:

```bash
cat /tmp/agent2/summary.txt | node src/agent-2/scripts/save-summary.js <episode.id>
```

### Step 3B — Ebook

Same pattern with `pass_3_ebook`. The ebook output **must** be structured Markdown with a YAML front matter block (`guest_name`, `framework`, `pull_forwards`). Agent 3 parses this format. See the prompt for exact structure.

```bash
cat /tmp/agent2/ebook.md | node src/agent-2/scripts/save-ebook.js <episode.id>
```

### Step 3C — Newsletter material

Same pattern with `pass_3_newsletter`. Output the four sections (TOP INSIGHT, SURPRISING STAT, ACTIONABLE TIP, EXERCISE).

```bash
cat /tmp/agent2/newsletter.txt | node src/agent-2/scripts/save-newsletter.js <episode.id>
```

After all three are saved:

```bash
node src/agent-2/scripts/save-pass-3-done.js <episode.id>
node src/agent-2/scripts/log-step.js <episode.id> pass_3 --prompt-name pass_3_ebook
```

---

## Action: `self_review`

Two reviews on the ebook only. Summary and newsletter are too short to score.

### Accuracy review

Build vars: `EXTRACTIONS` (merged extractions), `EBOOK_TEXT` (the ebook).

```bash
node src/agent-2/scripts/get-merged-extractions.js <episode.id> > /tmp/agent2/merged.txt
node -e "
  const c = require('@supabase/supabase-js').createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  c.from('processed_content').select('ebook_content').eq('episode_id', process.argv[1]).single().then(({data}) => require('fs').writeFileSync('/tmp/agent2/ebook.md', data.ebook_content));
" <episode.id>

node -e "
  const fs = require('fs');
  fs.writeFileSync('/tmp/agent2/vars-acc.json', JSON.stringify({
    EXTRACTIONS: fs.readFileSync('/tmp/agent2/merged.txt', 'utf8'),
    EBOOK_TEXT: fs.readFileSync('/tmp/agent2/ebook.md', 'utf8')
  }));
"
node src/agent-2/scripts/load-prompt.js self_review_accuracy --vars /tmp/agent2/vars-acc.json > /tmp/agent2/prompt-acc.txt
```

Perform the accuracy review honestly. Save:

```bash
cat /tmp/agent2/acc-review.txt | node src/agent-2/scripts/save-review.js <episode.id> --kind accuracy
# Exit code 10 = soft fail (rewrite needed); 0 = pass
```

### Writing review

Same pattern with `self_review_writing` (only `EBOOK_TEXT` var needed).

```bash
cat /tmp/agent2/wr-review.txt | node src/agent-2/scripts/save-review.js <episode.id> --kind writing
```

### If either review fails (exit code 10)

You may rewrite the ebook **once** to fix the specific issues called out:
1. Re-read `ebook_content` and the review feedback.
2. Rewrite the ebook addressing the corrections + writing issues.
3. Save the new ebook with `save-ebook.js`.
4. Re-run **both** reviews.
5. If still failing, mark the episode for manual review:
   ```bash
   node src/agent-2/scripts/mark-failed.js <episode.id> "Self-review failed after one rewrite"
   ```

If both pass:

```bash
node -e "
  const c = require('@supabase/supabase-js').createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  c.from('processing_queue').update({ status: 'processing', current_step: 'finalize_pending' }).eq('episode_id', process.argv[1]).then(() => console.log('finalize_pending'));
" <episode.id>
```

---

## Action: `finalize`

```bash
node src/agent-2/scripts/finalize-episode.js <episode.id>
```

Generates the self-rating note from the framework + page count, marks the episode as `draft` (Agent 3 picks it up for PDF generation), and logs the cost summary.

Done — the routine has carried this episode from `queued` to `draft`.

---

## Error handling

If any helper script exits with a non-zero code (other than 10 from `save-review.js`), stop the fire and treat the failure as recoverable — the next fire will retry. If the same step fails twice in a row across consecutive fires, run:

```bash
node src/agent-2/scripts/mark-failed.js <episode.id> "<short explanation>"
```

…and exit. Anton will be emailed.

## Hard rules

- Process **exactly one episode per fire**. Don't try to drain the queue.
- Don't make Anthropic API calls — you ARE the model. The pattern is: load prompt with placeholders → perform the work in your turn → save the result via a CLI script.
- Always save state to the database before doing more work. If the session times out, the next fire resumes from the last saved state.
- Never modify the database schema from a routine. If you need a column that doesn't exist, mark the episode failed with a note explaining what's needed and exit.
- Don't push commits from a routine fire. If you discover a code bug, mark the episode failed with the error and exit; the bug will be fixed in a normal Claude Code session.

## Reference

- Prompt definitions: `src/agent-2/prompts/v1-prompts.js` (active versions live in `prompt_versions` table; routine reads from DB via `load-prompt.js`)
- DB schema: `src/agent-4/supabase/schema.sql` (plus migrations in `src/agent-4/supabase/migrations/`)
- Helper scripts: `src/agent-2/scripts/`
- State map: see comments at the top of `_set-step.js` for valid `current_step` values
