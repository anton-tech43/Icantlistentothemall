# Icantlistentothemall — Claude Code Task: Manual Prompt Test

## What This Is
This is a step-by-step task for Claude Code to execute. The goal is to test the full content pipeline against 3 real podcast episodes before building the production system. Every prompt, every chunking decision, and every quality gate gets validated with real data.

## What You Need Before Starting
- Deepgram API key (sign up at deepgram.com, free tier gives $200 in credits)
- Claude API key (from console.anthropic.com)
- Node.js installed
- A working directory for this test (e.g., ~/icantlistentothemall-test/)

## Test Episodes

Pick one episode from each of these three podcasts. Choose recent episodes (last 3 months) that are representative of the show's typical format.

**Episode 1 — Diary of a CEO (Steven Bartlett)**
Format: long-form interview, story-heavy, deep personal questions
Why: tests extraction from rambling, emotional conversations with buried insights
Find the RSS feed URL: https://feeds.megaphone.fm/DOAC

**Episode 2 — My First Million (Sam Parr & Shaan Puri)**
Format: fast-paced, two hosts riffing, multiple topics, frequent tangents
Why: tests extraction from messy, multi-topic conversations
Find the RSS feed URL: https://feeds.megaphone.fm/HSW2863979858

**Episode 3 — The Game w/ Alex Hormozi**
Format: solo monologue or focused teaching, framework-heavy
Why: tests extraction from structured, dense, tactical content
Find the RSS feed URL: search for the current RSS feed URL — it may have changed

If any RSS feed URL doesn't work, search for the podcast's current RSS feed. Most podcast directories list them.

---

## Step 0: Project Setup

```bash
mkdir ~/icantlistentothemall-test
cd ~/icantlistentothemall-test
npm init -y
npm install rss-parser @deepgram/sdk @anthropic-ai/sdk
mkdir transcripts chunks extractions comparisons outlines outputs reviews pdfs
```

Create a `.env` file:
```
DEEPGRAM_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```

---

## Step 1: Get Audio URLs from RSS Feeds

Write a script `01-get-episodes.js` that:

1. Parses each RSS feed using `rss-parser`
2. Lists the 5 most recent episodes with: title, published date, duration, audio URL
3. Saves the list to `episodes.json`

For each feed, document in `feed-quirks.md`:
- Is the GUID present and unique?
- What format is the duration in? (seconds, HH:MM:SS, MM:SS, missing?)
- Where is the audio URL? (`<enclosure>` tag, `<media:content>`, both?)
- Are there any bonus/trailer episodes mixed in?
- Any encoding issues in titles or descriptions?

Anton: from the listed episodes, pick one episode per podcast (ideally 60-120 minutes, standard format, not a "best of" or bonus). Note the audio URLs for the next step.

---

## Step 2: Transcribe with Deepgram

Write a script `02-transcribe.js` that:

1. Takes an audio URL as input
2. Sends it to Deepgram using URL passthrough (not file upload)
3. Configuration:
   - Model: nova-2
   - Language: en
   - Punctuate: true
   - Paragraphs: true
   - Diarize: true (speaker diarisation)
   - Smart format: true
4. Saves the full Deepgram response JSON to `transcripts/episode-{n}-deepgram.json`
5. Extracts and saves the plain text transcript with speaker labels to `transcripts/episode-{n}-transcript.txt`
6. Logs: audio duration, transcription time, word count, number of speakers detected

Run it for all 3 episodes. Log any failures — if URL passthrough fails for any episode, try the fallback: download the audio file temporarily, upload to Deepgram, transcribe, delete the file.

**Expected output:**
- `transcripts/episode-1-deepgram.json` (full Deepgram response)
- `transcripts/episode-1-transcript.txt` (readable transcript with speaker labels)
- Same for episodes 2 and 3
- `transcription-log.md` with timing, word counts, and any issues

---

## Step 3: Chunk the Transcripts

Write a script `03-chunk.js` that:

1. Reads a transcript file
2. Chunks it according to these rules:
   - Target chunk size: 2,500 words
   - Minimum chunk size: 1,500 words
   - Maximum chunk size: 3,500 words
   - Maximum time span per chunk: 12 minutes
   - Overlap: 200 words between consecutive chunks
3. Split point priority:
   a. Speaker transition after one speaker has been talking for 3+ minutes
   b. Deepgram paragraph break after apparent topic shift
   c. Any paragraph break near the target size
   d. Sentence boundary nearest to target (last resort)
4. Never split mid-sentence
5. If final chunk is < 1,500 words, merge with previous chunk
6. Saves each chunk to a separate file: `chunks/episode-{n}-chunk-{m}.txt`
7. Saves a chunk summary to `chunks/episode-{n}-chunk-summary.md` with:
   - Number of chunks created
   - Word count per chunk
   - Time span per chunk (if timestamps available)
   - Where each split occurred (speaker change, paragraph break, etc.)

Run for all 3 episodes.

**Anton reviews:** Open the chunk summary files. Do the split points make sense? Are any chunks too long or too short? Does any chunk feel like it cuts an idea in half? Note issues in the summary file.

---

## Step 4: Run Pass 1 — Dual Extraction

Write a script `04-extract.js` that:

1. Reads each chunk file
2. For each chunk, makes TWO Claude API calls:

### Call A: Standard Extraction

System prompt: (none needed — the full prompt includes all instructions)

User message:
```
[PODCAST CONTEXT — insert the appropriate context from below based on which podcast this is]

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

CONTINUED TOPIC: [Yes/No] — Does this chunk appear to continue or revisit a topic from earlier in the conversation? If yes, note the topic so it can be merged with related extractions.

If a chunk contains very little substantive content (mostly filler, tangents, or repetition), return:

TOPIC: [topic label]
LOW SUBSTANCE: This chunk primarily contains [brief description of what's in it]. No significant new insights.

---

TRANSCRIPT CHUNK:
[insert chunk text here]
```

### Call B: Alternative Extraction

User message:
```
[PODCAST CONTEXT — same as above]

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

---

TRANSCRIPT CHUNK:
[insert chunk text here]
```

### Podcast Contexts (insert the right one per episode):

**Diary of a CEO:**
```
PODCAST CONTEXT: This is Diary of a CEO, hosted by Steven Bartlett. Episodes are long-form interviews (typically 90-150 minutes). Bartlett asks deep personal questions and gives guests space for extended answers. Guests often tell long stories from their lives. The most valuable insights are usually embedded inside these stories rather than stated directly — extract the lesson behind each story, not the story itself. Bartlett frequently summarises what the guest said in his own words before moving on — these restatements rarely add new information and can be skipped. The first 5-10 minutes are often personal catch-up and can be low-substance. Episodes sometimes have a "final five" rapid-fire question segment at the end that produces short, quotable answers.
```

**My First Million:**
```
PODCAST CONTEXT: This is My First Million, hosted by Sam Parr and Shaan Puri. Episodes feature two hosts riffing on business ideas, trends, and strategies. The format is fast-paced with frequent tangents, jokes, and asides. Valuable insights are mixed in with casual banter — separate them carefully. The hosts often brainstorm business ideas in real-time, some of which are half-baked and some genuinely insightful. Focus on extracting the ideas with specific market data or validated reasoning behind them, not every spontaneous thought. When guests appear, episodes are more focused. The hosts frequently reference specific revenue numbers, growth metrics, and business models — these specific figures are high-value content to extract.
```

**Hormozi:**
```
PODCAST CONTEXT: This is The Game with Alex Hormozi. Episodes are often solo monologues or teachings where Hormozi walks through a specific business concept in detail. He is direct, uses specific numbers and examples from his own businesses, and tends to structure his thinking clearly. The content is highly tactical and framework-heavy. Extract the specific frameworks, step-by-step processes, and exact numbers he references. Hormozi frequently repeats his core points multiple times with different examples — extract the point once with the best example, don't duplicate. He often opens with a bold claim and then spends the episode backing it up — that opening claim is usually the core insight to capture.
```

3. Save all outputs:
   - `extractions/episode-{n}-chunk-{m}-standard.txt` (Instance A)
   - `extractions/episode-{n}-chunk-{m}-alternative.txt` (Instance B)
4. Log token usage and cost per call

### Then run the comparison:

For each chunk, make a third Claude call:

User message:
```
You are an editorial quality checker. You have two independent extractions from the same podcast transcript chunk. Your job is to assess agreement and identify which extraction is stronger.

EXTRACTION A (standard):
[insert Instance A output]

EXTRACTION B (contrarian angle):
[insert Instance B output]

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

Save to `comparisons/episode-{n}-chunk-{m}-comparison.txt`

Then combine all merged extractions for each episode into a single file:
`extractions/episode-{n}-merged-all.txt`

Count total insights per episode and save to `extractions/episode-{n}-stats.md`:
- Total insights extracted
- Total facts/data points
- Total frameworks
- Total actionable advice items
- Average agreement score across chunks
- How many chunks Instance A was stronger vs Instance B

---

## Step 5: Run Pass 2 — Structuring

Write a script `05-structure.js` that:

1. Takes the merged extraction file for each episode
2. Makes one Claude API call per episode:

User message:
```
You are a book editor. You have extracted insights from a full podcast episode. Your job is to organise them into a short, focused ebook structure.

EXTRACTED MATERIAL:
[insert full merged extraction from all chunks]

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

Save to `outlines/episode-{n}-outline.txt`

**Anton reviews:** Read each outline. Does the framework selection make sense? Do the chapters capture the right ideas? Would you approve this structure? Note any corrections.

---

## Step 6: Run Pass 3 — Writing

Write a script `06-write.js` that makes three Claude calls per episode:

### Call 1: Summary

```
You are writing a 3-5 sentence summary of a podcast episode for readers deciding whether to download the full ebook.

EPISODE: [title]
GUEST: [guest name]
PODCAST: [podcast name]
CHAPTER OUTLINE: [insert outline from Step 5]
KEY INSIGHTS: [insert top 5 insights from merged extraction]

RULES:
- Lead with the single most valuable takeaway. Not "this episode covers..." — state the insight directly.
- Mention who was featured and the core topic naturally, not as metadata.
- End by referencing 2-3 specific things covered in the full ebook. The ebook is free, so no sales language — just make it clear there's more depth.
- Maximum 5 sentences. Every sentence must earn its place.
- Write in third person.
- No throat-clearing ("In this episode..."), no emphasis crutches ("This is a must-read"), no vague language.
- Active voice. Specific nouns. Concrete details.
```

Save to `outputs/episode-{n}-summary.txt`

### Call 2: Ebook

```
You are writing a short ebook based on podcast insights. This is the main product — it must be worth the reader's time.

EPISODE: [title]
GUEST: [guest name]
PODCAST: [podcast name]
FRAMEWORK: [selected framework from Step 5]
CHAPTER OUTLINE: [insert full outline from Step 5]
EXTRACTED INSIGHTS: [insert all merged extractions]
ESTIMATED PAGES: [number from Step 5]

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

Save to `outputs/episode-{n}-ebook.txt`

### Call 3: Newsletter Material

```
You are extracting newsletter material from a processed podcast episode. The newsletter is a bi-weekly digest for ambitious, business-minded readers.

EPISODE: [title]
GUEST: [guest name]
PODCAST: [podcast name]
FULL SUMMARY: [insert summary from Call 1]
KEY INSIGHTS: [insert top insights from merged extraction]
CHAPTER OUTLINE: [insert outline from Step 5]

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

Save to `outputs/episode-{n}-newsletter.txt`

Log token usage and cost for all calls.

---

## Step 7: Run Self-Reviews

Write a script `07-review.js` that runs two review passes on each ebook:

### Review 1: Content Accuracy

```
You are a fact-checker reviewing an ebook against its source material.

ORIGINAL EXTRACTED INSIGHTS: [insert all merged extractions from Step 4]
EBOOK CONTENT: [insert ebook text from Step 6]

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
PASS/FAIL: [PASS if ≥ 7, FAIL if < 7]
CORRECTIONS NEEDED: [specific things to fix if FAIL, or "None"]
```

### Review 2: Writing Quality

```
You are an editorial quality reviewer. Review this text for writing quality.

TEXT TO REVIEW: [insert ebook text]
CONTENT TYPE: ebook

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

PASS/FAIL: [PASS if ≥ 35, FAIL if < 35]
```

Save both reviews to `reviews/episode-{n}-accuracy.txt` and `reviews/episode-{n}-writing.txt`

---

## Step 8: Generate Test PDFs

Write a script `08-generate-pdf.js` that:

1. Takes an ebook text file
2. Wraps it in a simple HTML template with the manuscript aesthetic:
   - Monospaced font throughout (Phase 1 — no serif yet)
   - White background, black text
   - Cover page: title, guest name, podcast name, framework label, page count
   - Page two: chapter list
   - Chapter openers: chapter number (grey), title (black, large), pull-forward sentence
   - Body text with subheaders
   - Pull quotes indented with left border character
   - Page numbers bottom right
   - Last page: "icantlistentothemall.com/newsletter"
3. Uses Puppeteer to render HTML to PDF
4. Saves to `pdfs/episode-{n}.pdf`

```bash
npm install puppeteer
```

Keep the HTML/CSS simple. The manuscript aesthetic IS simple — monospaced text with whitespace. Don't over-engineer the template. Get it looking right in a browser first, then print to PDF.

---

## Step 9: Cost Summary

Write a script `09-cost-summary.js` that reads all logged token usage and costs, then generates `cost-summary.md`:

```
COST SUMMARY — Manual Prompt Test

EPISODE 1: [title]
  Transcription (Deepgram): $X.XX
  Pass 1 — Standard extraction (X chunks × 2 calls): $X.XX
  Pass 1 — Alternative extraction (X chunks): $X.XX
  Pass 1 — Comparisons (X chunks): $X.XX
  Pass 2 — Structuring: $X.XX
  Pass 3 — Summary: $X.XX
  Pass 3 — Ebook: $X.XX
  Pass 3 — Newsletter material: $X.XX
  Self-review — Accuracy: $X.XX
  Self-review — Writing: $X.XX
  TOTAL: $X.XX

EPISODE 2: [title]
  ...

EPISODE 3: [title]
  ...

GRAND TOTAL: $X.XX
AVERAGE PER EPISODE: $X.XX

TOKEN USAGE:
  Total input tokens: X
  Total output tokens: X

COMPARISON WITH ESTIMATES:
  Estimated per episode (from specs): $2-4
  Actual average: $X.XX
  Difference: [over/under by X%]
```

---

## Step 10: Generate Test Report

After all steps complete, generate `TEST-REPORT.md`:

```markdown
# Manual Prompt Test Results

## Episodes Tested
1. [Title] — [Podcast] — [Duration] — [Word count]
2. [Title] — [Podcast] — [Duration] — [Word count]
3. [Title] — [Podcast] — [Duration] — [Word count]

## Transcription
- Deepgram URL passthrough: [worked / failed] for each episode
- Speaker diarisation quality: [good / poor / mixed]
- Any issues: [describe]

## Chunking
- Episode 1: [X] chunks, average [X] words, splits at [describe quality]
- Episode 2: [X] chunks, average [X] words, splits at [describe quality]
- Episode 3: [X] chunks, average [X] words, splits at [describe quality]
- Any chunks that split poorly: [describe]

## Extraction (Pass 1)
- Episode 1: [X] total insights, agreement score average [X], Instance [A/B] stronger
- Episode 2: [X] total insights, agreement score average [X], Instance [A/B] stronger
- Episode 3: [X] total insights, agreement score average [X], Instance [A/B] stronger
- Did dual extraction catch anything single extraction would have missed? [yes/no, describe]

## Structuring (Pass 2)
- Episode 1: Framework [X], [X] chapters, estimated [X] pages
- Episode 2: Framework [X], [X] chapters, estimated [X] pages
- Episode 3: Framework [X], [X] chapters, estimated [X] pages
- Any framework selections that felt wrong: [describe]

## Writing (Pass 3)
- Accuracy scores: Episode 1 [X/10], Episode 2 [X/10], Episode 3 [X/10]
- Writing scores: Episode 1 [X/50], Episode 2 [X/50], Episode 3 [X/50]
- All passed thresholds: [yes/no]
- Common writing issues across episodes: [list]

## PDF Generation
- Template renders correctly: [yes/no]
- Page breaks work: [yes/no]
- Manuscript aesthetic achieved: [yes/no]
- Issues: [describe]

## Cost
- Average per episode: $X.XX
- Matches estimates: [yes/no]
- Adjustments needed: [describe]

## Prompt Changes Needed
[List every prompt that needs revision and what specifically needs to change, based on reviewing all outputs]

## Decision: Ready to Build?
[yes — proceed with revised prompts / no — need another test round with changes]
```

---

## What Anton Does After This Test

1. Read every ebook output cover to cover. Are these worth reading?
2. Read every summary. Do they capture the episode?
3. Read every newsletter extraction. Are the tips genuinely actionable?
4. Compare self-review scores to your own assessment. Are they calibrated?
5. Look at the PDFs. Does the manuscript aesthetic work?
6. Review the cost summary. Is the per-episode cost acceptable?
7. Note everything that needs to change in the prompts
8. Revise prompts based on findings
9. Re-run the weakest episode with revised prompts
10. If improved: proceed to production build
11. If still weak: iterate until satisfied
