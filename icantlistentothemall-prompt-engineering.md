# Icantlistentothemall — Prompt Engineering Spec

## Context
This document details the AI prompt strategy for turning podcast transcripts into three content outputs: a quick summary, a 10-page ebook (PDF), and a bi-weekly newsletter. This is a companion to the main project plan.

---

## Editorial Principles (apply to ALL outputs)

- **Insights over entertainment.** We extract what's useful, not what's fun to listen to. Off-topic tangents, banter, ads, and filler get cut entirely.
- **Quality is non-negotiable.** Every output goes through a Claude self-review pass. Better to be slow and good than fast and mediocre.
- **Tone: sharp colleague over coffee.** Not academic, not robotic, not overly casual. The reader is ambitious and busy — respect their time.
- **Third person when referencing people.** Never "I did this" from the guest's perspective. Always "She launched the company in 2019" or "Hormozi describes the approach as..."
- **No storytelling for storytelling's sake.** If a person's story is referenced, it's because the insight requires context, not because the story is entertaining.

---

## Transcript Processing Strategy

### The Problem
A 2-hour podcast produces ~20,000-30,000 words of transcript. This is too long for a single Claude call and contains a lot of noise (filler, repetition, off-topic chat).

### The Approach: Three-Pass Pipeline

**Pass 1 — Chunking & Extraction**
Split the transcript into logical chunks (by topic/theme, not arbitrary word count). Claude reads each chunk and extracts:
- Core insights and ideas
- Key facts, stats, and data points
- Actionable advice or frameworks
- Notable quotes worth preserving (for attribution in the book)
- What topic/theme this chunk covers

Prompt direction: "You are an editorial researcher. Your job is to extract only the substantive insights from this podcast transcript section. Ignore small talk, filler, ads, repeated points, and off-topic tangents. For each insight, note the topic it belongs to."

**Pass 2 — Structure & Synthesis**
Claude receives all extracted insights from Pass 1 and:
- Groups them into 4-8 logical themes/chapters
- Identifies the narrative arc (what order makes the most sense for a reader)
- Flags any gaps or weak sections
- Produces a detailed chapter outline with subheaders

Prompt direction: "You are a book editor. Take these extracted insights and organise them into 4-8 chapters that flow logically. Each chapter should have a clear theme and 2-4 subheaders. Think of this as a mini business book, not a transcript summary. The structure should make sense to someone who never heard the podcast."

**Pass 3 — Writing**
Claude takes the outline and writes the final content for each output (summary, book, newsletter material). Each output has its own prompt — detailed below.

### Quality Gate: Self-Review
After each Pass 3 output, Claude reviews its own work against these criteria:
- Does every paragraph contain a genuine insight or actionable information?
- Is there any filler, repetition, or vague language?
- Would a busy founder find this worth their time?
- Are facts and attributions accurate to the source transcript?
- Rate 1-10 on insight density. If below 7, rewrite.

---

## Output 1: Quick Summary

### Purpose
Help someone decide in 30 seconds whether this episode's ebook is worth downloading. Also works standalone for people who just want the gist.

### Format
- 3-5 sentences maximum
- Opens with the single most compelling insight or takeaway
- Mentions the guest/topic for context
- Ends with a hook toward the ebook ("The full breakdown covers X, Y, and Z")
- No headers, no bullet points — just a tight paragraph

### Prompt Direction
"Write a 3-5 sentence summary of this podcast episode's key insights. Lead with the single most valuable takeaway. Mention who was featured and the core topic. End by referencing 2-3 specific things covered in the full ebook to encourage download. The ebook is free — no sales language needed, just make it clear there's more depth available. Tone: sharp, direct, zero fluff."

### Example Quality Bar
"Most founders price based on cost. Alex Hormozi argues that's leaving 5-10x revenue on the table. His value-based pricing framework ties price directly to the measurable outcome your customer gets — and he walks through exactly how to calculate it. The full breakdown covers the pricing formula, three common objections and how to handle them, and why free trials are killing your margins."

---

## Output 2: 10-Page Ebook (PDF)

### Purpose
The main product. A structured, insight-dense mini book that delivers the podcast's value in readable form. Should feel like a proper short book, not a transcript.

### Format
- 4-8 chapters with clear titles
- Each chapter has 2-4 subheaders
- Body text is clean prose paragraphs — no bullet point lists
- Third person throughout
- Direct quotes used sparingly and only when they add genuine punch (attributed with name)
- Approximately 10 pages when formatted as PDF
- No table of contents (too short to need one) — but a strong opening paragraph that frames what the reader will learn

### Structure Template
```
Opening paragraph — frames the core theme and what the reader will take away

Chapter 1: [Theme]
  Subheader 1.1
  Subheader 1.2

Chapter 2: [Theme]
  Subheader 2.1
  Subheader 2.2
  Subheader 2.3

... (4-8 chapters total)

Closing section — ties insights together, ends with a forward-looking thought
```

### Prompt Direction
"You are writing a short business book based on extracted podcast insights. This is NOT a transcript summary — it's a standalone guide that should read as if it were written as a book from the start. Structure it into 4-8 chapters with descriptive subheaders. Write in clean prose paragraphs. Use third person when referencing people. Include direct quotes only when they genuinely add impact — no more than 2-3 per chapter. Every paragraph must contain a real insight or actionable idea. Cut anything that doesn't teach the reader something. Aim for approximately 4,000-5,000 words total. Open with a framing paragraph, close with a synthesis."

### What to Cut
- Personal anecdotes that don't serve an insight
- Repeated points (pick the best articulation, drop the rest)
- Interviewer's reactions and follow-ups
- Promotional content, sponsor mentions
- "Let me tell you a story" setups — just deliver the insight

### What to Keep
- Frameworks, models, mental models
- Specific numbers, stats, data points
- Counterintuitive insights
- Actionable advice with clear steps
- Lessons from failure (with context, not as entertainment)

---

## Output 3: Bi-Weekly Newsletter

### Purpose
A personal development nudge delivered every two weeks. Aggregates insights from recently processed episodes. Should feel curated and useful — something people look forward to opening.

### Format — Fixed Structure Every Issue

**Section 1: Top Insight**
The single most powerful idea from the last two weeks of processed episodes. 2-3 sentences of sharp explanation. Attributed to the episode/guest. Links to the full ebook for anyone who wants more.

**Section 2: Surprising Insight or Stat**
One thing that challenges assumptions or is genuinely unexpected. Could be a number, a counterintuitive finding, or a contrarian opinion from a guest. 1-2 sentences.

**Section 3: Actionable Tip**
One specific, concrete thing the reader can do or apply. Not vague ("think about your goals") — specific ("calculate your hourly rate by dividing your target annual income by 2,000 hours, then ask if your current tasks are worth that rate").

**Section 4: Exercise or Challenge**
A personal development prompt tied to the fortnight's themes. Framed as an invitation, not homework. Examples:
- "Reflect on this: when was the last time you raised your prices? What stopped you?"
- "Make a list of the five decisions you've been avoiding. Pick the smallest one and make it today."
- "This week, track how you spend your first hour each morning. No judgement — just observe."

**Footer**
Links to all ebooks published in this period. Simple line: "Want the full deep-dive? Grab the free ebooks: [links]"

### Prompt Direction
"You are writing a bi-weekly newsletter for ambitious, business-minded readers. You have summaries and key insights from [X] podcast episodes processed in the last two weeks. Select the strongest material and structure it into exactly four sections: Top Insight (2-3 sentences, the most powerful idea), Surprising Insight or Stat (1-2 sentences, something counterintuitive), Actionable Tip (specific and concrete, not vague), and Exercise or Challenge (a personal development prompt — reflective or action-oriented). Tone is warm but sharp. This should feel like it was curated by a thoughtful person, not generated by AI. End with links to the free ebooks."

### Quality Bar for Newsletter
- Would you forward this to a friend? If no, rewrite.
- Is the actionable tip actually actionable in under 5 minutes? If no, make it more specific.
- Does the exercise make someone pause and think? If no, dig deeper.

---

## Handling Different Podcast Formats

### Interview (most common — Diary of a CEO, Tim Ferriss, etc.)
- Focus on the guest's insights and expertise
- Interviewer questions become invisible — they inform structure but aren't referenced
- Guest's stories are kept only when they deliver an insight

### Solo/Monologue
- Follow the host's argument structure
- Often more structured already — the chapter breakdown may mirror the original
- Watch for repetition — solo hosts tend to circle back to the same point

### Panel/Roundtable
- Extract points of agreement and disagreement
- Attribute insights to specific panellists
- Structure by theme, not by speaker

### Tag podcasts by format when subscribing so the pipeline uses the right prompt variant.

---

## Open Prompt Engineering Tasks
- [ ] Write and test exact prompts for each pass (1, 2, 3)
- [ ] Test with 3-5 real episodes from different podcasts
- [ ] Calibrate the self-review scoring — what does a "7" actually look like?
- [ ] Determine optimal chunk size for Pass 1
- [ ] Build a prompt for format detection (interview vs solo vs panel)
- [ ] Test newsletter generation with real multi-episode input
