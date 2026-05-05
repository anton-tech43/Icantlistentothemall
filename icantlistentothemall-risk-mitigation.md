# Icantlistentothemall — Risk Mitigation & Content Frameworks

## Context
This document captures identified risks, their mitigations, and the content framework system for ebook structure. Written after a product review of all five core specs. Updates decisions across the project plan, pipeline, prompt engineering, newsletter, and site design specs.

---

## Risk Mitigations

### 1. Human Review of Ebook Outlines

**Risk:** Claude reviews Claude. The self-review catches bad writing but can't catch "you focused on the wrong thing entirely."

**Mitigation:** After Pass 2 (structure), Anton receives an email with:
- The episode title, guest, and podcast
- The chapter outline with subheaders
- A one-line summary of each chapter's core insight

Anton scans it in ~60 seconds. If the outline aligns with the episode description and makes sense, he approves. If something looks off, he listens to the relevant section of the episode and flags corrections before Pass 3 runs.

**Phase-out plan:** Once the prompts are proven over 30+ episodes with minimal corrections needed, switch to auto-approve with spot checks.

---

### 2. Audio URL Resilience

**Risk:** Podcast hosts may use expiring URLs, token-gated CDNs, or change hosting providers. URL passthrough to Deepgram silently fails.

**Mitigation:**
- Build the temporary download fallback as a first-class path from day one, not an afterthought
- Test both URL passthrough and direct download routes before launch
- Add a health check: if a subscribed podcast hasn't produced a processable episode in 30 days, flag it for investigation
- Log every transcription attempt with success/failure status for monitoring

---

### 3. Delayed Email Gate on Downloads

**Risk:** Gating ebook downloads behind email too early feels extractive when the library is small and the brand is unknown.

**Mitigation:**
- Launch with all ebooks as free downloads, no email required
- Track downloads per episode via simple analytics (no email needed for this)
- Once the library reaches ~50 ebooks and the site has steady organic traffic, introduce the email gate
- The newsletter signup form still appears everywhere on the site — people can subscribe voluntarily before the gate exists

---

### 4. Reader Feedback Loop & Analytics

**Risk:** No signal from readers on what's working. Flying blind on content quality and audience preferences.

**Mitigation:**
- **Analytics:** Add Plausible or Umami (privacy-friendly, no cookie banner needed). Track:
  - Page views per episode
  - PDF downloads per episode (download button click events)
  - Newsletter signup conversion rate by page
  - Most viewed podcasts / episodes
- **Newsletter metrics:** Resend provides open rates and click rates per issue. Track which sections get clicked.
- **Review cadence:** Monthly, review the top 10 and bottom 10 episodes by downloads. Look for patterns: which podcasts, which formats, which topics perform best.
- **Inform curation:** After 2 months of data, use download patterns to decide which new podcasts to add and which underperforming ones to consider dropping.

---

### 5. Quality Threshold & Episode Skipping

**Risk:** Some episodes will make bad books. Panel discussions, rambling conversations, thin content. Publishing them dilutes the brand.

**Mitigation:**
- After Pass 1 (extraction), count the number of substantive insights extracted
- If fewer than 6 distinct insights: flag for manual review before continuing
- Anton decides: process it (maybe with a shorter page count), or skip it entirely
- Skipped episodes are logged but never published

**Self-rating on published ebooks:**
Every ebook includes a short honest note on the detail page and inside the PDF. Not a star rating — a transparency note that sets expectations.

Examples:
- "This was a dense, focused conversation. The ebook captures the core frameworks and key takeaways."
- "This episode covered a lot of ground. We focused on the three most actionable ideas discussed."
- "A tactical episode. The ebook distils the specific strategies into a step-by-step format."

This builds trust. Readers know what to expect before they start reading. It also signals editorial care — someone is thinking about what makes it into print.

---

### 6. Initial Library at Launch

**Risk:** Site launches with too few ebooks, feels empty and unproven.

**Mitigation:**
- Before launch, select 10 of the best episodes from the past year across subscribed podcasts
- Process them through the full pipeline
- Launch with a library of 10 ebooks on day one
- 10 is enough to demonstrate value without overwhelming. Ongoing production adds roughly one per week.

---

### 7. Dual-Claude Quality Check (Early Phase)

**Risk:** A single Claude instance may miss key insights or focus on the wrong parts of a transcript.

**Mitigation (v1 only — first 30 episodes):**
- Run Pass 1 (extraction) through two separate Claude calls with slightly different prompt angles:
  - Instance A: standard extraction prompt (focused on insights and frameworks)
  - Instance B: alternative prompt (focused on surprising claims, contrarian ideas, and specific data points)
- Compare the outputs before Pass 2
- If both instances identify the same core themes: high confidence, proceed automatically
- If they diverge significantly on what matters: flag for Anton's review
- Roughly doubles Pass 1 cost (~$0.50-1.00 extra per episode)

**Phase-out:** Once prompts are stable and producing consistent results across 30+ episodes, drop Instance B and run single-pass extraction.

---

## Content Frameworks for Ebook Structure

Instead of letting Claude decide the book structure from scratch every time, the system selects from a set of proven frameworks based on the episode content. This gives every ebook a clear narrative spine and prevents meandering.

### How Framework Selection Works

1. Pass 1 extracts insights from the transcript
2. Pass 2 receives the extracted insights plus all four framework descriptions
3. Claude selects the best-fitting framework based on the content
4. Claude populates the framework with the specific insights, filling in chapters
5. If no framework fits well, Claude can propose a hybrid — but must justify why

### Framework 1: "The Big Idea"

**Best for:** Episodes that revolve around one central concept, framework, or mental model.

**Structure:**
- **Chapter 1: The problem** — What challenge or gap does this idea address? Why does it matter?
- **Chapter 2: The idea** — The concept explained clearly. What is it, how does it work, what makes it different?
- **Chapter 3: In practice** — Real examples, case studies, or applications discussed in the episode. Concrete, specific, grounded.
- **Chapter 4: Your move** — How the reader applies this. Specific steps, not vague advice.

**Example use:** An episode where a guest walks through their pricing framework, or explains a specific management philosophy.

---

### Framework 2: "The Playbook"

**Best for:** Tactical episodes packed with actionable strategies. Multiple distinct techniques or approaches.

**Structure:**
- **Chapter 1: The goal** — What outcome do these tactics serve? Frame the reader's ambition.
- **Chapters 2-5: One tactic per chapter** — Each chapter covers: what the tactic is, why it works (evidence or logic), how to do it (specific steps).
- **Final chapter: Where to start** — Of everything covered, what should the reader do first? Prioritise for them.

**Example use:** An episode listing hiring strategies, or marketing channels that work, or productivity systems.

---

### Framework 3: "The Founder's Lesson"

**Best for:** Biographical or story-driven episodes where someone shares their journey. Lessons are embedded in the narrative.

**Structure:**
- **Chapter 1: Context** — Brief background. Just enough to understand the lessons. Not a biography. 2-3 paragraphs maximum.
- **Chapters 2-4: Turning points as lessons** — Each chapter is a key moment framed as a transferable lesson. Not "what happened" but "what this teaches." The story provides context; the insight is the point.
- **Final chapter: The principle** — The overarching lesson that ties everything together. What does this founder's experience reveal about building something?

**Example use:** A Diary of a CEO episode with a founder telling their origin story, or a My First Million episode dissecting someone's path.

---

### Framework 4: "The Contrarian Take"

**Best for:** Episodes where the guest challenges conventional wisdom or presents a surprising perspective.

**Structure:**
- **Chapter 1: The accepted belief** — What most people think. State it clearly and fairly.
- **Chapter 2: Why it fails** — The evidence or argument against the conventional approach. Specific, not just contrarian for the sake of it.
- **Chapter 3: The alternative** — The guest's approach or framework. What to do instead.
- **Chapter 4: What changes** — If the reader adopts this thinking, what shifts? Practical implications.

**Example use:** An episode arguing against venture capital, or challenging hustle culture, or proposing an unconventional approach to hiring.

---

### Framework Selection Rules

- Claude must select one framework and state which one in the outline (visible to Anton during review)
- If the content genuinely doesn't fit any framework, Claude can propose a hybrid but must explain the structure and justify the choice
- The selected framework shapes the chapter structure but Claude adapts chapter titles to fit the specific content — no generic titles like "Chapter 1: The Problem"
- Subheaders within chapters are always specific to the episode content

---

## Page Count: A Ceiling, Not a Floor

The 10-page target is a maximum. If an episode only yields 4-6 pages of genuine insight, publish 4-6 pages.

**Rules:**
- Minimum: 4 pages (below this, the episode probably shouldn't have been processed)
- Maximum: 10 pages
- Every page must contain at least one real insight or actionable piece of information
- Padding is a quality failure. If a section doesn't teach something, cut it.
- The self-rating note on the ebook sets expectations about length and depth

**Quality test:** Would you read this page if it were the only page? If no, it's padding. Remove it.

---

## Updated Pipeline Flow (Incorporating Mitigations)

```
1. Cron fires (every 6 hours)
2. Check RSS feeds for new episodes
3. New episode detected (duration ≥ 35 min):
   a. Attempt Deepgram URL passthrough transcription
   b. If fails: fallback to temporary download + upload
   c. Store transcript in DB

4. Pass 1 — Dual Extraction (first 30 episodes):
   a. Instance A: standard extraction prompt
   b. Instance B: alternative angle prompt
   c. Compare outputs
   d. If aligned: proceed
   e. If divergent: flag for Anton's review → Anton approves/corrects → proceed
   (After 30 episodes: drop to single instance)

5. Quality threshold check:
   a. Count substantive insights extracted
   b. If ≥ 6 insights: proceed
   c. If < 6 insights: flag for Anton → approve (shorter book) or skip

6. Pass 2 — Structure:
   a. Claude receives extracted insights + four framework descriptions
   b. Selects best framework, produces chapter outline
   c. Outline emailed to Anton for review (~60 second scan)
   d. Anton approves or flags corrections

7. Pass 3 — Write:
   a. Summary (3-5 sentences)
   b. Ebook content (4-10 pages, using selected framework)
   c. Newsletter material (top insight, surprising stat, actionable tip, exercise)

8. Self-review:
   a. Anti-slop checklist
   b. Quality scoring (35/50 minimum)
   c. Self-rating note generated for the ebook
   d. If passes: generate PDF, publish to site
   e. If fails after retry: flag for manual review

9. Every 14 days: newsletter generation + Anton approval + send
```

---

## Open Tasks (New from This Document)
- [ ] Build dual-extraction comparison logic for Pass 1
- [ ] Build quality threshold check (insight count) after Pass 1
- [ ] Build outline review email notification for Pass 2
- [ ] Implement self-rating note generation for each ebook
- [ ] Set up Plausible/Umami analytics on the site
- [ ] Add download tracking (click events on PDF download buttons)
- [ ] Process 10 back-catalogue episodes before launch
- [ ] Define the 10 launch episodes (best-of from subscribed podcasts)
- [ ] Build audio URL health check (30-day inactivity flag)
- [ ] Build fallback download path as first-class pipeline option
