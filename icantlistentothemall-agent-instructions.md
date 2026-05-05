# Icantlistentothemall — Agent Instructions

## How This Project Works

You are one of five AI agents building icantlistentothemall, a product that turns business podcasts into short, readable ebooks. Each agent owns a specific part of the system. You must stay within your scope and coordinate through a shared status file.

---

## Rules For All Agents

### Before You Write Any Code

1. **Read your assigned documents.** Only the ones listed for your agent. Do not read other agents' documents — they will confuse your scope.
2. **Read PROJECT-STATUS.md.** Understand what has been done and what is in progress.
3. **Write a plan.** Before coding anything, produce a `PLAN-agent-{n}.md` file that describes:
   - What you will build, in what order
   - Which database tables you will read from and write to
   - What dependencies you have on other agents (what you need from them before you can proceed)
   - What other agents depend on from you (what you must deliver for them)
   - Any questions or ambiguities you found in the specs
4. **Wait for Anton to approve the plan.** Do not start building until the plan is approved.

### While Building

5. **Update PROJECT-STATUS.md** after completing each task. Check off the relevant item, add a timestamp, and note anything relevant (decisions made, issues found, changes from the plan).
6. **Stay in your scope.** Do not build anything assigned to another agent. If you discover something that needs to be built and it belongs to another agent, note it as an issue in PROJECT-STATUS.md.
7. **Do not modify the database schema** without updating PROJECT-STATUS.md and noting the change. The schema in the pre-build spec is the starting point. If you need a new column or table, document it in the status file so other agents see it.
8. **Document your code.** Every file should have a comment at the top explaining what it does and which agent owns it.
9. **Test before marking complete.** Every task should be tested and working before you check it off in PROJECT-STATUS.md.
10. **Log decisions.** If you make a technical decision not covered by the specs (library choice, architectural pattern, error handling approach), add it to the Decisions Log in PROJECT-STATUS.md.

### Coordination

11. **If you're blocked by another agent,** add it to the Issues & Blockers section of PROJECT-STATUS.md. Do not wait silently.
12. **If another agent needs something from you,** prioritise delivering it. Check the status file for blockers that mention your name.
13. **If you find a bug or issue in another agent's work,** add it to Issues & Blockers. Do not fix it yourself — it's their scope.

---

## Agent 1: RSS Monitor & Audio Acquisition

### Your Documents (read these and only these)
- Pipeline Spec (sections: RSS Feed Monitoring, Audio Handling)
- Technical Addendum (sections: RSS Parser Robustness, Retry Strategy)
- AI Strategy (section: Podcast-Level Context Descriptions — store these per podcast)
- Pre-Build Spec (section: Agent 1 assignment, full Supabase schema, chunking strategy section for context on what happens after you)

### Reference Material
- Podgrab repo (https://github.com/akhilrex/podgrab) — study RSS parsing patterns, audio URL extraction, and download resilience. Do NOT run Podgrab. Extract patterns and implement in Node.js.

### What You Build
- RSS feed parser and monitor (6-hour cron cycle)
- Episode detection, deduplication (GUID + fallback hash), filtering (≥ 35 min, skip trailers/reruns)
- Audio acquisition: Deepgram URL passthrough primary, temporary download fallback
- Episode queue management
- Feed health monitoring
- Podcast subscription management (adding/removing, storing metadata including podcast_context)

### What You Do NOT Build
- Transcription processing (Agent 2)
- Any Claude API calls (Agent 2)
- Any frontend pages (Agent 4)
- PDF generation (Agent 3)
- Email sending (Agent 5)

### Database Tables You Own
- podcasts (create and manage)
- episodes (create entries and update status through queueing)
- processing_queue (create new entries)

### Your First Task
Write a standalone RSS parser test script that runs against the actual feeds of these 5 podcasts:
1. Diary of a CEO
2. My First Million
3. The Tim Ferriss Show
4. The Game w/ Alex Hormozi
5. Lenny's Podcast

Document the quirks of each feed in `feed-quirks.md`. This must pass before building the cron job.

### What Agent 2 Needs From You
- Episodes in the processing queue with status `queued`, audio URL, and podcast metadata
- The podcast_context field populated for each podcast (from the AI Strategy doc)

---

## Agent 2: AI Pipeline

### Your Documents (read these and only these)
- Prompt Engineering Spec (full document)
- AI Strategy (full document — contains the actual prompts to implement)
- Risk Mitigation & Content Frameworks (full document)
- Pipeline Spec (sections: Claude Pipeline, Processing Queue & Orchestration)
- Technical Addendum (sections: Cost Controls, Observability layers 1-2, Retry Strategy, Staging)
- Pre-Build Spec (sections: Agent 2 assignment, Transcript Chunking Strategy, full Supabase schema)

### What You Build
- Deepgram transcription integration
- Transcript chunking (2,500-word target, 200-word overlap, 12-min max)
- Pass 1: dual extraction + comparison + merge
- Quality threshold check (< 6 insights → flag)
- Pass 2: framework selection and outline generation
- Pass 3: summary, ebook content, newsletter material
- Self-review: content accuracy (7/10 threshold) + writing quality (35/50 threshold)
- Prompt versioning system
- Pipeline orchestration (sequential, full status tracking)
- Cost tracking and ceiling enforcement ($8/episode, $30/week)
- All pipeline logging
- Outline review email to Anton (after Pass 2)
- Dual-Claude preference tracking and auto-analysis
- A/B testing mode for prompts

### What You Do NOT Build
- RSS parsing or audio downloading (Agent 1)
- PDF generation (Agent 3)
- Any frontend pages (Agent 4)
- Newsletter sending or subscriber management (Agent 5)

### Database Tables You Own
- transcripts
- processed_content (content generation and quality metrics)
- pipeline_logs
- cost_tracking
- prompt_versions
- processing_queue (status updates from transcription through completion)

### Your First Task
Seed the prompt_versions table with all v1 prompts from the AI Strategy document. Build the versioning system so every pipeline step references a prompt version. This must be in place before any content processing.

### What You Need From Agent 1
- Episodes in the processing queue with audio URLs

### What Agent 3 Needs From You
- Completed ebook content in processed_content table (ebook_content, self_rating_note, pass_2_framework_selected, final_page_count)

### What Agent 5 Needs From You
- Newsletter material in processed_content table (newsletter_insight, newsletter_stat, newsletter_tip, newsletter_exercise)

---

## Agent 3: PDF Generation

### Your Documents (read these and only these)
- Design System / Manuscript Edition (full document — especially the ebook PDF section)
- Risk Mitigation & Content Frameworks (section: Content Frameworks — understand the five framework structures)
- Technical Addendum (section: PDF Generation Phased Approach)
- Pre-Build Spec (section: Agent 3 assignment, full Supabase schema)

### What You Build
- HTML template for the ebook (manuscript aesthetic, monospaced only for Phase 1)
- Puppeteer integration (HTML → PDF)
- Cover page, page two (chapter list + self-rating), chapter openers (with pull-forwards), body pages, pull quotes, last page (newsletter CTA)
- Page break management
- Accent colour system (thin lines, pull quote borders)
- PDF storage in Supabase Storage
- PDF URL written back to processed_content

### What You Do NOT Build
- Content generation (Agent 2)
- Any Claude API calls (Agent 2)
- Any frontend pages (Agent 4)
- RSS parsing (Agent 1)
- Email sending (Agent 5)

### Database Tables You Own
- None directly. You read from processed_content and write the ebook_pdf_url back to it.

### Your First Task
Build one complete test PDF from hardcoded content. Use real episode content from the manual prompt test (or invent realistic placeholder content). Get the manuscript aesthetic right in a browser first, then confirm Puppeteer renders it correctly. This must work before Agent 2's pipeline is complete.

### What You Need From Agent 2
- Ebook content, self-rating note, framework selected, page count in the processed_content table

### What Agent 4 Needs From You
- PDF URLs in processed_content.ebook_pdf_url so the site can link to downloads

---

## Agent 4: Website (Next.js Frontend)

### Your Documents (read these and only these)
- Design System / Manuscript Edition (full document — this is your primary reference)
- Newsletter Spec (section: Subscriber Flow — signup mechanics)
- Pre-Build Spec (sections: Agent 4 assignment, PDF Download Flow, full Supabase schema)

### What You Build
- Next.js project on Vercel
- Supabase schema creation (all tables from pre-build spec — you create the initial schema for all agents)
- Homepage (manuscript aesthetic: dialogue, explanation, nav links, signup form)
- E-books page (/ebooks) with podcast filtering and load more
- Episode detail page (/ebooks/[slug]) with summary, chapters, self-rating, download, newsletter material, signup form
- Quick summaries page (/summaries)
- Newsletter page (/newsletter) with signup form, issue preview, archive list
- Newsletter archive pages (/newsletter/archive/[slug])
- About page (/about)
- Privacy page (/privacy)
- 404 page with dialogue
- Global nav, global footer
- Newsletter signup form component (reused everywhere)
- Sticky signup bar
- Exit intent popup (desktop only)
- Signup form submission → API route → Supabase (creates subscriber with status pending)
- PDF download click tracking (Plausible/Umami)
- Open Graph image generation
- SEO: meta tags, structured data, sitemap
- Static generation / ISR for episode pages
- Mobile-first responsive design
- Plausible or Umami integration

### What You Do NOT Build
- Backend pipeline (Agent 2)
- PDF generation (Agent 3)
- RSS parsing (Agent 1)
- Email sending, confirmation flow backend (Agent 5)
- Any Claude API calls

### Database Tables You Own
- You CREATE the initial schema for ALL tables (you're the first to set up Supabase)
- You WRITE to: subscribers (new signups, status: pending, with confirmation_token)
- You READ from: episodes, processed_content, podcasts, newsletters

### Your First Task
1. Create the Supabase development project with the full schema from the pre-build spec
2. Build the homepage with the manuscript aesthetic
3. Get Anton's approval on the homepage before building any other page

The homepage sets the design standard. Every other page follows its lead.

### What You Need From Other Agents
- From Agent 2: published content in processed_content table (for episode pages)
- From Agent 3: PDF URLs in processed_content.ebook_pdf_url (for download links)
- From Agent 5: nothing directly — you create the subscriber row, Agent 5 handles everything after that

### What Agent 5 Needs From You
- Subscriber rows in Supabase with status `pending` and a confirmation_token when someone signs up

---

## Agent 5: Newsletter & Email System

### Your Documents (read these and only these)
- Newsletter Spec (full document)
- Technical Addendum (sections: Observability layers 4-5, Data Backup Strategy, Newsletter Episode Tracking)
- Design System / Manuscript Edition (section: Newsletter Email Design)
- AI Strategy (section: Pass 3 Newsletter Material Extraction Prompt — for the newsletter generation Claude call)
- Pre-Build Spec (section: Agent 5 assignment, full Supabase schema)

### What You Build
- Resend integration
- React Email templates (confirmation, welcome, newsletter — all manuscript aesthetic)
- Double opt-in flow (confirmation email → click → active subscriber → welcome email)
- Welcome email with links to 3 most recent ebooks
- Newsletter generation cron (bi-weekly, flag-based: pull episodes where newsletter_included = false)
- Newsletter Claude call (four sections + 3 subject line candidates)
- Newsletter self-review
- Draft storage and Anton notification email
- Approval flow → send via Resend
- Mark episodes as newsletter_included after send
- Unsubscribe handling (update subscriber status)
- Subscriber cleanup cron (delete inactive after 30 days)
- Nightly database backup (JSON export → email to Anton)
- Weekly operational digest email to Anton
- All alert emails (cost caps, quality degradation, feed failures, worker stalls)

### What You Do NOT Build
- Frontend signup forms (Agent 4 creates these)
- PDF generation (Agent 3)
- RSS parsing (Agent 1)
- The main content pipeline (Agent 2)
- Any frontend pages

### Database Tables You Own
- subscribers (status management: pending → active → inactive)
- newsletters (creation, approval, send tracking)

### Your First Task
Set up Resend, verify the domain, and build the confirmation + welcome email templates. Test the full double opt-in flow end-to-end before building the newsletter system.

### What You Need From Other Agents
- From Agent 4: subscriber rows in Supabase with status `pending` and confirmation_token
- From Agent 2: newsletter material in processed_content (newsletter_insight, newsletter_stat, newsletter_tip, newsletter_exercise) and episode metadata
- From Agent 3: PDF URLs for ebook links in welcome emails and newsletters

---

## Dependency Map

```
Agent 1 (RSS & Audio)
  └──▶ Agent 2 (AI Pipeline) — needs episodes in queue with audio URLs
         ├──▶ Agent 3 (PDF) — needs ebook content in processed_content
         │      └──▶ Agent 4 (Site) — needs PDF URLs for download links
         └──▶ Agent 5 (Newsletter) — needs newsletter material in processed_content

Agent 4 (Site)
  └──▶ Agent 5 (Newsletter) — needs subscriber rows from signup forms
```

Agents 1 and 4 can start immediately in parallel (no dependencies).
Agent 2 depends on Agent 1 for queue data.
Agent 3 depends on Agent 2 for content.
Agent 5 depends on Agent 4 for subscribers and Agent 2 for newsletter material.

Agent 3 can build and test their PDF template in parallel using hardcoded content while waiting for Agent 2.
Agent 5 can build email templates and the double opt-in flow in parallel while waiting for Agent 2's newsletter material.

---

## Communication Protocol

There is no direct communication between agents. All coordination happens through:

1. **PROJECT-STATUS.md** — the shared status file. Read before working, update after completing tasks.
2. **The database** — agents share data through Supabase tables. The schema is the contract.
3. **Issues & Blockers** in PROJECT-STATUS.md — if you need something from another agent, post it there.
4. **Anton** — the human in the loop. Anton reviews plans, approves designs, resolves conflicts, and makes decisions on issues.

If two agents disagree on how something should work, Anton decides.
