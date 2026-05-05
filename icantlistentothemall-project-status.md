# PROJECT STATUS — icantlistentothemall

> This file is the single source of truth for the project. Every agent reads this before starting work and updates it after completing any task. If it's not in this file, it didn't happen.

**Last updated:** 2026-04-16
**Updated by:** Agent 3

---

## Project Phase: PRE-BUILD

Current status: Waiting for manual prompt test results before agents begin development.

---

## Agent Assignments

| Agent | Scope | Status |
|---|---|---|
| Agent 1 | RSS Monitor & Audio Acquisition | Complete — Supabase populated with 5 podcasts and 1,280+ queued episodes across all feeds. Agent 2 can begin processing. |
| Agent 2 | AI Pipeline (Transcription → Writing) | Phase 1-3 complete — all pipeline steps built, awaiting Supabase schema + test data |
| Agent 3 | PDF Generation | Phase 1 complete — HTML template, Puppeteer, parser, storage, orchestrator all built. 3 test PDFs generated. Awaiting Anton review. |
| Agent 4 | Website (Next.js Frontend) | Phase 1-4 complete — all pages built, SEO, OG images, responsive. Remaining: Plausible integration (needs domain), sitemap (needs domain), swap seed data for Supabase queries. |
| Agent 5 | Newsletter & Email System | Phase 1 in progress |

---

## Infrastructure Status

| Item | Status | Notes |
|---|---|---|
| Supabase (dev) | Created | inoqfxoswljczlpjyite.supabase.co — schema deployed 2026-04-16 |
| Supabase (prod) | Not created | |
| Vercel project | Not created | |
| Railway project | Not created | |
| Deepgram API key | Not obtained | |
| Claude API key | Not obtained | |
| Resend API key | Not obtained | |
| Domain | Not acquired | icantlistentothemall.com or .lol |
| Git repo | Not created | |

---

## Database Schema

Status: Defined in pre-build spec (document 9). Not yet created in Supabase.

Tables: podcasts, episodes, transcripts, processed_content, subscribers, newsletters, processing_queue, pipeline_logs, cost_tracking, prompt_versions

Schema owner: Agent 4 creates the initial schema during Phase 1. All agents reference the schema in the pre-build spec and must not modify table structures without updating this file.

**Schema changes (pending Agent 4 creation):**
- `processed_content.guest_name TEXT` — Added 2026-04-16 by Agent 3 (approved by Anton). Agent 2 populates during Pass 2. Used by Agent 3 (PDF cover page) and Agent 4 (episode detail pages).

---

## Build Progress

### Phase 1: Foundations

**Agent 1 — RSS & Audio**
- [x] RSS parser test against 5 podcast feeds — 2026-04-16, all 5 feeds parse successfully. Discovered updated URLs for Diary of a CEO (FlightCast) and My First Million (new Megaphone path).
- [x] Feed quirks documented in `feed-quirks.md` — 2026-04-16, all quirks documented: GUID formats, duration formats, audio locations, bonus/trailer patterns.
- [x] All 5 feeds parsing correctly — 2026-04-16, 3,878 total episodes parsed across all feeds.

**Agent 2 — AI Pipeline**
- [x] Prompt versions table seeded with all v1 prompts — 2026-04-16, seed script ready (9 prompts: extraction, alternative, comparison, structure, summary, ebook, newsletter, accuracy review, writing review). Ebook prompt outputs structured Markdown with YAML front matter per cross-agent decision.
- [x] Pipeline scaffolding and logging framework built — 2026-04-16, orchestrator with full status tracking, pipeline_logs, cost_tracking, retry/crash recovery, cost caps ($8/episode, $30/week)
- [x] Cost tracking module built — 2026-04-16, per-step and per-episode cost logging, weekly aggregation, ceiling enforcement

**Agent 3 — PDF Generation**
- [x] HTML template built (manuscript aesthetic, monospaced only) — 2026-04-16, JetBrains Mono throughout, cover page, page two, chapter openers, body pages, pull quotes, last page CTA
- [x] Template renders correctly in browser — 2026-04-16, 3 test episodes (Big Idea, Playbook, Contrarian Take) with all 3 accent colours verified
- [x] Puppeteer generates PDF from template — 2026-04-16, puppeteer-core with local Chrome, 3 test PDFs generated (10, 12, 10 pages)
- [ ] Test PDF reviewed and approved by Anton
- [x] Markdown parser built — 2026-04-16, parses YAML front matter + structured Markdown from Agent 2 into EbookData
- [x] Supabase Storage module built — 2026-04-16, upload to `ebooks` bucket with slugified paths, public URLs
- [x] Full pipeline orchestrator built — 2026-04-16, episode_id → DB query → parse → render → Puppeteer → upload → write URL back

**Agent 4 — Website**
- [x] Next.js project created — 2026-04-16, src/agent-4/website, build passing
- [x] Supabase schema SQL written — 2026-04-16, all 10 tables + guest_name, pending execution in SQL Editor
- [x] Homepage built — 2026-04-16, manuscript aesthetic: centered dialogue, explanation + links at bottom, no nav on homepage
- [x] Homepage reviewed and approved by Anton — 2026-04-16

**Agent 5 — Newsletter & Email**
- [ ] Resend account set up, domain verified
- [x] Confirmation email template built (2026-04-16)
- [x] Welcome email template built (2026-04-16)
- [x] Double opt-in flow working end-to-end (2026-04-16, DB-level tested, 32/32 tests pass. Resend sending untested until API key available)

### Phase 2: Core Pipeline

**Agent 1**
- [x] Full RSS monitor cron job (6-hour cycle) — 2026-04-16, `feed-monitor.js` orchestrator built and tested
- [x] Episode detection and deduplication — 2026-04-16, GUID + fallback hash dedup verified (second run: 0 new, 3,878 duplicates)
- [x] Episode filtering (≥ 35 min, skip trailers/reruns) — 2026-04-16, filters 1,272 episodes across all feeds
- [ ] Deepgram URL passthrough transcription — Agent 1 scope: audio URL acquisition only. Transcription is Agent 2's scope.
- [x] Fallback: temporary download → upload → delete — 2026-04-16, `audio-acquisition.js` built with download + cleanup
- [x] Feed health monitoring (consecutive failure tracking) — 2026-04-16, alerts after 3 failures, stale feed detection at 30 days
- [x] Episodes successfully entering the processing queue — 2026-04-16, 2,606 episodes queued in integration test

**Agent 2**
- [x] Transcription integration (receives from Agent 1's queue) — 2026-04-16, Deepgram Nova-2 with diarize/paragraphs/smart_format
- [x] Chunking algorithm (2,500-word target, 200-word overlap, 12-min max) — 2026-04-16, 4-priority split logic, overlap, merge-small-final
- [x] Pass 1: dual extraction (standard + alternative) — 2026-04-16, Batch API, Instance A + B per chunk
- [x] Pass 1: comparison and merge — 2026-04-16, Batch API, agreement scoring, merged extraction stored in transcripts.chunks
- [x] Quality threshold check (< 6 insights → flag) — 2026-04-16, integrated in orchestrator
- [x] Outline review email to Anton — 2026-04-16, Resend plain text with approve/flag links

**Agent 3**
- [ ] PDF template refined with real content from Agent 2

### Phase 3: Content Generation

**Agent 2**
- [x] Pass 2: framework selection and outline generation — 2026-04-16, real-time API (not batch), 5 frameworks, guest_name extraction
- [x] Pass 3: summary writing — 2026-04-16, Batch API
- [x] Pass 3: ebook writing — 2026-04-16, Batch API, structured Markdown output with YAML front matter
- [x] Pass 3: newsletter material extraction — 2026-04-16, Batch API, 4 sections parsed
- [x] Self-review: content accuracy (threshold 7/10) — 2026-04-16, Batch API, with rewrite on failure
- [x] Self-review: writing quality (threshold 35/50) — 2026-04-16, Batch API, 5 dimensions scored
- [x] Cost ceiling enforcement ($8/episode, $30/week) — 2026-04-16, checked before each step
- [x] Full pipeline orchestration working end-to-end — 2026-04-16, sequential processing with crash recovery, outline approval pause/resume

**Agent 3**
- [ ] PDF generation from Agent 2's output
- [ ] PDF storage in Supabase Storage
- [ ] PDF URL written back to processed_content table

**Agent 4**
- [x] E-books page (/ebooks) with podcast filtering — 2026-04-16, text toggle filters, accent dots, load more
- [x] Episode detail page (/ebooks/[slug]) — 2026-04-16, summary, chapters, self-rating, download, newsletter material, signup
- [x] PDF download button (immediate, no email gate) — 2026-04-16, placeholder until Agent 3 provides PDF URLs
- [x] Quick summaries page (/summaries) — 2026-04-16, feed of summaries with links to full e-books
- [ ] Download tracking via Plausible

### Phase 4: Newsletter & Polish

**Agent 5**
- [x] Newsletter generation cron logic (bi-weekly, flag-based) (2026-04-16, code complete, needs Railway cron wiring)
- [x] Claude call for newsletter content (2026-04-16, newsletter_composition prompt v1 written, Claude integration built)
- [x] Newsletter self-review (2026-04-16, writing quality review with rewrite on fail)
- [x] Draft storage and Anton notification (2026-04-16, stores draft + sends preview email with approve/hold links)
- [x] Approval flow → send via Resend (2026-04-16, approve/hold API routes, batched sending with retry)
- [x] Episode newsletter_included flag updated after send (2026-04-16, marks all included episodes after successful send)

**Agent 4**
- [x] Newsletter page (/newsletter) with archive — 2026-04-16, dialogue, description, signup, archive placeholder
- [x] Newsletter archive pages (/newsletter/archive/[slug]) — 2026-04-16, template ready, fetches from DB when issues exist
- [x] About page (/about) — 2026-04-16, dialogue, explanation, signup
- [x] Privacy page (/privacy) — 2026-04-16, plain monospaced text
- [x] 404 page — 2026-04-16, dialogue, "Go home" link
- [x] Confirmed page (/confirmed) — 2026-04-16, "You're in" dialogue, links to newsletter + ebooks
- [x] Sticky signup bar — 2026-04-16, bottom on mobile, top on desktop, cookie-dismissed
- [x] Exit intent popup (desktop) — 2026-04-16, mouseleave, once per session via cookie
- [x] Open Graph images for social sharing — 2026-04-16, edge route at /og, white bg + black monospaced text, dynamic per page
- [x] SEO: meta tags, structured data — 2026-04-16, per-page metadata, OG tags, Twitter cards. Sitemap pending domain.
- [x] Mobile responsiveness pass — 2026-04-16, all pages tested at 375px, card metadata wrapping fixed

**Agent 5**
- [x] Nightly database backup (JSON email) (2026-04-16, daily + weekly exports, gzip compressed, emailed as attachment)
- [x] Weekly operational digest email (2026-04-16, pipeline/quality/site/newsletter/health sections, analytics placeholder)
- [x] Alert system (2026-04-16, 8 alert types: cost caps, quality, feed failures, worker stalls, API errors, milestones)
- [x] Subscriber cleanup cron (2026-04-16, deletes inactive after 30 days)

### Phase 5: Pre-Launch

- [ ] 10 back-catalogue episodes processed through full pipeline
- [ ] End-to-end test: RSS → transcription → extraction → writing → PDF → site → newsletter
- [ ] All pages mobile-tested
- [ ] Full subscriber flow tested (signup → confirm → welcome → newsletter)
- [ ] Anton final review of all content and design

---

## Decisions Log

Record every significant decision made during development. Format: date, who decided, what was decided, why.

| Date | Decision | Reason |
|---|---|---|
| 2026-04-16 | Agent 2 outputs `ebook_content` as structured Markdown with YAML front matter (not custom delimiters). Chapters: `# Chapter N: Title`, sections: `## Subheader`, pull quotes: `> "text" — Attribution`. Front matter includes pull-forwards per chapter, framework, guest name. | Standard Markdown is more natural for Claude's writing output and easier to parse than custom delimiter formats. Decided by Anton, logged by Agent 3. |
| 2026-04-16 | Added `guest_name TEXT` to `processed_content` table. Agent 2 extracts during Pass 2. | Needed by Agent 3 (PDF cover page) and Agent 4 (episode detail pages). No existing column for guest name. Approved by Anton. |
| 2026-04-16 | Agent 3 creates the base Railway `worker/Dockerfile` with Chromium + JetBrains Mono font. Agents 1 and 2 extend it when they start Railway work. | First mover creates the file. Decided by Anton. |
| 2026-04-16 | Added `/confirmed` page to Agent 4 scope. Simple manuscript dialogue page for Agent 5's double opt-in redirect. | Agent 5 needs a redirect target after email confirmation. Approved by Anton. |
| 2026-04-16 | Analytics: Plausible (not Umami). | Privacy-first, GDPR-compliant, no self-hosting needed. Approved by Anton. |
| 2026-04-16 | Skip social proof subscriber counter entirely until 500+ subscribers reached. | No point building it now. 10-minute addition later. Decided by Anton. |
| 2026-04-16 | Agent 1: Updated RSS feed URLs — Diary of a CEO now at `rss2.flightcast.com`, My First Million at `feeds.megaphone.fm/HS2300184645`. Old URLs in specs return 404. | Feed providers changed hosting. Discovered during RSS parser test. |
| 2026-04-16 | Agent 1: Used `rss-parser` npm package only (did not use Podgrab patterns). | rss-parser handles all 5 feeds correctly including custom fields. Podgrab reference unnecessary. |
| 2026-04-16 | Agent 1: Audio URL validation limited to 5 most recent episodes per feed per cycle. | Bulk validation of 700+ URLs per feed causes timeouts. Recent episodes are the ones that matter for processing. |
| 2026-04-16 | Agent 1: Using local SQLite for development, schema mirrors Supabase spec. | Supabase not yet created. SQLite allows full testing. DB layer is a thin wrapper for easy swap. |
| 2026-04-16 | Agent 5: Email templates built as plain HTML strings, not React Email. | Manuscript aesthetic is deliberately simple (monospaced, no images, text-only). Plain HTML renders identically everywhere and avoids React/JSX compilation on the Railway worker. |
| 2026-04-16 | Agent 5: Using local SQLite for development (same pattern as Agent 1). subscribers and newsletters tables created. | Supabase not yet created. SQLite mirrors the Supabase schema. DB layer is a thin wrapper for swap. |
| 2026-04-16 | Agent 5: Newsletter approval via two email links ("Approve and send" / "Hold for review") hitting Railway API endpoints. | Simplest v1 approach. No admin UI needed. Approved by Anton. |
| 2026-04-16 | Agent 5: Agent 5 owns the `newsletter_composition` prompt (stored in prompt_versions). | The prompt that assembles a full newsletter from multiple episodes' material was not in the specs. Anton confirmed Agent 5 writes and owns it. |
| 2026-04-16 | Agent 5: Hourly alert monitoring cron. Agent 5 queries all tables independently — no cross-agent coupling. | Simpler architecture. Other agents don't call alert functions. Approved by Anton. |
| 2026-04-16 | Agent 1: Swapped SQLite → Supabase. New files: `db-supabase.js`, `episode-detector-supabase.js`, `feed-monitor-supabase.js`. 5 podcasts seeded + 1,280+ episodes queued. | Supabase schema is live. Agent 2 can now process the queue. SQLite files remain for local dev reference. |
| 2026-04-16 | Agent 1: Skipped full ~2,600 episode backfill. Pre-build spec only needs 10 launch episodes; Supabase already has 1,280+. | Background load failed at ~1,273 episodes (exit code 4, likely sequential HTTP fragility). Anton confirmed 10 is enough. Future 6-hour cycles will catch new episodes naturally. |

---

## Issues & Blockers

| Issue | Reported By | Status | Resolution |
|---|---|---|---|
| Agent 5 needs `/confirmed` page on the site for double opt-in redirect. Simple manuscript dialogue: "You're in" he said / –Headphones off we said. | Agent 5 | Open — waiting for Agent 4 | Already logged in Decisions Log. Agent 4 to build. |

---

## Prompt Version History

Track prompt changes here as well as in the database.

| Date | Prompt | Version | Change | Result |
|---|---|---|---|---|
| | pass_1_extraction | v1 | Initial version from AI Strategy spec | Pending test |
| | pass_1_alternative | v1 | Initial version from AI Strategy spec | Pending test |
| | pass_1_comparison | v1 | Initial version from AI Strategy spec | Pending test |
| | pass_2_structure | v1 | Initial version from AI Strategy spec | Pending test |
| | pass_3_summary | v1 | Initial version from AI Strategy spec | Pending test |
| | pass_3_ebook | v1 | Initial version from AI Strategy spec | Pending test |
| | pass_3_newsletter | v1 | Initial version from AI Strategy spec | Pending test |
| | self_review_accuracy | v1 | Initial version from AI Strategy spec | Pending test |
| | self_review_writing | v1 | Initial version from AI Strategy spec | Pending test |

---

## Cost Tracking (Weekly)

| Week | Episodes Processed | Total Cost | Avg Cost/Episode | Notes |
|---|---|---|---|---|
| | | | | |
