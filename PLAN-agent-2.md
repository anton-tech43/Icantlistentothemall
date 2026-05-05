# PLAN — Agent 2: AI Pipeline

## Overview

Agent 2 owns the entire content processing pipeline: from receiving a queued episode with an audio URL, through transcription, extraction, structuring, writing, self-review, and finally publishing content to the database for Agent 3 (PDF) and Agent 5 (newsletter) to consume.

---

## Build Order

### Task 1: Prompt Versioning System + Seed v1 Prompts
**Priority:** First task — nothing else runs without this.

Build:
- Utility to insert prompt versions into `prompt_versions` table
- Seed script that loads all 9 v1 prompts from the AI Strategy spec:
  1. `pass_1_extraction`
  2. `pass_1_alternative`
  3. `pass_1_comparison`
  4. `pass_2_structure`
  5. `pass_3_summary`
  6. `pass_3_ebook`
  7. `pass_3_newsletter`
  8. `self_review_accuracy`
  9. `self_review_writing`
- Helper function: `getActivePrompt(prompt_name)` — returns the active prompt text for a given name
- Rule: every pipeline log entry references the `prompt_version_id` used

**Tables:** Write to `prompt_versions`

**Dependency:** Agent 4 must have created the Supabase schema first.

---

### Task 2: Pipeline Scaffolding & Logging Framework
**Priority:** Foundation for all subsequent work.

Build:
- Pipeline orchestrator: picks next `queued` episode from `processing_queue`, runs it through all steps sequentially
- Status management: updates `processing_queue.status` and `processing_queue.current_step` at each transition
- Structured logging: every pipeline step writes to `pipeline_logs` with timing, tokens, cost, status
- Cost tracking: every API call writes to `cost_tracking` with service, operation, cost
- Cost ceiling checks:
  - Before each step: check episode cumulative cost < $8
  - Before processing a new episode: check weekly cumulative cost < $30
  - If exceeded: set status to `cost_exceeded`, stop processing
- Retry logic with exponential backoff:
  - External services (Deepgram, Claude): 4 attempts (immediate, 5min, 30min, 2hr), then `waiting_for_service`
  - Logic errors: 1 retry, then `failed`
- Crash recovery: on startup, check for episodes in intermediate states and resume from last completed step
- Error handling: all failures logged with full error trace

**Tables:** Write to `pipeline_logs`, `cost_tracking`, `processing_queue`

---

### Task 3: Deepgram Transcription Integration
**Priority:** Phase 2 — first step in the actual content pipeline.

Build:
- Accept episode from queue (status `queued` → `transcribing`)
- Send audio URL to Deepgram via URL passthrough
  - Model: Nova-2
  - Options: punctuate, paragraphs, diarize, smart_format, language=en
- Parse Deepgram response: extract full text, speaker labels, timestamps, paragraph breaks
- Store in `transcripts` table: raw_text, speaker_labels (JSONB), deepgram_metadata (JSONB)
- Log: audio duration, transcription time, word count, speakers detected

**Tables:** Write to `transcripts`, update `processing_queue`, write to `pipeline_logs` and `cost_tracking`

**Dependency:** Agent 1 must have episodes in queue with audio URLs. For testing, I can manually insert test episodes.

---

### Task 4: Transcript Chunking Algorithm
**Priority:** Immediately after transcription.

Build:
- Chunking function that takes a transcript with Deepgram timestamps and speaker labels
- Parameters:
  - Target: 2,500 words
  - Min: 1,500 words
  - Max: 3,500 words
  - Max time span: 12 minutes
  - Overlap: 200 words between consecutive chunks
- Split point priority:
  1. Speaker transition after 3+ minutes of one speaker
  2. Deepgram paragraph break after topic shift
  3. Any paragraph break near target size
  4. Sentence boundary nearest to target (last resort)
- Rules:
  - Never split mid-sentence
  - If final chunk < 1,500 words, merge with previous
  - Mark overlap regions for deduplication
- Store chunks as JSONB array in `transcripts.chunks` (word counts, timestamps, chunk text)

**Tables:** Update `transcripts.chunks`

---

### Task 5: Pass 1 — Dual Extraction + Comparison + Merge
**Priority:** Phase 2 core.

Build:
- For each chunk, make 3 Claude API calls (using Batch API):
  1. **Standard extraction** (Instance A) — prepend podcast_context from `podcasts.podcast_context`
  2. **Alternative extraction** (Instance B) — contrarian angle prompt
  3. **Comparison** — agreement score, consensus/unique insights, stronger instance, merged extraction
- Parse comparison output:
  - Agreement ≥ 7: auto-proceed
  - Agreement 5-6: proceed with flag (log it)
  - Agreement < 5: pause, set status to `needs_review`
- Quality threshold check: count total insights across all chunks
  - ≥ 6 insights: proceed
  - < 6 insights: flag for Anton, pause processing
- Combine all merged extractions into a single document for Pass 2
- Store in `processed_content`:
  - `pass_1_insight_count`
  - `pass_1_agreement_score` (average across chunks)
  - `pass_1_divergent_insights` (JSONB)
  - `pass_1_stronger_instance` (A or B — which was preferred more often)
- Track dual-Claude preferences in `pipeline_logs` per chunk

**Tables:** Write to `processed_content`, `pipeline_logs`, `cost_tracking`; update `processing_queue` status to `pass_1`

---

### Task 6: Outline Review Email to Anton
**Priority:** Needed before Pass 2 can proceed.

Build:
- After Pass 2 generates the outline, send an email to Anton with:
  - Episode title, guest, podcast
  - Chapter outline with subheaders
  - One-line summary per chapter
  - Framework selected and justification
  - Estimated page count
  - Any gaps flagged
- Processing pauses until Anton approves (manual status update in DB or a simple approval endpoint)
- Store approval status in `processed_content.pass_2_outline_approved` and `pass_2_outline_edited`

**Question:** Should I use Resend directly (same as Agent 5), or is there a simpler email approach you prefer for these operational emails? Agent 5 owns the Resend integration, but I need to send emails independently.

---

### Task 7: Pass 2 — Framework Selection & Outline Generation
**Priority:** Phase 3.

Build:
- Single Claude call per episode
- Input: all merged extractions from Pass 1 + episode metadata
- Prompt includes all 5 framework descriptions
- Parse output:
  - Framework selected
  - Chapter outline (titles, subheaders, pull-forwards, summaries)
  - Estimated page count (4-10)
  - Gaps/concerns
- Store in `processed_content.pass_2_framework_selected`
- Trigger outline review email (Task 6)
- Wait for approval before proceeding to Pass 3

**Tables:** Write to `processed_content`, `pipeline_logs`, `cost_tracking`; update `processing_queue` status to `pass_2`

---

### Task 8: Pass 3 — Summary, Ebook, Newsletter Material
**Priority:** Phase 3, after outline approval.

Build 3 separate Claude calls per episode:

1. **Summary** — 3-5 sentences, uses summary prompt
   - Store in `processed_content.summary_text`

2. **Ebook** — full content following approved outline and selected framework
   - Anti-slop rules included in this prompt (not in extraction/structuring prompts)
   - Store in `processed_content.ebook_content`

3. **Newsletter material** — 4 pieces extracted
   - Store in `processed_content.newsletter_insight`, `newsletter_stat`, `newsletter_tip`, `newsletter_exercise`

**Tables:** Write to `processed_content`, `pipeline_logs`, `cost_tracking`; update `processing_queue` status to `pass_3`

---

### Task 9: Self-Review (Two-Pass)
**Priority:** Phase 3, after Pass 3.

Build:

**Review 1: Content Accuracy** (applied to ebook)
- Input: all Pass 1 extractions + ebook content
- Check: coverage of top insights, factual accuracy, fabrication
- Score: 1-10
- Threshold: ≥ 7 to pass

**Review 2: Writing Quality** (applied to ebook)
- Score on 5 dimensions: directness, rhythm, trust, authenticity, density
- Each 1-10, total /50
- Threshold: ≥ 35 to pass

**If either fails:**
- One automatic rewrite attempt with corrections noted
- Re-run the failing review
- If still fails: mark as `needs_review`, alert Anton

**Store in `processed_content`:**
- `self_review_scores` (JSONB with all dimension scores)
- `self_review_accuracy_score`
- `self_review_rewrites` (count)

**Self-rating note generation:**
- After reviews pass, generate a transparency note for the ebook (e.g., "This was a dense, focused conversation...")
- Store in `processed_content.self_rating_note`

**Tables:** Write to `processed_content`, `pipeline_logs`, `cost_tracking`; update `processing_queue` to `reviewing` then `complete`; update `episodes.status` to `draft`

---

### Task 10: Dual-Claude Preference Tracking & Auto-Analysis
**Priority:** Phase 3, after 10 episodes processed.

Build:
- Query to analyze which instance (A or B) is preferred after 10 episodes
- Decision logic:
  - A preferred 8+ of 10: recommend dropping B
  - Split 6/4 or closer: keep both
  - B preferred 7+: consider making B primary
- Auto-send analysis results to Anton via email
- This runs after every 10th episode processed

**Tables:** Read from `pipeline_logs`, `processed_content`

---

### Task 11: A/B Testing Mode for Prompts
**Priority:** Phase 4 (lower priority, nice-to-have for prompt iteration).

Build:
- Ability to flag a prompt for A/B testing: run one episode through both the active version and a candidate version
- Store both outputs as drafts with prompt version labels
- Anton reviews and picks the winner
- If candidate wins: set as active

---

## Database Tables I Read From

| Table | What I Read | Owner |
|---|---|---|
| `podcasts` | `podcast_context`, `format_tag`, `name` | Agent 1 |
| `episodes` | `title`, `audio_url`, `podcast_id`, `duration_seconds` | Agent 1 |
| `processing_queue` | Next queued episode | Agent 1 creates entries |

## Database Tables I Write To

| Table | What I Write |
|---|---|
| `prompt_versions` | All prompt texts, versions, active flags |
| `transcripts` | Raw transcript, speaker labels, chunks |
| `processed_content` | All content outputs, quality metrics, newsletter material |
| `pipeline_logs` | Every step's timing, tokens, cost, status |
| `cost_tracking` | Every API call's cost breakdown |
| `processing_queue` | Status updates through all pipeline stages |
| `episodes` | Status updates (transcribing → pass_1 → ... → draft) |

---

## Dependencies on Other Agents

| Agent | What I Need | Blocking? |
|---|---|---|
| Agent 4 | Supabase schema created (all tables) | Yes — can't seed prompts without tables |
| Agent 1 | Episodes in `processing_queue` with audio URLs and `podcasts.podcast_context` populated | Yes — can't process without input |

## What Other Agents Need From Me

| Agent | What They Need | Table/Field |
|---|---|---|
| Agent 3 | `ebook_content`, `self_rating_note`, `pass_2_framework_selected`, `final_page_count` | `processed_content` |
| Agent 5 | `newsletter_insight`, `newsletter_stat`, `newsletter_tip`, `newsletter_exercise` | `processed_content` |

---

## Cross-Agent Decision (2026-04-16)

- **Ebook content format:** `processed_content.ebook_content` is structured Markdown. `# Chapter 1: Title` for chapters, `## Subheader` for sections, `> "Quote text" — Attribution` for pull quotes. YAML front matter block at top with: `guest_name`, `framework`, `pull_forwards` (list per chapter). Agent 3 parses this format.
- **New field:** `processed_content.guest_name` — extracted during Pass 2 from episode metadata and transcript. Schema change logged in PROJECT-STATUS.md.

---

## Resolved Questions (Answers from Anton — 2026-04-16)

1. **Batch API vs Real-Time API:** Use real-time API for Pass 2 (outline review email) only — Anton needs to see it promptly. Use Batch API (`/v1/messages/batches`) for everything else (Pass 1, Pass 3, self-reviews). One real-time call is negligible cost difference.

2. **Email sending:** Use Resend API directly with a minimal `sendAlertEmail(subject, body)` utility. Plain text to Anton's email. Don't share templates or subscriber logic with Agent 5.

3. **Self-review scope:** Ebook only. Summary is too short to score. Newsletter material is extracted bullet points, not prose. The ebook is the product.

4. **Self-rating note:** Template-based, not a prompt. 5-6 variants tied to framework + page count. No API call needed.

5. **Outline approval:** Email includes full outline text + two links: "Approve" and "Flag for review". Both hit API endpoints on Railway worker. Approve triggers Pass 3 automatically. Flag pauses processing.

6. **Per-chunk extraction storage:** Store in `transcripts.chunks` JSONB — each chunk entry gets its extractions appended after Pass 1. Merged extraction goes into `pipeline_logs.metadata` for the comparison step.

7. **Batch API access:** Confirmed available on standard API plan. Use `/v1/messages/batches` endpoint.
