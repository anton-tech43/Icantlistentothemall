# PLAN — Agent 5: Newsletter & Email System

## Context

Agent 5 owns the newsletter and email system for icantlistentothemall. This covers: Resend integration, all email templates (manuscript aesthetic), double opt-in subscriber flow, bi-weekly newsletter generation via Claude, newsletter approval and sending, subscriber lifecycle (pending → active → inactive → deleted), nightly database backups, weekly operational digests, and all system alert emails.

---

## Build Order

### Phase 1: Foundations (parallel with all agents)

**1. Resend integration**
- Account setup, domain verification
- API key in Railway worker env vars
- Resend SDK integration (Node.js)

**2. React Email templates — manuscript aesthetic**
- **Confirmation email** — Subject: "You're almost in" / Body: one-liner + confirm button / Monospaced, black on white, max-width 600px, no images
- **Welcome email** — Subject: "You're in. Headphones off." / Body: pitch + next send date + links to 3 most recent ebooks

**3. Double opt-in flow**
- Listen for new subscriber rows (status=`pending`, confirmation_token set) created by Agent 4
- Send confirmation email with tokenised link
- Confirmation API route: validates token → sets status=`active`, stores `confirmed_at` (GDPR consent) → redirects to `/confirmed` page (Agent 4 builds this page)
- Send welcome email immediately after confirmation
- Welcome email queries: `processed_content WHERE status='published' AND ebook_pdf_url IS NOT NULL ORDER BY published_at DESC LIMIT 3`

**4. Unsubscribe handling**
- Resend manages List-Unsubscribe headers automatically
- On unsubscribe event: set subscriber status=`inactive`, record `unsubscribed_at`

### Phase 2: Newsletter Generation (depends on Agent 2 content)

**5. Newsletter generation cron (bi-weekly, Railway)**
- Flag-based query: `SELECT * FROM processed_content WHERE newsletter_included = false AND status = 'published'`
- If < 3 episodes: skip issue, store newsletter with status=`skipped`, notify Anton
- If ≥ 3: proceed to Claude call

**6. Newsletter Claude call**
- Gather all eligible episodes' newsletter material (newsletter_insight, newsletter_stat, newsletter_tip, newsletter_exercise) plus episode metadata
- Send to Claude with a newsletter composition prompt (to be written — see Questions #1) + anti-slop rules
- Output: 4 sections (TOP INSIGHT, SURPRISING STAT, DO THIS TODAY, REFLECT ON THIS), 3 subject line candidates ranked 1-3, rotating dialogue header
- Store prompt in prompt_versions table, reference version in pipeline_logs

**7. Newsletter self-review**
- Run writing quality review on generated content (threshold: 35/50)
- If fails: one auto-rewrite attempt, then store with flag for Anton

**8. Draft storage + Anton notification**
- Store as `draft` in newsletters table with all content, episode_ids, self_review_score
- Email Anton with full preview + all 3 subject line candidates

**9. Approval flow → send**
- Anton clicks approval link in notification email → hits API endpoint → sets status=`approved`
- Send to all subscribers WHERE status=`active` via Resend
- After send: status=`sent`, set `sent_at`, mark all included episodes `newsletter_included = true`

### Phase 3: Operations

**10. Subscriber cleanup cron (daily)**
- Delete subscribers WHERE status=`inactive` AND unsubscribed_at < NOW() - 30 days

**11. Nightly database backup (3am daily)**
- Export: subscribers, podcasts, episodes, processed_content → JSON → compress .json.gz
- Sunday nights: also include transcripts table
- Send as email attachment to Anton via Resend
- Subject: "BACKUP — icantlistentothemall — [date]"
- If 3 consecutive failures: trigger alert

**12. Weekly operational digest (Monday 9am)**
- Pipeline: episodes processed, flagged/skipped, total cost, avg cost/episode, avg processing time
- Quality: avg self-review score, frameworks used, outlines approved, rewrites triggered
- Site: PDF downloads (if analytics API available), new subscribers, total active subscribers
- Newsletter: last issue open rate, click rate
- Health: worker uptime, API errors, feed failures

**13. Alert emails to Anton**

| Alert | Trigger | Severity |
|---|---|---|
| Weekly cost cap | Cumulative weekly spend ≥ $30 | High (pauses queue) |
| Episode cost exceeded | Single episode ≥ $8 | High (kills episode) |
| Monthly budget warning | Monthly spend ≥ $150 | Medium |
| Quality degradation | Avg self-review < 35 for 3 consecutive episodes | Medium |
| Feed failure | Same feed fails 3 consecutive cycles (18h) | Medium |
| Worker stalled | No processing in 48h with queued items | High |
| API error spike | >20% error rate in 24h | High |
| Thin newsletter | < 3 episodes for newsletter | Low |
| Subscriber milestone | Count passes 100, 500, 1000, 5000 | Informational |

---

## Database Tables

### Tables I Own (read + write)
- **subscribers** — lifecycle: pending → active → inactive → deleted (30 days)
- **newsletters** — lifecycle: draft → approved → sent (or skipped)

### Tables I Read From
- **processed_content** — newsletter material, ebook_pdf_url, newsletter_included flag
- **episodes** — metadata for newsletter content
- **pipeline_logs** — weekly digest stats
- **cost_tracking** — digest + cost alerts
- **podcasts** — feed failure alerts, podcast names

---

## Dependencies

### What I need from other agents

| From | What | When |
|---|---|---|
| Agent 4 | Subscriber rows (status=`pending`, confirmation_token) | Phase 1 |
| Agent 4 | `/confirmed` page on the site for redirect after opt-in | Phase 1 |
| Agent 2 | Newsletter material in processed_content (newsletter_insight, newsletter_stat, newsletter_tip, newsletter_exercise) | Phase 2 |
| Agent 3 | ebook_pdf_url in processed_content for welcome email + newsletter footer links | Phase 1 + Phase 2 |

### What other agents need from me
- **None.** Agent 5 is a terminal node in the dependency graph.

---

## Resolved Questions (Anton's Answers — 2026-04-16)

1. **Newsletter composition prompt:** Agent 5 owns this prompt. Store in prompt_versions as `newsletter_composition`. Takes multiple episodes' material → composes final 4 sections.

2. **Subject line auto-selection:** Ranking instructions included in the generation prompt. Claude outputs ranked 1-3, most specific first. #1 is default. Anton can override when reviewing draft.

3. **Newsletter approval mechanism:** Two links in notification email: "Approve and send" (triggers immediate send) and "Hold for review" (keeps as draft for manual editing). Both hit API endpoints on Railway worker.

4. **Welcome email with < 3 ebooks:** Show whatever exists (1 ebook = show 1). If 0, skip ebook section entirely, show welcome text + next newsletter date only.

5. **Dialogue header rotation:** Claude generates a new one per issue as part of the newsletter_composition prompt. Include 4-5 examples from design system as guidance. Dialogue should relate to the issue's content.

6. **Site metrics in weekly digest:** Omit Plausible/Umami stats for v1. Show DB-available data only: episodes processed, costs, quality scores, subscriber count. Add placeholder: "PDF downloads: [analytics integration pending]".

7. **Alert check frequency:** Hourly cron. Agent 5 monitors independently — queries pipeline_logs, cost_tracking, processing_queue, podcasts. No cross-agent coupling.

8. **Resend attachment limits:** 40MB supported. Early-stage backups well under 1MB. No action needed now.

9. **Retry strategy for Resend:** Same exponential backoff. For newsletter sends specifically: store as `approved` and retry on next hourly check if send fails. Mark `send_failed` after 3 retries, alert Anton.

10. **Confirmation email trigger:** Agent 4's API route calls an endpoint/function provided by Agent 5. Agent 5 does not poll.
