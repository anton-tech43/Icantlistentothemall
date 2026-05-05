# Icantlistentothemall — AI Strategy Addendum

## Context
This document captures AI-specific improvements identified during an AI strategy review. It includes the actual prompts for manual testing, podcast-level context descriptions, prompt versioning strategy, modified anti-slop calibration, the fifth content framework, split self-review, and A/B testing capability. Read alongside the prompt engineering spec and technical addendum.

---

## Priority Zero: Manual Prompt Test

Before any agent writes pipeline code, run these prompts manually against 3 real transcripts. Budget 2-3 days. This will rewrite at least half of the prompt engineering spec.

### How to Get Test Transcripts
- YouTube auto-captions: find the podcast episode on YouTube, use a transcript extractor (e.g., tactiq.io, youtubetranscript.com)
- Or paste the YouTube URL into Claude and ask it to work with the transcript
- Pick 3 different episode types:
  1. A focused interview (one guest, one core topic — e.g., a Hormozi episode about pricing)
  2. A rambling long-form conversation (wide-ranging, lots of tangents — e.g., a Diary of a CEO episode)
  3. A tactical how-to episode (multiple concrete strategies — e.g., a My First Million episode on business ideas)

### Test Procedure
For each transcript:
1. Run Pass 1 (extraction) — read the output, mark what it got right and wrong
2. Run Pass 2 (structuring) — check the framework selection and chapter outline
3. Run Pass 3 (summary) — read it, does it capture the episode?
4. Run Pass 3 (ebook) — read all of it, is this something you'd actually want to read?
5. Run the self-review — does the score match your own assessment?

Take notes on every prompt. What worked, what missed, what needs changing. These notes become the v2 prompts.

---

## The Actual Prompts

### Pass 1: Extraction Prompt

This is sent once per transcript chunk. The podcast context (see section below) is prepended.

```
[PODCAST CONTEXT INSERTED HERE]

You are an editorial researcher extracting the substantive content from a podcast transcript chunk. Your job is to separate signal from noise.

EXTRACT:
- Core insights: ideas, arguments, or perspectives that teach the reader something. Each insight should be a distinct point, not a rephrasing of a previous one.
- Specific facts and data: numbers, statistics, dates, financial figures, research findings. Include the exact figure and its context.
- Frameworks and mental models: any structured way of thinking about a problem that the guest describes. Name it if they name it, describe it if they don't.
- Actionable advice: specific things a listener could do. Must be concrete enough to act on without further research.
- Notable direct quotes: only if the exact wording carries meaning that a paraphrase would lose. Maximum 3 per chunk. Include the speaker's name.
- Topic label: in 2-5 words, what is this chunk about?

IGNORE:
- Small talk, greetings, pleasantries
- Ads, sponsor reads, promotional segments
- The host restating what the guest just said
- The guest repeating the same point in different words (extract it once, pick the clearest articulation)
- Stories told purely for entertainment without a transferable lesson
- Vague statements with no specific content ("it was really hard" without saying what was hard or what they learned)

FORMAT:
Return your extraction as structured text:

TOPIC: [2-5 word topic label]

INSIGHTS:
1. [First distinct insight — one clear sentence]
2. [Second distinct insight]
... (as many as genuinely exist, do not pad)

FACTS & DATA:
- [Specific fact with context]
... (only if present in this chunk)

FRAMEWORKS:
- [Name/description of framework]: [brief explanation of how it works]
... (only if present in this chunk)

ACTIONABLE ADVICE:
- [Specific action the reader could take]
... (only if present in this chunk)

NOTABLE QUOTES:
- "[Exact quote]" — [Speaker name]
... (maximum 3, only if the exact wording matters)

If a chunk contains very little substantive content (mostly filler, tangents, or repetition), return:

TOPIC: [topic label]
LOW SUBSTANCE: This chunk primarily contains [brief description of what's in it]. No significant new insights.
```

### Pass 1: Alternative Extraction Prompt (Instance B — for dual-Claude comparison)

```
[PODCAST CONTEXT INSERTED HERE]

You are a contrarian editorial researcher. Your job is to find what most people would miss in this podcast transcript chunk.

Look specifically for:
- Claims that contradict conventional wisdom or popular advice
- Specific numbers, dollar amounts, percentages, or timeframes that are surprising
- Admissions of failure, mistakes, or things the speaker would do differently
- Advice that is counterintuitive or uncomfortable
- Frameworks or mental models that reframe a familiar problem
- Moments where the speaker disagrees with the host or qualifies a popular idea

Do NOT extract:
- Commonly known advice (e.g., "work hard", "hire good people", "focus on customers")
- Vague inspirational statements without specific backing
- Points that have been made many times in other podcasts
- Stories without a clear, transferable lesson

FORMAT:
Return your extraction as:

TOPIC: [2-5 word topic label]

CONTRARIAN OR SURPRISING INSIGHTS:
1. [Insight that challenges assumptions — one clear sentence, include the specific evidence or reasoning]
2. [Next insight]
...

SPECIFIC DATA POINTS:
- [Number/fact with context — only genuinely surprising or specific ones]
...

FAILURES & MISTAKES DISCUSSED:
- [What went wrong and what was learned]
...

UNCOMFORTABLE ADVICE:
- [Advice most people wouldn't want to hear]
...

If this chunk contains nothing surprising, counterintuitive, or specific, return:

TOPIC: [topic label]
CONVENTIONAL: This chunk covers familiar territory. No surprising insights found.
```

### Pass 1: Comparison Prompt (Third Claude call)

```
You are an editorial quality checker. You have two independent extractions from the same podcast transcript chunk. Your job is to assess agreement and identify which extraction is stronger.

EXTRACTION A (standard):
[Insert Instance A output]

EXTRACTION B (contrarian angle):
[Insert Instance B output]

Evaluate:

1. AGREEMENT SCORE (1-10):
- 9-10: Both identified the same core insights. Minor phrasing differences only.
- 7-8: Strong overlap on main themes. One caught 1-2 insights the other missed.
- 5-6: Moderate agreement. Both captured some shared ideas but each has significant unique material.
- 3-4: Weak agreement. Focused on different aspects of the conversation.
- 1-2: Almost no overlap. Fundamentally different interpretations.

2. CONSENSUS INSIGHTS: List insights that both extractions agree on (even if worded differently).

3. UNIQUE TO A: Insights only in Extraction A.

4. UNIQUE TO B: Insights only in Extraction B.

5. STRONGER EXTRACTION: Which extraction captured the most important content? A or B? Explain in one sentence why.

6. RECOMMENDED ACTION:
- If agreement ≥ 7: "PROCEED — use the union of both extractions"
- If agreement 5-6: "PROCEED WITH FLAG — review recommended but not required"
- If agreement < 5: "PAUSE — manual review needed before continuing"

7. MERGED EXTRACTION: Combine the best of both extractions into a single, deduplicated list of insights, facts, frameworks, and advice. Remove any duplicates. Keep the stronger articulation when both captured the same point.
```

### Pass 2: Structuring Prompt

```
You are a book editor. You have extracted insights from a full podcast episode. Your job is to organise them into a short, focused ebook structure.

EXTRACTED MATERIAL:
[Insert all merged extractions from Pass 1]

EPISODE INFO:
- Title: [episode title]
- Guest: [guest name]
- Podcast: [podcast name]
- Format: [interview / solo / panel]

AVAILABLE FRAMEWORKS:

FRAMEWORK 1 — "The Big Idea": For episodes revolving around one central concept.
Structure: The problem → The idea → In practice → Your move (4 chapters)

FRAMEWORK 2 — "The Playbook": For tactical episodes with multiple actionable strategies.
Structure: The goal → One tactic per chapter → Where to start (4-6 chapters)

FRAMEWORK 3 — "The Founder's Lesson": For biographical/story-driven episodes.
Structure: Brief context → Turning points as lessons → The overarching principle (4-5 chapters)

FRAMEWORK 4 — "The Contrarian Take": For episodes challenging conventional wisdom.
Structure: The accepted belief → Why it fails → The alternative → What changes (4 chapters)

FRAMEWORK 5 — "Three Things Worth Knowing": For unfocused episodes with multiple unrelated strong insights.
Structure: 3 standalone chapters, each covering one idea completely. No connecting narrative. (3 chapters)

YOUR TASK:

1. Select the framework that best fits the extracted material. State which one and explain your choice in one sentence.

2. If no framework fits cleanly, select "Three Things Worth Knowing" and pick the 3 strongest standalone insights.

3. Produce a chapter outline:
   - Chapter number and title (specific to this episode's content, not generic)
   - 2-4 subheader titles per chapter
   - For each chapter: a one-sentence summary of what the reader will learn
   - A one-sentence pull-forward (the single most important sentence of that chapter — this will appear at the top of the chapter in the ebook)

4. Estimate page count: how many pages of genuine insight does this material support? Minimum 4, maximum 10. Do not pad. If the material only supports 5 pages, say 5.

5. Flag any gaps: are there sections in the outline that feel thin? Any chapters where the extracted material is weak? Note these so they can be addressed.

FORMAT:
FRAMEWORK SELECTED: [name] — [one sentence justification]
ESTIMATED PAGES: [number]

CHAPTER 1: [Title]
  Pull-forward: [one sentence — the key idea of this chapter]
  Summary: [what the reader will learn]
  Subheaders:
    - [Subheader 1]
    - [Subheader 2]
    - [Subheader 3]

CHAPTER 2: [Title]
  ...

[continue for all chapters]

GAPS OR CONCERNS: [any flags about thin sections or structural issues, or "None"]
```

### Pass 3: Summary Prompt

```
You are writing a 3-5 sentence summary of a podcast episode for readers deciding whether to download the full ebook.

EPISODE: [title]
GUEST: [guest name]
PODCAST: [podcast name]
CHAPTER OUTLINE: [insert outline from Pass 2]
KEY INSIGHTS: [insert top 5 insights from extraction]

RULES:
- Lead with the single most valuable takeaway. Not "this episode covers..." — state the insight directly.
- Mention who was featured and the core topic naturally, not as metadata.
- End by referencing 2-3 specific things covered in the full ebook. The ebook is free, so no sales language — just make it clear there's more depth.
- Maximum 5 sentences. Every sentence must earn its place.
- Write in third person.
- No throat-clearing ("In this episode..."), no emphasis crutches ("This is a must-read"), no vague language.
- Active voice. Specific nouns. Concrete details.
```

### Pass 3: Ebook Writing Prompt

```
You are writing a short ebook based on podcast insights. This is the main product — it must be worth the reader's time.

EPISODE: [title]
GUEST: [guest name]  
PODCAST: [podcast name]
FRAMEWORK: [selected framework]
CHAPTER OUTLINE: [insert full outline from Pass 2]
EXTRACTED INSIGHTS: [insert all merged extractions]
ESTIMATED PAGES: [number from Pass 2]

STRUCTURE RULES:
- Follow the chapter outline exactly. Do not add or remove chapters.
- Each chapter opens with the chapter number (e.g., "Chapter 1") and title, followed by the pull-forward sentence in a separate line.
- Each chapter has 2-4 subheaders as specified in the outline.
- Write in prose paragraphs. No bullet point lists anywhere in the body text.
- Third person when referencing people. Never "I" from the guest's perspective.
- Direct quotes used sparingly — maximum 2-3 per chapter, only when the exact wording genuinely adds impact that a paraphrase would lose. Always attributed.

CONTENT RULES:
- Every paragraph must contain a real insight, a specific fact, or actionable information. No filler.
- If a section doesn't teach something, cut it. A 5-page ebook with dense content beats a 10-page ebook with padding.
- Stay faithful to the source material. Do not invent claims, statistics, or advice that wasn't in the transcript.
- When the guest described a framework or process, explain it step by step. Don't summarise steps — lay them out so the reader can follow.
- Include specific numbers, data points, and examples from the transcript. These are what make the content credible.

WRITING RULES:
- Active voice. Human subjects doing things. No inanimate objects performing actions ("the framework enables", "the insight reveals").
- No throat-clearing openers: "Here's the thing", "It turns out", "The truth is". State the point directly.
- No emphasis crutches: "Full stop", "Let that sink in", "This matters because".
- No binary contrasts: "It's not X, it's Y". State Y directly.
- No business jargon: "leverage", "navigate", "unpack", "ecosystem", "landscape". Use plain language.
- Vary sentence lengths. Mix short and long. Two items beat three.
- No em dashes.
- Trust the reader's intelligence. Don't over-explain, don't soften, don't hedge.

BUT ALSO:
- Don't sacrifice impact for sterility. Clean writing that says nothing is worse than lively writing with a few imperfections.
- If a sentence teaches something genuine, the way it's phrased matters less than the rules above suggest. Keep the insight, adjust the phrasing.
- The reader should feel like they learned something real, not like they read a sanitised report.

OPENING:
- Begin with a framing paragraph (no chapter label). 2-3 sentences that set up what the reader will learn and why it matters. Not a summary of the episode — a framing of the ideas.

CLOSING:
- End with a short closing section (no chapter label). Tie the key insights together. End with a forward-looking thought or a question that stays with the reader. Not a generic "in conclusion" wrap-up.

Write the complete ebook content now.
```

### Pass 3: Newsletter Material Extraction Prompt

```
You are extracting newsletter material from a processed podcast episode. The newsletter is a bi-weekly digest for ambitious, business-minded readers.

EPISODE: [title]
GUEST: [guest name]
PODCAST: [podcast name]
FULL SUMMARY: [insert summary from Pass 3]
KEY INSIGHTS: [insert top insights from extraction]
CHAPTER OUTLINE: [insert outline from Pass 2]

Extract exactly four pieces:

1. TOP INSIGHT: The single most powerful idea from this episode. Write it in 2-3 sentences. Sharp, direct, specific. Attribute to the guest/episode. This should make someone stop scrolling.

2. SURPRISING STAT OR INSIGHT: One thing that challenges assumptions or is genuinely unexpected. A number, a counterintuitive finding, a contrarian position. 1-2 sentences. Must stand alone without context.

3. ACTIONABLE TIP: One specific, concrete thing the reader can do. Not "think about your goals" — specific enough to act on in under 5 minutes. Framed as direct instruction. One action, clearly stated.

4. EXERCISE OR CHALLENGE: A personal development prompt tied to this episode's themes. Frame as an invitation, not homework. Use one of these formats:
   - "Reflect on this: [question that makes them pause]"
   - "Make a list of [specific thing related to the episode's theme]"
   - "This week, [specific observation or action challenge]"
   - "Ask yourself: [pointed question]"

RULES:
- Each piece must stand completely alone. Someone reading only the surprising stat should get full value from those 1-2 sentences.
- No throat-clearing, no emphasis crutches, no jargon.
- Active voice, specific nouns, concrete details.
- The actionable tip must be genuinely actionable by any reader regardless of their industry or role.
- The exercise should make someone pause and think for at least 30 seconds.
```

### Self-Review: Content Accuracy Review (NEW — first pass of split review)

```
You are a fact-checker reviewing an ebook against its source material.

ORIGINAL EXTRACTED INSIGHTS: [insert all extractions from Pass 1]
EBOOK CONTENT: [insert ebook text from Pass 3]

Check the following:

1. COVERAGE: List the top 5 insights from the extraction. For each one, note whether it appears in the ebook (YES/NO). If any top insight is missing, flag it.

2. ACCURACY: Read every factual claim in the ebook (numbers, dates, quotes, attributed statements). For each one, verify it matches the extraction. Flag any claim that:
   - States a number differently than the source
   - Attributes a quote or idea to the wrong person
   - Makes a claim not supported by the extracted material
   - Generalises a specific point beyond what the guest actually said

3. FABRICATION CHECK: Is there anything in the ebook that was NOT in the extracted material? Any advice, statistics, or claims that appear to have been generated rather than extracted? Flag each instance.

4. ACCURACY SCORE (1-10):
   - 9-10: All key insights covered, all facts accurate, nothing fabricated
   - 7-8: Minor omissions or one small inaccuracy
   - 5-6: A significant insight is missing or a factual error exists
   - 3-4: Multiple issues — missing insights and/or factual errors
   - 1-2: Major problems — fabricated content or fundamentally wrong focus

THRESHOLD: Score must be 7 or above to pass. Below 7: flag for rewrite with specific corrections noted.

FORMAT:
COVERAGE: [list of top 5 insights with YES/NO]
ACCURACY ISSUES: [list of any issues found, or "None"]
FABRICATION ISSUES: [list of any issues found, or "None"]
ACCURACY SCORE: [number]/10
PASS/FAIL: [PASS if ≥7, FAIL if <7]
CORRECTIONS NEEDED: [specific things to fix if FAIL, or "None"]
```

### Self-Review: Writing Quality Review (Second pass — existing review, refined)

```
You are an editorial quality reviewer. Review this text for writing quality.

TEXT TO REVIEW: [insert ebook/summary/newsletter text]
CONTENT TYPE: [ebook / summary / newsletter_material]

Rate 1-10 on each dimension:

DIRECTNESS: Does the text make statements directly, or does it announce what it's about to say? Are there throat-clearing phrases? Does every sentence get to the point?

RHYTHM: Are sentence lengths varied? Is there a mix of short and long? Or does the text feel metronomic — every sentence roughly the same length and structure?

TRUST: Does the text respect the reader's intelligence? Or does it over-explain, soften, hedge, or justify? Are there phrases like "it's worth noting" or "importantly" that signal the writer doesn't trust the point to land on its own?

AUTHENTICITY: Does this sound like it was written by a thoughtful person? Or does it sound generated? Check for: binary contrasts ("not X, it's Y"), false agency ("the insight reveals"), business jargon, emphasis crutches ("let that sink in"), narrator-from-a-distance voice.

DENSITY: Is every sentence earning its place? Could any paragraph be cut without losing information? Is there padding or repetition?

SCORING:
- [Dimension]: [Score] — [One sentence explaining the score]
- ...
- TOTAL: [sum]/50

THRESHOLD: Total must be 35 or above to pass.

SPECIFIC ISSUES: List up to 5 specific sentences or phrases that should be rewritten, with a brief note on why.

PASS/FAIL: [PASS if ≥35, FAIL if <35]
```

---

## Podcast-Level Context Descriptions

Prepend the relevant context to every Pass 1 extraction prompt for that podcast's episodes.

### Diary of a CEO (Steven Bartlett)

```
PODCAST CONTEXT: This is Diary of a CEO, hosted by Steven Bartlett. Episodes are long-form interviews (typically 90-150 minutes). Bartlett asks deep personal questions and gives guests space for extended answers. Guests often tell long stories from their lives. The most valuable insights are usually embedded inside these stories rather than stated directly — extract the lesson behind each story, not the story itself. Bartlett frequently summarises what the guest said in his own words before moving on — these restatements rarely add new information and can be skipped. The first 5-10 minutes are often personal catch-up and can be low-substance. Episodes sometimes have a "final five" rapid-fire question segment at the end that produces short, quotable answers.
```

### My First Million (Sam Parr & Shaan Puri)

```
PODCAST CONTEXT: This is My First Million, hosted by Sam Parr and Shaan Puri. Episodes feature two hosts riffing on business ideas, trends, and strategies. The format is fast-paced with frequent tangents, jokes, and asides. Valuable insights are mixed in with casual banter — separate them carefully. The hosts often brainstorm business ideas in real-time, some of which are half-baked and some genuinely insightful. Focus on extracting the ideas with specific market data or validated reasoning behind them, not every spontaneous thought. When guests appear, episodes are more focused. The hosts frequently reference specific revenue numbers, growth metrics, and business models — these specific figures are high-value content to extract.
```

### The Tim Ferriss Show

```
PODCAST CONTEXT: This is The Tim Ferriss Show. Episodes are long-form interviews (typically 90-180 minutes) with a structured approach. Ferriss often asks guests about their routines, habits, and decision-making frameworks. Look for: specific routines described step by step, book recommendations with context on why they matter, frameworks for making decisions, and lessons from specific failures. Ferriss sometimes reads prepared questions and the guest's answer is the substance — the questions themselves can be skipped. Some episodes are "5-Bullet Friday" style compilations that are shorter and more fragmented. Ferriss frequently asks "what would you put on a billboard?" or similar synthesising questions — the answers are often the most quotable and insightful moments.
```

### The Game w/ Alex Hormozi

```
PODCAST CONTEXT: This is The Game with Alex Hormozi. Episodes are often solo monologues or teachings where Hormozi walks through a specific business concept in detail. He is direct, uses specific numbers and examples from his own businesses, and tends to structure his thinking clearly. The content is highly tactical and framework-heavy. Extract the specific frameworks, step-by-step processes, and exact numbers he references. Hormozi frequently repeats his core points multiple times with different examples — extract the point once with the best example, don't duplicate. He often opens with a bold claim and then spends the episode backing it up — that opening claim is usually the core insight to capture.
```

### Lenny's Podcast (Lenny Rachitsky)

```
PODCAST CONTEXT: This is Lenny's Podcast, hosted by Lenny Rachitsky. Focused on product management, growth, and startups. Episodes are well-structured interviews with product leaders, founders, and operators. Guests tend to share specific frameworks, processes, and metrics from their work. The content skews tactical and specific rather than inspirational. Extract: named frameworks, specific metrics and benchmarks, step-by-step processes, and hiring/team advice. Lenny asks good follow-up questions that often elicit more specific answers — the follow-up answers are often higher value than the initial response. Some episodes are "listener question" format which are shorter and more fragmented.
```

---

## Fifth Content Framework: "Three Things Worth Knowing"

Added to the framework set in the risk mitigation spec.

### When to Use
For episodes that don't have one central thesis or a clean narrative arc. The conversation covered multiple interesting but unrelated topics. Forcing a connecting thread would feel artificial.

### Structure
- **Chapter 1: [First standalone insight]** — complete coverage of one idea. Context, the insight itself, why it matters, what to do with it.
- **Chapter 2: [Second standalone insight]** — same treatment, completely independent from Chapter 1.
- **Chapter 3: [Third standalone insight]** — same treatment.
- No opening framing paragraph (there's no shared theme to frame).
- No closing section that ties them together (they don't connect — be honest about that).

### Self-Rating Note for This Framework
"This conversation covered a lot of ground. We picked the three ideas most worth your time. Each chapter stands on its own."

### Typical Length
4-6 pages. This framework produces the shortest ebooks, which is correct — the episode didn't have 10 pages of connected insight, and pretending otherwise would be padding.

---

## Prompt Versioning

### Schema: prompt_versions
- id
- prompt_name: `pass_1_extraction` | `pass_1_alternative` | `pass_1_comparison` | `pass_2_structure` | `pass_3_summary` | `pass_3_ebook` | `pass_3_newsletter` | `self_review_accuracy` | `self_review_writing`
- version (integer, incrementing)
- prompt_text (full prompt)
- change_notes (what changed from previous version and why)
- is_active (boolean — only one active version per prompt_name)
- created_at

### Rules
- Every pipeline_log entry stores which prompt_version was used
- When changing a prompt: create a new version, set it as active, previous version stays in the database
- Never edit an existing version — always create new
- Change_notes are mandatory — "what did you change and why" keeps a learning record

### Correlation Analysis (Monthly)
- Compare average self-review scores before and after each prompt change
- Group by prompt_version to see which versions produced better output
- If a new version performs worse, roll back by setting the previous version as active

---

## Modified Anti-Slop Calibration

The stop-slop rules are adapted for this product's specific needs. Added as a calibration note to all writing prompts.

### Rules That Stay Strict
- No throat-clearing openers (never)
- No binary contrasts "not X, it's Y" (never)
- No business jargon (never — always plain language)
- Active voice (always — human subjects doing things)
- No em dashes (never)
- No narrator-from-a-distance voice (never)
- No false agency / inanimate subjects (never)

### Rules That Are Relaxed
- **Adverbs:** allowed when they add genuine meaning that the verb alone can't carry. "He bet recklessly" adds information that "He bet" doesn't. "He spoke passionately" doesn't add anything — cut it. The test: does removing the adverb lose specific information?
- **Emphasis:** allowed when the underlying point is strong enough and the emphasis is earned. "This one decision cost him everything" is fine because it's a factual statement with impact. "This is a game-changer" is not fine because it's empty emphasis on a vague claim.
- **Pull-quote-worthy sentences:** allowed when they capture the guest's actual insight in a way that lands. "Price the outcome, not the input" is a genuine insight stated well. Don't rewrite it into something flatter just because it sounds quotable.
- **Sentence fragments:** allowed occasionally for pacing. "Three tries. Three failures. Then the pivot." But never more than once per chapter, and only when the rhythm serves the content.

### The Calibration Test
For any sentence flagged by anti-slop rules, ask: "Does this sentence teach something or make the reader think?" If yes, keep it and adjust the phrasing only if genuinely needed. If no, cut it regardless of how well it's written.

---

## Semi-Automated Dual-Claude Tracking

### How It Works
The comparison prompt (Pass 1, third call) already evaluates both extractions. Extended to also track preference:

The comparison output now includes:
- Agreement score (1-10)
- Consensus insights
- Unique insights per instance
- **STRONGER EXTRACTION: A or B** (with one-sentence justification)
- Recommended action

### Automatic Tracking
After each episode's comparison:
- Store `stronger_instance` (A or B) in the pipeline_logs
- Store the agreement_score
- No manual review needed unless agreement < 5

### Automatic Phase-Out Decision
After 10 episodes, run a query:
```sql
SELECT stronger_instance, COUNT(*) 
FROM pipeline_logs 
WHERE step_name = 'pass_1_comparison' 
GROUP BY stronger_instance
```

- If Instance A preferred 8+ out of 10 times: Instance B isn't adding value. Notify Anton with recommendation to drop it.
- If split 6/4 or closer: both instances are contributing. Keep dual extraction.
- If Instance B preferred 7+ times: the alternative angle prompt is actually better. Consider making it the primary.

Anton makes the final call, but the data is collected and analysed automatically.

---

## A/B Testing Mode for Prompts

### When to Use
When iterating on a prompt and you want to compare the new version against the current one before committing.

### How It Works
1. Create a new prompt version in `prompt_versions` with `is_active = false`
2. Trigger A/B mode for the next episode: `ab_test_prompt = [prompt_name]`
3. The pipeline processes the episode twice for the specified step:
   - Once with the current active prompt (version N)
   - Once with the candidate prompt (version N+1)
4. Both outputs are saved as drafts with a flag indicating which prompt version produced them
5. Anton reviews both drafts and picks the better one
6. If the candidate wins: set it as active
7. If the current wins: discard the candidate or iterate further

### Cost
Doubles the cost for one pipeline step on one episode. Minimal impact.

### When NOT to Use
- For every episode (too expensive, too slow)
- For minor wording tweaks (just deploy and monitor scores)
- Use only for significant prompt changes where the outcome is uncertain

---

## Pre-Launch Prompt Testing Checklist

- [ ] Get 3 real transcripts (focused interview, rambling conversation, tactical how-to)
- [ ] Run Pass 1 extraction on all 3 — note what was captured and what was missed
- [ ] Run Pass 1 alternative extraction on all 3 — compare with standard extraction
- [ ] Run Pass 1 comparison on all 3 — check if agreement scores feel right
- [ ] Run Pass 2 structuring on all 3 — check framework selection and outline quality
- [ ] Run Pass 3 summary on all 3 — read each, does it capture the episode?
- [ ] Run Pass 3 ebook on all 3 — read all of them cover to cover. Are they worth reading?
- [ ] Run Pass 3 newsletter material on all 3 — are the tips genuinely actionable?
- [ ] Run self-review (accuracy) on all 3 — does the score match your assessment?
- [ ] Run self-review (writing) on all 3 — does the score match your assessment?
- [ ] Collect all notes on what needs changing
- [ ] Revise prompts based on test results
- [ ] Re-run the worst-performing transcript with revised prompts
- [ ] Confirm improvement before starting pipeline development
