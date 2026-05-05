# Icantlistentothemall — RSS & Transcription Pipeline Spec

## Context
This document covers the technical pipeline that turns podcast episodes into processed content. Companion to the project plan, prompt engineering spec, and PDF branding spec.

---

## Architecture Overview

The pipeline is a background worker that runs on Railway, separate from the Next.js frontend on Vercel. It monitors podcast RSS feeds, detects new episodes, transcribes them via Deepgram, runs them through a three-pass Claude pipeline using the batch API, and publishes the results.

```
RSS Feeds → Monitor (every 6hrs) → Deepgram (transcription) → Claude Batch API (3-pass) → Database → Site + PDF
```

---

## RSS Feed Monitoring

### How It Works
- A cron job runs every 6 hours on the Railway worker
- Checks all subscribed podcast RSS feeds for new episodes
- Compares episode GUIDs against the database to detect unprocessed episodes
- New episodes enter a processing queue

### Episode Filtering
- **Minimum duration: 35 minutes.** Episodes shorter than this are skipped automatically.
- Episodes shorter than 35 minutes are logged and flagged — Anton can manually approve if they look worthwhile.
- Duplicate detection via episode GUID from the RSS feed.

### Subscribing to Podcasts
- Anton adds podcasts via a simple admin interface or database entry
- Each podcast record stores: name, RSS feed URL, assigned accent colour, format tag (interview/solo/panel)
- No public-facing podcast subscription — this is curator-controlled

---

## Audio Handling

### Primary Method: URL Passthrough
Deepgram accepts audio URLs directly. No need to download audio to our servers.

1. Extract the audio file URL from the RSS feed entry
2. Send the URL to Deepgram's API
3. Deepgram fetches and transcribes the audio on their end
4. We receive the transcript — no audio ever touches our infrastructure

This is cleaner, cheaper, and eliminates storage concerns entirely.

### Fallback: Temporary Download
If a podcast host blocks external downloads or uses expiring URLs:
1. Download MP3 to Railway's temporary filesystem
2. Upload to Deepgram via file upload endpoint
3. Delete the audio file immediately after transcription completes
4. Log the fallback for monitoring

Expected that 95%+ of episodes will use the URL passthrough method.

---

## Transcription Service: Deepgram

### Why Deepgram
- Cheaper than Whisper API ($0.0043/min vs $0.006/min)
- Faster processing
- Built-in speaker diarisation (labels who is talking) — critical for interview podcasts
- Accepts audio URLs directly (no download needed)
- Excellent accuracy on professionally produced podcast audio

### Configuration
- Model: Nova-2 (best accuracy for English)
- Speaker diarisation: enabled
- Punctuation: enabled
- Paragraphs: enabled (helps with natural chunking)
- Language: English (expand later if needed)

### Cost
- 2-hour episode: ~$0.52
- 1-hour episode: ~$0.26
- Estimated weekly (10-15 episodes): ~$3-8

### Output Format
Deepgram returns JSON with:
- Full transcript text
- Speaker labels per segment
- Timestamps per word/sentence
- Paragraph breaks

This structured output feeds directly into the Claude pipeline's chunking step.

---

## Claude Pipeline: Batch API

### Why Batch API
- 50% cheaper than real-time API calls
- Pipeline doesn't need instant results — 30-60 minute processing time is fine
- Same quality as real-time, just queued

### Three-Pass Processing

**Pass 1 — Chunk & Extract**
- Split transcript using Deepgram's paragraph breaks and speaker transitions
- Group into logical topic chunks (aim for 8-12 chunks per episode)
- Each chunk sent to Claude with the extraction prompt
- Claude returns: core insights, key facts/stats, actionable advice, notable quotes, topic label
- Calls: 8-12 per episode

**Pass 2 — Structure & Organise**
- All extracted material from Pass 1 combined into one input
- Claude organises into 4-8 chapters with subheaders
- Identifies the logical reading order
- Flags weak sections that may need padding or cutting
- Calls: 1 per episode

**Pass 3 — Write Final Outputs**
Three separate calls:
1. **Quick summary**: 3-5 sentences, follows summary prompt spec
2. **Full ebook content**: 4,000-5,000 words, structured per chapter outline from Pass 2
3. **Newsletter material**: top insight, surprising stat, actionable tip, exercise/challenge — stored for bi-weekly aggregation
- Calls: 3 per episode

**Self-Review Pass**
Each Pass 3 output reviewed by Claude against quality criteria:
- Insight density (target: 7+ out of 10)
- No filler, no repetition, no vague language
- Facts accurate to source transcript
- If below threshold: automatic rewrite (1 retry per output)
- If still below after retry: flag for manual review
- Calls: up to 3 per episode (if all outputs need review), up to 6 if rewrites triggered

### Total Claude Calls Per Episode
- Typical: 15-18 calls
- Worst case (all rewrites): 20-24 calls

### Cost Per Episode (Batch API)
- Estimated: $1-2 per episode (50% batch discount applied)
- Weekly (10-15 episodes): $10-30

---

## Total Cost Per Episode

| Component | Cost (2hr episode) |
|---|---|
| Deepgram transcription | ~$0.52 |
| Claude Batch API (~17 calls) | ~$1.50 |
| Railway worker | ~$0.01 (negligible) |
| Supabase storage | ~$0.00 (free tier) |
| **Total** | **~$2.00** |

### Weekly Estimate (10-15 episodes)
- Low end: ~$20/week
- High end: ~$40/week
- Monthly: ~$80-160

---

## Processing Queue & Orchestration

### Queue Design
- New episodes added to a `processing_queue` table in Supabase
- Status values: `queued` → `transcribing` → `pass_1` → `pass_2` → `pass_3` → `reviewing` → `complete` / `failed`
- Each status transition logged with timestamp for monitoring

### Sequential Processing
- One episode at a time for v1
- Simpler to debug, easier to monitor costs
- No meaningful downside — processing an episode an hour late doesn't matter

### Processing Flow
```
1. Cron fires (every 6 hours)
2. Check RSS feeds for new episodes
3. For each new episode (duration ≥ 35 min):
   a. Add to queue as "queued"
4. Pick next queued episode:
   a. Status → "transcribing"
   b. Send audio URL to Deepgram
   c. Receive transcript with speaker labels
   d. Store raw transcript in DB
   e. Status → "pass_1"
   f. Chunk transcript, run extraction on each chunk
   g. Store extracted insights in DB
   h. Status → "pass_2"
   i. Send all insights to Claude for structuring
   j. Store chapter outline in DB
   k. Status → "pass_3"
   l. Generate summary, ebook content, newsletter material
   m. Store all outputs in DB
   n. Status → "reviewing"
   o. Run self-review on each output
   p. If passes: generate PDF, status → "complete", publish to site
   q. If fails after retry: status → "failed", notify Anton
5. Move to next queued episode
```

---

## Error Handling

### Transcription Failures
- Retry once with 5-minute delay
- If second attempt fails: mark as `failed`, notify Anton via email
- Common causes: expired audio URL (trigger fallback download), rate limiting, audio corruption

### Claude Pipeline Failures
- Retry individual pass once
- If pass fails twice: mark episode as `failed` at that stage, notify Anton
- Store partial results so processing can resume from last successful pass

### Quality Failures (Self-Review)
- Output scores below 7: automatic rewrite (one attempt)
- Still below 7 after rewrite: mark as `needs_review`, notify Anton
- Anton can manually edit or re-trigger processing

### RSS Feed Failures
- Log error, retry next cycle (6 hours)
- If feed fails 3 consecutive cycles (18 hours): notify Anton
- Possible causes: feed URL changed, podcast discontinued, temporary server issues

### Notification Method
- Email to Anton for all failures and review-needed flags
- Simple: no need for a full admin dashboard in v1
- Future: Slack webhook or simple web dashboard

---

## Infrastructure

### Railway (Worker)
- Runs the Node.js background worker
- Handles cron scheduling, queue processing, API calls
- Starter plan: $5/month (more than enough)
- Environment variables: Deepgram API key, Claude API key, Supabase connection string

### Vercel (Frontend)
- Hosts the Next.js site
- Reads from Supabase to display episodes, serve PDFs
- Handles newsletter signup forms
- No pipeline logic here — purely presentation

### Supabase (Database & Storage)
- Tables: podcasts, episodes, transcripts, processed_content, newsletter_material, subscribers, processing_queue
- PDF storage: Supabase Storage bucket for generated ebooks
- Free tier sufficient for launch

---

## Database Schema (Key Tables)

### podcasts
- id, name, rss_feed_url, accent_colour, format_tag (interview/solo/panel), active, created_at

### episodes
- id, podcast_id, guid (from RSS), title, audio_url, duration_seconds, published_at, status, created_at

### processed_content
- id, episode_id, summary_text, ebook_content (full text), ebook_pdf_url, newsletter_insight, newsletter_stat, newsletter_tip, newsletter_exercise, self_review_scores (JSON), published, created_at

### subscribers
- id, email, subscribed_at, unsubscribed_at, active

### processing_queue
- id, episode_id, status, started_at, completed_at, error_log, retry_count

---

## Open Technical Tasks
- [ ] Set up Railway project and worker boilerplate
- [ ] Deepgram account and API key
- [ ] Claude API key and batch API access
- [ ] RSS parser library (e.g., rss-parser for Node.js)
- [ ] Build queue processor with status tracking
- [ ] Implement Deepgram URL passthrough transcription
- [ ] Implement three-pass Claude pipeline with batch API
- [ ] PDF generation from ebook content (using branding spec)
- [ ] Email notification for failures
- [ ] Test end-to-end with one real episode
