# Icantlistentothemall — Pre-Build Spec (Agent Assignments & Final Details)

## Context
This is the final document before development begins. It covers three remaining gaps: the transcript chunking strategy, the PDF download flow (updated: no email gate), and clear agent assignments so each agent knows exactly what to build and what not to touch. Read this document last, after all other specs.

---

## Document Index (Complete Spec Library)

| # | Document | What It Covers |
|---|---|---|
| 1 | Project Plan | Overview, tech stack, build phases |
| 2 | Prompt Engineering Spec | Editorial pipeline, output specs, anti-slop rules |
| 3 | Pipeline Spec | RSS, Deepgram, Claude batch API, costs, errors |
| 4 | Newsletter Spec | Resend, subscriber flow, GDPR, automation |
| 5 | Risk Mitigation & Content Frameworks | Quality gates, dual-Claude, five frameworks |
| 6 | Design System (Manuscript Edition) | Unified visual identity across all touchpoints |
| 7 | Technical Addendum | Observability, cost controls, resilience, backups, staging |
| 8 | AI Strategy | Real prompts, podcast contexts, versioning, split self-review |
| 9 | Pre-Build Spec (this document) | Chunking, download flow, agent assignments |

---

## 1. Transcript Chunking Strategy

### The Problem
A 2-hour podcast transcript is roughly 20,000-30,000 words. This must be split into chunks for Pass 1 extraction. Chunk quality directly affects extraction quality. Too small: Claude loses context. Too big: Claude gets overwhelmed and misses insights. Bad split points: important ideas get cut in half.

### Chunk Parameters
- **Target chunk size: 2,500 words** (roughly 8-10 minutes of conversation)
- **Minimum chunk size: 1,500 words** (don't create tiny fragments)
- **Maximum chunk size: 3,500 words** (don't let any chunk get too large for focused extraction)
- **Maximum time span per chunk: 12 minutes** — if a chunk exceeds 12 minutes of transcript even if under the word limit, split it. This prevents a single slow-speaking segment from becoming an oversized chunk of content.
- **Overlap: 200 words** — each chunk includes the last 200 words of the previous chunk as context. This prevents insights that span a split point from being lost.

### Split Point Priority
When deciding where to split, use this priority order:

1. **Speaker transition after a long segment** — when the conversation shifts from one speaker to another after one speaker has been talking for 3+ minutes. This is usually a natural topic boundary.
2. **Deepgram paragraph break after a topic shift** — when Deepgram detects a paragraph break and the content before/after is clearly on different topics.
3. **Any Deepgram paragraph break near the target size** — if no clear topic shift exists, split at the nearest paragraph break to the 2,500-word target.
4. **Sentence boundary nearest to target** — last resort if paragraph breaks are sparse.

Never split mid-sentence.

### Chunking Algorithm
```
1. Receive full transcript with Deepgram timestamps and speaker labels
2. Walk through transcript, tracking word count and speaker changes
3. At each potential split point (speaker change or paragraph break):
   a. Is word count ≥ 2,000? → consider splitting here
   b. Is word count ≥ 3,500? → force split at nearest sentence boundary
   c. Has time exceeded 12 minutes? → force split at nearest sentence boundary
4. When splitting:
   a. End current chunk
   b. Start next chunk with 200-word overlap from end of previous chunk
   c. Mark the overlap region so extraction can deduplicate if needed
5. If final chunk is < 1,500 words, merge it with the previous chunk
```

### Post-Chunking: Merge Related Insights
After Pass 1 extracts insights from all chunks, the comparison/merging step (already in the pipeline) deduplicates insights that appear in multiple chunks. If two chunks discuss the same subject (which happens when a guest returns to a topic), the merged extraction combines them into a single, stronger insight rather than listing duplicates.

This is handled naturally by the Pass 2 structuring prompt, which receives all extracted material and organises by theme. But the extraction prompt should also flag when it sees a topic that was likely discussed in an adjacent chunk:

Add to the extraction prompt output format:
```
CONTINUED TOPIC: [Yes/No] — Does this chunk appear to continue or revisit a topic from earlier in the conversation? If yes, note the topic so it can be merged with related extractions.
```

---

## 2. PDF Download Flow (Updated: No Email Gate)

### Decision
PDF downloads are free and immediate. No email required. No gate, no friction. People subscribe to the newsletter because they want it, not because they were forced to trade their email for content.

This aligns with the brand: honest, no tricks, everything is free.

### How Downloads Work
1. Visitor clicks "Get the e-book ↓" on any episode card or detail page
2. PDF download begins immediately in the browser
3. No modal, no form, no popup. One click, instant download.

### Tracking Downloads (Without Email Gate)
Since we're not capturing emails at download, we track downloads via analytics:
- Plausible/Umami tracks "download" click events per episode
- Each download button has a data attribute with the episode ID
- Weekly digest reports top downloaded episodes

### Subscriber Acquisition (Without Email Gate)
The email gate was the highest-impact growth mechanism. Without it, the remaining touchpoints must work harder:

**Primary touchpoints (highest conversion potential):**
- Signup form on every episode detail page (below the free content): "Want insights like this every two weeks? your email →"
- Newsletter CTA on the last page of every PDF: "icantlistentothemall.com/newsletter"
- Sticky signup bar on all pages

**Secondary touchpoints:**
- Homepage signup form
- Newsletter landing page (/newsletter)
- Newsletter archive pages with signup forms
- Exit intent popup (desktop only)
- About page signup form

**The key insight:** every PDF becomes a newsletter acquisition channel. Someone downloads an ebook, reads it, sees the CTA on the last page, visits the newsletter signup. If the ebook was good, they subscribe. Quality content drives growth instead of a gate. This is slower but produces higher-quality subscribers who actually want the newsletter.

### Updated Episode Detail Page Layout

```
[top nav]



        The Pricing Framework Most Founders Get Wrong

        Alex Hormozi · The Game Podcast
        Episode aired: March 12, 2026 · Duration: 1hr 42min
        8 pages · The Big Idea



        -------



        [Summary — 3-5 sentences, monospaced]



        -------



        What's inside:

        1. The problem with cost-based pricing
        2. The value equation
        3. Handling the "it's too expensive" objection
        4. Rethinking free trials



        -------



        This was a focused conversation. The ebook captures the
        core framework and its practical applications.



        Get the e-book ↓
        (immediate download, no email, no friction)



        -------



        Surprising stat from this episode:
        [1-2 sentences]

        Something you can do today:
        [actionable tip]

        Reflect on this:
        [exercise/challenge]



        -------



        Want insights like this every two weeks?
        your email →



        [footer]
```

---

## 3. Agent Assignments

Five agents, each with a clear scope. Each agent receives only the documents relevant to their work. Agents must not build anything outside their assigned scope.

---

### Agent 1: RSS Monitor & Audio Acquisition

**What you build:**
- RSS feed parser and monitor
- Cron job that checks feeds every 6 hours
- Episode detection, deduplication (GUID + fallback hash), and filtering (≥ 35 minutes, skip trailers/reruns)
- Audio acquisition: Deepgram URL passthrough as primary, temporary download as fallback
- Episode queue management (adding new episodes to the processing queue)
- Feed health monitoring (consecutive failure tracking, stale feed detection)
- Podcast subscription management (adding/removing podcasts, storing metadata)

**What you do NOT build:**
- Transcription processing (you hand the audio URL to Agent 2's pipeline)
- Any Claude API calls
- Any frontend pages
- PDF generation
- Email sending

**Reference material:**
- Pipeline Spec (sections: RSS Feed Monitoring, Audio Handling)
- Technical Addendum (sections: RSS Parser Robustness, Retry Strategy)
- AI Strategy (section: Podcast-Level Context Descriptions — store these per podcast)
- Podgrab repo (https://github.com/akhilrex/podgrab) — reference for RSS parsing patterns, audio URL extraction, and download resilience. Do not run Podgrab as a service. Study its approach to enclosure parsing, feed quirks, and retry logic, and implement equivalent patterns in Node.js.

**Database tables you own:**
- podcasts
- episodes (creation and status updates through the queueing stage)
- processing_queue (creation of new entries)

**Key decisions already made:**
- Episode GUID is the primary dedup key; fall back to title + date hash if missing
- Duration parsed from `<itunes:duration>` (handle seconds, HH:MM:SS, MM:SS formats); estimate from file size if missing
- Filter out episodes with titles containing: "trailer", "teaser", "best of", "rerun", "replay", "bonus" (case-insensitive)
- Feed health: alert after 3 consecutive failures (18 hours); auto-update URL on HTTP redirect; flag feeds with no new episodes for 30 days
- Audio acquisition: try Deepgram URL passthrough first; on failure, download temporarily to local filesystem, upload to Deepgram, delete file after transcription succeeds

**Startup task:** Before building the full monitor, write a standalone RSS parser test that runs against the actual feeds of these 5 podcasts: Diary of a CEO, My First Million, The Tim Ferriss Show, The Game w/ Alex Hormozi, Lenny's Podcast. Document the quirks of each feed in a markdown file. This test must pass before building the cron job.

---

### Agent 2: AI Pipeline (Transcription → Extraction → Structuring → Writing)

**What you build:**
- Deepgram transcription integration (receives audio URL from Agent 1's queue)
- Transcript chunking (2,500-word target chunks with 200-word overlap, 12-minute max per chunk)
- Pass 1: dual-Claude extraction (standard + alternative prompts, comparison, auto-merge)
- Quality threshold check (< 6 insights → flag for review)
- Pass 2: framework selection and chapter outline generation
- Pass 3: summary, ebook content, and newsletter material generation
- Self-review: content accuracy review + writing quality review (split two-pass)
- Prompt versioning (store all prompts in prompt_versions table, reference version in every log)
- Pipeline orchestration: sequential processing, status tracking through all stages
- Cost tracking per step and per episode
- Cost ceiling enforcement ($8 per episode, $30 per week)
- All pipeline logging (step timing, token counts, costs, scores)
- Outline review email notification to Anton (after Pass 2)
- A/B testing mode for prompt iteration
- Dual-Claude preference tracking and auto-analysis after 10 episodes

**What you do NOT build:**
- RSS parsing or audio downloading (Agent 1 handles this)
- PDF generation (Agent 3 handles this)
- Any frontend pages (Agent 4 handles this)
- Newsletter sending or subscriber management (Agent 5 handles this)

**Reference material:**
- Prompt Engineering Spec (full document)
- AI Strategy (full document — contains the actual prompts to implement)
- Risk Mitigation & Content Frameworks (full document)
- Pipeline Spec (sections: Claude Pipeline, Processing Queue & Orchestration)
- Technical Addendum (sections: Cost Controls, Observability layers 1-2, Retry Strategy, Staging)
- Pre-Build Spec / this document (section: Transcript Chunking Strategy)

**Database tables you own:**
- transcripts
- processed_content
- pipeline_logs
- cost_tracking
- prompt_versions
- processing_queue (status updates from transcription through to completion)

**Key decisions already made:**
- Use Claude batch API (50% cheaper, latency doesn't matter)
- Sequential processing (one episode at a time)
- Dual-Claude extraction for the first 30 episodes, with automated preference tracking; phase out when data supports it
- Comparison threshold: agreement ≥ 7 auto-proceeds, 5-6 proceeds with flag, < 5 pauses for review
- Quality threshold: < 6 insights after extraction → flag for Anton
- Self-review is two passes: content accuracy (threshold: 7/10) then writing quality (threshold: 35/50)
- Anti-slop rules are included only in Pass 3 writing prompts and writing quality review, NOT in extraction or structuring prompts
- Prompt versions stored in database; every log entry references which version was used
- Cost caps: $8/episode kill switch, $30/week pause
- Pass 3 ebook output: 4-10 pages, never pad, quality over length
- Five frameworks available: Big Idea, Playbook, Founder's Lesson, Contrarian Take, Three Things Worth Knowing

**Startup task:** Before building the pipeline, implement prompt versioning and seed the prompt_versions table with all v1 prompts from the AI Strategy document. Every subsequent pipeline step must reference a prompt version. This must be in place before any content processing begins.

---

### Agent 3: PDF Generation

**What you build:**
- HTML template for the ebook (manuscript aesthetic)
- Puppeteer integration to convert HTML to PDF
- Cover page rendering (title, guest, podcast, framework label, page count)
- Page two rendering (self-rating note, chapter list)
- Chapter opener rendering (chapter number, title, pull-forward sentence)
- Body page rendering (subheaders, body text, pull quotes with accent colour border)
- Last page rendering (newsletter CTA)
- Page break management (chapters start on new pages, no orphan lines)
- Accent colour system (thin coloured line on chapter openers, coloured left border on pull quotes)
- PDF storage in Supabase Storage
- PDF URL generation for download links

**What you do NOT build:**
- Content generation (Agent 2 provides the text)
- Any Claude API calls
- Any frontend pages (Agent 4 handles the site)
- RSS parsing or audio handling
- Email sending

**Reference material:**
- Design System / Manuscript Edition (full document — especially the ebook PDF design section)
- Risk Mitigation & Content Frameworks (section: Content Frameworks — understand the five framework structures)
- Technical Addendum (section: PDF Generation Phased Approach)

**Database tables you own:**
- None directly — you read from processed_content and write the PDF URL back to it

**Key decisions already made:**
- Phase 1 (launch): monospaced font throughout, no serif body text yet. Simple, clean, manuscript-style. Get it working first.
- Phase 2 (month 2-3): introduce Lora serif for body text, refine spacing, better page breaks
- Use Puppeteer on Railway worker (not Vercel serverless — timeout too short)
- Build the HTML template first, get it looking right in a browser, then use Puppeteer to print to PDF
- White background, black text, accent colour only as thin lines and pull quote borders
- Page numbers monospaced, bottom right, no footer URL
- The self-rating note and chapter list live on page two (the "back cover")
- Each chapter opener has a pull-forward sentence in monospaced type
- Every PDF's last page has the newsletter CTA: "icantlistentothemall.com/newsletter"

**Startup task:** Build one complete PDF from hardcoded test content BEFORE Agent 2's pipeline is ready. Use a real episode's content (from the manual prompt test). Get the manuscript aesthetic right in the browser, then confirm Puppeteer renders it identically. This is the most likely step to become a time sink — identify problems early.

---

### Agent 4: Website (Next.js Frontend)

**What you build:**
- Next.js project on Vercel
- Homepage (manuscript aesthetic: dialogue, one-line explanation, three navigation links, signup form)
- E-books page (/ebooks) with podcast filtering and "load more"
- Episode detail page (/ebooks/[slug]) with summary, chapter list, self-rating, download button, newsletter material, signup form
- Quick summaries page (/summaries) — text feed of all summaries
- Newsletter page (/newsletter) with signup form, past issue preview, archive list
- Newsletter archive pages (/newsletter/archive/[slug]) with signup forms
- About page (/about) with dialogue opener and signup form
- Privacy page (/privacy)
- 404 page with dialogue
- Global navigation (top nav: logo, Episodes, Newsletter, About)
- Global footer
- Sticky signup bar (bottom on mobile, top on desktop, hidden after signup via cookie)
- Exit intent popup (desktop only, once per visit via cookie)
- Newsletter signup form component (reused across all pages)
- Signup form submission → Next.js API route → Supabase
- PDF download click tracking (Plausible/Umami events)
- Open Graph image generation for social sharing (white background, black monospaced text)
- SEO: meta tags, structured data, sitemap generation
- Static generation / ISR for episode pages
- Mobile-first responsive design
- Plausible or Umami analytics integration

**What you do NOT build:**
- Backend pipeline (Agent 2 handles all content generation)
- PDF generation (Agent 3 handles this)
- RSS parsing (Agent 1 handles this)
- Email sending (Agent 5 handles newsletter delivery)
- Any Claude API calls
- Subscriber confirmation flow backend (Agent 5 handles double opt-in emails)

**Reference material:**
- Design System / Manuscript Edition (full document — this is your primary reference)
- Newsletter Spec (section: Subscriber Flow — understand the signup mechanics)
- Pre-Build Spec / this document (section: PDF Download Flow — no email gate, immediate download)

**Database tables you read from:**
- episodes (published episodes)
- processed_content (summaries, chapter lists, self-ratings, PDF URLs, newsletter material)
- podcasts (names, accent colours)
- newsletters (for archive pages)

**Database tables you write to:**
- subscribers (new signups from forms — status: pending, with confirmation_token)

**Key decisions already made:**
- Manuscript aesthetic: monospaced type, black on white, massive whitespace, underlined links, no decoration
- PDF downloads are free and immediate — no email gate, no modal, one click
- The dialogue device appears on: homepage, newsletter page, about page, 404 page, confirmation email, welcome email
- System monospaced fonts on the site (JetBrains Mono or fallback to Courier)
- Episode cards show: title, podcast name with accent colour dot, page count, framework label
- Episode detail pages show: full summary, chapter list, self-rating note, download link, newsletter material, signup form
- Signup forms: email field only, monospaced, "→" as submit indicator, no button with fills
- Sticky bar: "Get the bi-weekly newsletter: your email →"
- Exit intent popup: clean, minimal, monospaced, desktop only, once per visit
- Social proof counter only shown when subscriber count exceeds 500

**Startup task:** Build the homepage first. Get the manuscript aesthetic nailed — the dialogue, the whitespace, the monospaced type, the signup form. This page sets the standard for every other page. Do not start other pages until the homepage feels right.

---

### Agent 5: Newsletter & Email System

**What you build:**
- Resend account integration
- React Email template (manuscript aesthetic: monospaced, black on white, no images except text logo)
- Double opt-in flow:
  - Confirmation email ("One click and you'll stop pretending you'll get to all those podcast episodes")
  - Confirmation API route (marks subscriber as active, stores consent timestamp)
  - "You're in" confirmation page redirect
- Welcome email (with links to 3 most recent ebooks)
- Newsletter generation cron (bi-weekly, flag-based not time-based)
- Newsletter generation: pull episodes where newsletter_included = false, send to Claude for newsletter content
- Newsletter Claude call: generates four sections + 3 subject line candidates
- Newsletter self-review (accuracy + writing quality)
- Newsletter draft storage and Anton notification email
- Newsletter approval flow (Anton approves → send to all active subscribers)
- Newsletter sending via Resend to all active subscribers
- Mark episodes as newsletter_included = true after send
- Unsubscribe handling (Resend handles headers, update subscriber status in Supabase)
- Subscriber cleanup cron (delete unsubscribed emails after 30 days)
- Nightly database backup (export critical tables to JSON, send as email attachment to Anton)
- Weekly operational digest email to Anton
- All alert emails (cost caps, quality degradation, feed failures, worker stalls)

**What you do NOT build:**
- Frontend signup forms (Agent 4 builds these, you receive the data)
- PDF generation
- RSS parsing
- The main content pipeline (Agent 2 handles transcription through writing)
- Any frontend pages

**Reference material:**
- Newsletter Spec (full document)
- Technical Addendum (sections: Observability layers 4-5, Data Backup Strategy, Newsletter Episode Tracking)
- Design System / Manuscript Edition (section: Newsletter Email Design)
- AI Strategy (section: Pass 3 Newsletter Material Extraction Prompt — for the newsletter generation Claude call)

**Database tables you own:**
- subscribers (status management: pending → active → inactive)
- newsletters (draft creation, approval status, send tracking)

**Database tables you read from:**
- processed_content (newsletter material for generation, ebook links for welcome email)
- episodes (episode metadata for newsletter content)
- pipeline_logs (for weekly digest)
- cost_tracking (for weekly digest and alerts)
- podcasts (for feed failure alerts)

**Key decisions already made:**
- Newsletter is flag-based, not time-based: pull all episodes where newsletter_included = false
- Skip newsletter if fewer than 3 episodes available (notify Anton)
- Newsletter sections: TOP INSIGHT, SURPRISING STAT, DO THIS TODAY, REFLECT ON THIS
- Dialogue header rotates each issue
- Claude generates 3 subject line candidates; system auto-selects the most specific one
- Manual approval for first 10-15 issues; switch to auto-send after confidence is built
- Confirmation and welcome emails use the manuscript voice / dialogue device
- React Email compiled to HTML for bulletproof rendering
- System monospaced font in emails (Courier New as universal fallback)
- GDPR: double opt-in mandatory, consent timestamps stored, unsubscribe instant and one-click, unsubscribed emails deleted after 30 days
- Nightly backup: export subscribers, podcasts, episodes, processed_content to JSON, email to Anton
- Weekly backup: also include transcripts table
- Weekly digest: every Monday 9am, pipeline stats + quality scores + site metrics + health status

**Startup task:** Set up Resend, build the confirmation email and welcome email templates first. Test the full double opt-in flow (signup → confirmation email → click → active subscriber → welcome email) before building the newsletter generation system.

---

## Build Order

The agents can work in parallel on some tasks, but certain dependencies must be respected.

### Phase 1: Foundations (all agents, parallel)
- **Agent 1:** RSS parser test against 5 real podcast feeds
- **Agent 2:** Seed prompt_versions table with all v1 prompts; build pipeline scaffolding and logging
- **Agent 3:** Build one complete test PDF from hardcoded content
- **Agent 4:** Build homepage with manuscript aesthetic; set up Supabase schema
- **Agent 5:** Set up Resend; build confirmation + welcome email flow

### Phase 2: Core Pipeline (sequential dependencies)
- **Agent 1:** Build full RSS monitor + audio acquisition → feeds episodes into queue
- **Agent 2:** Build transcription → chunking → Pass 1 extraction (depends on Agent 1 having episodes in queue)
- **Agent 3:** Refine PDF template based on real content from Agent 2's test runs

### Phase 3: Content Generation
- **Agent 2:** Build Pass 2 (structuring) + Pass 3 (writing) + self-review + cost tracking
- **Agent 3:** Build PDF generation from Agent 2's output → store PDF URLs in Supabase
- **Agent 4:** Build episode detail pages and ebooks listing page (depends on data from Agent 2 + Agent 3)

### Phase 4: Newsletter & Polish
- **Agent 5:** Build newsletter generation cron + approval flow + sending
- **Agent 4:** Build newsletter page, archive pages, quick summaries page, about page, privacy page
- **Agent 4:** Add sticky signup bar, exit intent popup, download tracking
- **Agent 5:** Build nightly backup, weekly digest, alert system

### Phase 5: Pre-Launch
- **Agent 2:** Process 10 back-catalogue episodes through full pipeline
- **All agents:** End-to-end test: RSS detection → transcription → extraction → structuring → writing → PDF → published on site → newsletter generation
- **Agent 4:** Final mobile responsiveness pass
- **Agent 5:** Test full subscriber flow end-to-end

---

## Supabase Schema (Final Consolidated)

This is the single source of truth for the database schema. All agents reference this.

### podcasts
```sql
id              UUID PRIMARY KEY
name            TEXT NOT NULL
rss_feed_url    TEXT NOT NULL
accent_colour   TEXT NOT NULL (hex code)
format_tag      TEXT NOT NULL (interview / solo / panel)
podcast_context TEXT (prompt context for extraction — from AI Strategy doc)
active          BOOLEAN DEFAULT true
last_successful_fetch  TIMESTAMP
consecutive_failures   INTEGER DEFAULT 0
created_at      TIMESTAMP DEFAULT now()
```

### episodes
```sql
id              UUID PRIMARY KEY
podcast_id      UUID REFERENCES podcasts(id)
guid            TEXT (from RSS)
guid_hash       TEXT (fallback: hash of title + published_at)
title           TEXT NOT NULL
audio_url       TEXT NOT NULL
duration_seconds INTEGER
duration_source TEXT (parsed / estimated / unknown)
published_at    TIMESTAMP
status          TEXT NOT NULL (queued / transcribing / pass_1 / pass_2 / pass_3 / reviewing / draft / published / failed / skipped / cost_exceeded / waiting_for_service)
skip_reason     TEXT
created_at      TIMESTAMP DEFAULT now()
UNIQUE(podcast_id, guid)
UNIQUE(podcast_id, guid_hash)
```

### transcripts
```sql
id              UUID PRIMARY KEY
episode_id      UUID REFERENCES episodes(id)
raw_text        TEXT NOT NULL
speaker_labels  JSONB
deepgram_metadata JSONB
chunks          JSONB (array of chunked transcript segments with word counts and timestamps)
created_at      TIMESTAMP DEFAULT now()
```

### processed_content
```sql
id              UUID PRIMARY KEY
episode_id      UUID REFERENCES episodes(id)
summary_text    TEXT
ebook_content   TEXT
ebook_pdf_url   TEXT
self_rating_note TEXT
final_page_count INTEGER
-- Newsletter material
newsletter_insight    TEXT
newsletter_stat       TEXT
newsletter_tip        TEXT
newsletter_exercise   TEXT
newsletter_included   BOOLEAN DEFAULT false
-- Quality metrics
pass_1_insight_count     INTEGER
pass_1_agreement_score   INTEGER (1-10, nullable after dual-Claude phase-out)
pass_1_divergent_insights JSONB
pass_1_stronger_instance  TEXT (A or B)
pass_2_framework_selected TEXT
pass_2_outline_approved   BOOLEAN
pass_2_outline_edited     BOOLEAN
self_review_scores        JSONB
self_review_accuracy_score INTEGER (1-10)
self_review_rewrites      INTEGER
-- Status
status          TEXT NOT NULL (draft / published)
published_at    TIMESTAMP
created_at      TIMESTAMP DEFAULT now()
```

### subscribers
```sql
id              UUID PRIMARY KEY
email           TEXT UNIQUE NOT NULL
status          TEXT NOT NULL (pending / active / inactive)
confirmation_token TEXT
confirmed_at    TIMESTAMP (consent timestamp for GDPR)
subscribed_at   TIMESTAMP
unsubscribed_at TIMESTAMP
created_at      TIMESTAMP DEFAULT now()
```

### newsletters
```sql
id              UUID PRIMARY KEY
subject_line    TEXT
dialogue_header TEXT
top_insight_text TEXT
surprising_stat_text TEXT
actionable_tip_text TEXT
exercise_text   TEXT
footer_ebook_links JSONB
self_review_score JSONB
episode_ids     JSONB (episodes included in this issue)
status          TEXT NOT NULL (draft / approved / sent / skipped)
skip_reason     TEXT
scheduled_for   TIMESTAMP
sent_at         TIMESTAMP
created_at      TIMESTAMP DEFAULT now()
```

### processing_queue
```sql
id              UUID PRIMARY KEY
episode_id      UUID REFERENCES episodes(id)
status          TEXT NOT NULL (queued / processing / complete / failed / waiting_for_service / cost_exceeded)
current_step    TEXT
retry_count     INTEGER DEFAULT 0
last_retry_at   TIMESTAMP
started_at      TIMESTAMP
completed_at    TIMESTAMP
error_log       TEXT
created_at      TIMESTAMP DEFAULT now()
```

### pipeline_logs
```sql
id              UUID PRIMARY KEY
episode_id      UUID REFERENCES episodes(id)
step_name       TEXT NOT NULL
prompt_version_id UUID REFERENCES prompt_versions(id)
started_at      TIMESTAMP NOT NULL
finished_at     TIMESTAMP
duration_seconds NUMERIC
input_tokens    INTEGER
output_tokens   INTEGER
audio_duration_seconds NUMERIC
cost_usd        NUMERIC(10,4)
status          TEXT NOT NULL (success / retry / failed / skipped)
error_message   TEXT
metadata        JSONB
created_at      TIMESTAMP DEFAULT now()
```

### cost_tracking
```sql
id              UUID PRIMARY KEY
episode_id      UUID REFERENCES episodes(id)
service         TEXT NOT NULL (deepgram / claude / resend)
operation       TEXT NOT NULL
tokens_in       INTEGER
tokens_out      INTEGER
cost_usd        NUMERIC(10,4) NOT NULL
created_at      TIMESTAMP DEFAULT now()
```

### prompt_versions
```sql
id              UUID PRIMARY KEY
prompt_name     TEXT NOT NULL
version         INTEGER NOT NULL
prompt_text     TEXT NOT NULL
change_notes    TEXT NOT NULL
is_active       BOOLEAN DEFAULT false
created_at      TIMESTAMP DEFAULT now()
UNIQUE(prompt_name, version)
```

---

## Reference: Podgrab (Audio Acquisition Patterns)

Agent 1 should study the Podgrab repository (https://github.com/akhilrex/podgrab) for patterns around:
- RSS feed parsing edge cases (the `controllers` and `service` directories)
- Audio URL extraction from different enclosure formats
- Download retry logic and error handling
- How it handles feed pagination and large back-catalogues

Do NOT run Podgrab as a service. It's written in Go and does more than we need. Extract the patterns and implement equivalents in Node.js.

---

## Final Checklist Before Agents Start

- [ ] Manual prompt test completed with 3 real transcripts (Anton does this first)
- [ ] Prompts revised based on test results
- [ ] All 9 spec documents accessible to agents (each agent gets only their assigned docs)
- [ ] Supabase project created (development environment)
- [ ] Vercel project created
- [ ] Railway project created
- [ ] API keys obtained: Deepgram, Claude API, Resend
- [ ] Domain acquired: icantlistentothemall.com (or .lol)
- [ ] Each agent has read and acknowledged their assignment and scope boundaries
