# Icantlistentothemall — Newsletter Setup Spec

## Context
This document covers the bi-weekly email newsletter: service choice, subscriber flow, template design, automation, GDPR compliance, and anti-slop writing rules. Companion to the project plan, prompt engineering spec, PDF branding spec, and pipeline spec.

---

## Email Service: Resend

### Why Resend
- Developer-first, simple API
- React Email support (builds email templates in the same stack as the site)
- Free tier: 3,000 emails/month (enough for ~1,500 subscribers on a bi-weekly cadence)
- Paid: $20/month for 50,000 emails
- Strong deliverability, handles unsubscribe headers and compliance automatically

### Setup
- Resend account connected to the site's domain
- API key stored in Railway worker environment variables
- React Email template compiled to HTML for sending

---

## Subscriber Flow

### Signup
1. Visitor enters email in signup form on site (homepage + dedicated /newsletter page)
2. Email field only. No name, no preferences, no friction.
3. Form submits to a Next.js API route → stores email in Supabase with status `pending` and a confirmation token
4. Resend sends a confirmation email

### Double Opt-In (Required for GDPR)
5. Subscriber clicks the confirmation link in the email
6. API route marks the subscriber as `active` in Supabase, stores consent timestamp
7. Redirect to a simple "You're in" confirmation page on the site

### Unsubscribe
- Every email includes a one-click unsubscribe link (Resend handles this automatically)
- Clicking it marks the subscriber as `inactive` in Supabase with unsubscribe timestamp
- No "are you sure?" screens. Instant, respectful, done.
- Unsubscribed email addresses deleted from the database after 30 days

---

## Confirmation Email

**Subject:** You're almost in

**Body:**
One click and you'll stop pretending you'll get to all those podcast episodes.

[Confirm my subscription]

That's it. One button. No explanation of what they're getting (they already know, they just signed up). Matches the brand voice: self-aware, direct, slightly funny.

---

## Welcome Email

Sent immediately after confirmation.

**Subject:** You're in. Headphones off.

**Body:**
Every two weeks you'll get the sharpest insights from the best business podcasts. No fluff, no filler, no ads.

Your first newsletter arrives on [date of next scheduled send].

In the meantime, here are the latest ebooks:
- [Episode Title] — [Podcast Name] → [download link]
- [Episode Title] — [Podcast Name] → [download link]
- [Episode Title] — [Podcast Name] → [download link]

icantlistentothemall.com

---

## Newsletter Structure (Every Issue)

Fixed four-section format. Consistent every issue so readers know what to expect and can scan fast.

### Subject Line
- Pulled from the top insight. Specific and curiosity-driven.
- Never generic ("Your Bi-Weekly Digest", "This Week's Highlights")
- Claude generates 3 subject line candidates per issue. System auto-selects the most specific one, or Anton picks manually.
- Examples of good subject lines:
  - "The pricing mistake that costs most founders 5x revenue"
  - "Hormozi spent $100M learning this about hiring"
  - "Why the best CEOs make fewer decisions, not more"

### Section 1: Top Insight
The most powerful idea from the last two weeks of processed episodes. 2-3 sentences of sharp explanation. Attributed to the episode and guest. Ends with a link to the free ebook.

### Section 2: Surprising Insight or Stat
One thing that challenges assumptions or is unexpected. A number, a counterintuitive finding, a contrarian take. 1-2 sentences. Stands alone, no link needed.

### Section 3: Actionable Tip
One specific, concrete thing the reader can do or apply. Not vague advice. Framed as direct instruction.

### Section 4: Exercise or Challenge
A personal development prompt tied to the fortnight's themes. Framed as an invitation.
- "Reflect on this: ..."
- "Make a list of ..."
- "This week, track ..."
- "Ask yourself: ..."

### Footer
- Links to all ebooks published in this period (episode title + podcast name + download link)
- Simple line: "All ebooks are free. Grab them at icantlistentothemall.com"
- Unsubscribe link
- Site URL

---

## Email Template Design

### Principles
- Single column, max width 600px
- System fonts only (custom fonts don't load reliably in email clients)
- Off-white background `#FAF8F5` matching the brand
- Deep navy text `#1A2332`
- Accent colour used sparingly: section dividers, header line
- No images except the logo (images get blocked by default in many clients)
- Generous padding between sections
- Mobile-first: most people read email on phones

### Built With
- React Email (part of the Next.js ecosystem)
- Template compiled to bulletproof HTML that works across Gmail, Apple Mail, Outlook, etc.
- Single template, content injected dynamically per issue

---

## Anti-Slop Writing Rules

All newsletter content (and all written outputs across the platform) must pass through anti-slop rules based on the stop-slop framework by Hardik Pandya (https://github.com/hardikpandya/stop-slop). These rules are baked into every writing prompt in the Claude pipeline.

### Core Rules

1. **Cut filler phrases.** No throat-clearing openers: "Here's the thing:", "It turns out", "The uncomfortable truth is", "Let me be clear", "Here's why that matters". State the point directly.

2. **Kill emphasis crutches.** Never use: "Full stop.", "Period.", "Let that sink in.", "This matters because", "Make no mistake". If the point is strong, it doesn't need a crutch.

3. **Break formulaic structures.** No binary contrasts ("It's not X, it's Y"). No negative listings ("It's not about X. It's not about Y. It's about Z."). No dramatic fragmentation. No rhetorical setups ("What if I told you..."). State Y directly.

4. **Active voice only.** Every sentence needs a human subject doing something. No passive constructions. No inanimate objects performing human actions ("the insight reveals", "the data suggests", "the framework enables").

5. **Be specific.** No vague declaratives ("The reasons are structural", "The implications are significant"). Name the specific thing. No lazy extremes ("every", "always", "never") doing vague work.

6. **Put the reader in the room.** No narrator-from-a-distance voice. "You" beats "People." Specifics beat abstractions.

7. **Vary rhythm.** Mix sentence lengths. Two items beat three. End paragraphs differently. No em dashes.

8. **Trust readers.** State facts directly. Skip softening, justification, hand-holding. No "it's worth noting that" or "interestingly" or "importantly."

9. **Kill adverbs.** Remove all adverbs. If the verb needs an adverb to work, pick a stronger verb.

10. **Cut quotables.** If a sentence sounds like a pull-quote or a motivational poster, rewrite it. Real insight doesn't need packaging.

### Banned Business Jargon
Replace with plain language:
- "Navigate challenges" → handle, address
- "Unpack" → explain, examine
- "Lean into" → accept, embrace
- "Landscape" → market, field, area
- "Stakeholder" → (name the actual person or group)
- "Leverage" → use
- "Ecosystem" → (name the actual system)
- "At the end of the day" → (delete entirely)
- "Game-changer" → (describe the specific change)
- "Deep dive" → (just explain the thing)
- "Double down" → commit, increase
- "Move the needle" → improve, increase
- "Circle back" → return to, revisit
- "Holistic" → complete, full
- "Synergy" → (describe the actual benefit)

### Banned Sentence Starters
Never begin a sentence with:
- "What...", "When...", "Where...", "While...", "Which..." (Wh- words)
- "Here's the thing..."
- "The truth is..."
- "It's worth noting..."
- "Interestingly..."
- "At the end of the day..."

### Self-Review Scoring (Applied to All Written Output)
Rate 1-10 on each dimension:

| Dimension | Question |
|---|---|
| Directness | Statements or announcements? |
| Rhythm | Varied or metronomic? |
| Trust | Respects reader intelligence? |
| Authenticity | Sounds human? |
| Density | Anything cuttable? |

Target: 35/50 minimum. Below that: rewrite.

### Anti-Slop Quick Checklist (Run Before Publishing)
- [ ] Any adverbs? Kill them.
- [ ] Any passive voice? Find the actor, make them the subject.
- [ ] Inanimate thing doing a human verb? Name the person.
- [ ] Sentence starts with a Wh- word? Restructure.
- [ ] Any "here's what/this/that" throat-clearing? Cut to the point.
- [ ] Any "not X, it's Y" contrasts? State Y directly.
- [ ] Three consecutive sentences match length? Break one.
- [ ] Paragraph ends with punchy one-liner? Vary it.
- [ ] Em dash anywhere? Remove it.
- [ ] Vague declarative? Name the specific implication.
- [ ] Sounds like a motivational poster? Rewrite.

---

## Bi-Weekly Automation

### How It Works
1. Every 14 days, the Railway cron job triggers newsletter generation
2. Worker pulls all `newsletter_material` from episodes processed in the last 14 days
3. Sends material to Claude with the newsletter prompt + anti-slop rules
4. Claude generates the four sections + 3 subject line candidates
5. Claude self-reviews against the anti-slop checklist and the 35/50 scoring threshold
6. If it passes: newsletter stored as draft in Supabase, Anton notified via email
7. Anton reviews and approves (or edits)
8. On approval: Resend sends to all active subscribers

### Future: Full Automation
Once Anton trusts the output quality (after ~10-15 issues reviewed manually):
- Remove the manual approval step
- Claude self-reviews + auto-sends
- Anton still receives a copy of every issue for monitoring
- Can revert to manual approval at any time

### Scheduling
- Newsletter sends on a fixed day (suggest: Tuesday or Wednesday morning, when open rates are highest)
- Bi-weekly cadence: every other week
- If fewer than 2 episodes were processed in a period, skip that issue and notify Anton

---

## GDPR Compliance

### Requirements (EU/Sweden)
- **Double opt-in**: confirmation email before any marketing is sent ✓
- **Consent timestamp**: stored in Supabase subscriber record ✓
- **Unsubscribe**: one-click, instant, in every email ✓
- **Privacy policy**: published on the site at /privacy, explaining:
  - What data is collected (email address only)
  - How it's used (bi-weekly newsletter only)
  - Who has access (Anton only, no third-party sharing)
  - How to unsubscribe (one-click link in every email)
  - Data retention (unsubscribed emails deleted after 30 days)
- **No list sharing**: subscriber emails never shared with anyone
- **Data deletion**: unsubscribed addresses purged from Supabase after 30 days via automated cleanup job

### Resend Handles
- List-Unsubscribe headers in email
- Bounce and complaint processing
- Suppression list management

---

## Database Schema Additions

### subscribers (updated)
- id
- email
- status: `pending` | `active` | `inactive`
- confirmation_token
- confirmed_at (consent timestamp)
- subscribed_at
- unsubscribed_at
- created_at

### newsletters
- id
- subject_line
- top_insight_text
- surprising_stat_text
- actionable_tip_text
- exercise_text
- footer_ebook_links (JSON array)
- self_review_score (JSON)
- status: `draft` | `approved` | `sent` | `skipped`
- scheduled_for
- sent_at
- episode_ids (JSON array of episodes covered)
- created_at

---

## Open Tasks
- [ ] Resend account setup and domain verification
- [ ] React Email template build (matching brand spec)
- [ ] Double opt-in flow (API routes + confirmation email)
- [ ] Welcome email template
- [ ] Newsletter generation cron job in Railway worker
- [ ] Newsletter approval flow (email notification to Anton with preview)
- [ ] Privacy policy page on site
- [ ] Test full flow: signup → confirm → receive newsletter
- [ ] Test email rendering across Gmail, Apple Mail, Outlook
