// Agent 5 — Newsletter composition prompt (newsletter_composition v1)
// Stored in prompt_versions. Takes multiple episodes' newsletter material,
// composes the final four sections + 3 subject lines + dialogue header.

const PROMPT_NAME = 'newsletter_composition';
const PROMPT_VERSION = 1;

function buildNewsletterPrompt(episodes) {
  const episodeMaterial = episodes.map((ep, i) => `
EPISODE ${i + 1}: "${ep.title}" — ${ep.podcastName}${ep.guestName ? ` (${ep.guestName})` : ''}
  Top insight: ${ep.newsletterInsight}
  Surprising stat: ${ep.newsletterStat}
  Actionable tip: ${ep.newsletterTip}
  Exercise: ${ep.newsletterExercise}
  Ebook URL: ${ep.ebookUrl || 'N/A'}
  Page count: ${ep.pageCount || 'N/A'}
`).join('\n');

  return `You are composing a bi-weekly newsletter for icantlistentothemall, a product that turns business podcasts into short ebooks. The audience: ambitious, business-minded readers who don't have time to listen to every podcast.

You have newsletter material extracted from ${episodes.length} recent episodes. Your job: select the strongest material and compose a tight, four-section newsletter.

EPISODE MATERIAL:
${episodeMaterial}

COMPOSE EXACTLY:

1. DIALOGUE HEADER
Write a two-line exchange in this exact format:
"[reader says something relatable about podcast overwhelm]" he/she said
–[product responds with quiet confidence] we said

The dialogue should relate to this issue's content. Examples for guidance:
- "I missed another 3-hour episode" he said / –We caught it for you we said
- "There's no way I'm listening to all of those" she said / –You don't have to we said calmly
- "I've got 47 episodes in my queue" he said / –We picked the five that matter we said
- "Another podcast about pricing?" she said / –This one changed how three founders charge we said

2. TOP INSIGHT
Pick the single most powerful idea across all episodes. Write it in 2-3 sentences. Sharp, direct, specific. Attribute to the guest and episode. This should stop someone mid-scroll.

Include:
- episode_title: the source episode title
- podcast_name: the source podcast name
- ebook_url: the ebook URL for this episode

3. SURPRISING STAT
Pick the most genuinely unexpected number, finding, or contrarian position across all episodes. 1-2 sentences. Must stand completely alone without context.

4. ACTIONABLE TIP
Pick the most specific, concrete action a reader could take. Not vague advice. Something actionable in under 5 minutes. Frame as direct instruction.

5. EXERCISE
Pick or adapt the best reflective prompt. Use one of these formats:
- "Reflect on this: [question]"
- "Make a list of [specific thing]"
- "This week, [specific observation or action]"
- "Ask yourself: [pointed question]"

6. SUBJECT LINES
Generate 3 subject line candidates ranked from most to least specific. Rules:
- Pull from the strongest insight or stat
- Specific and curiosity-driven
- Never generic ("Your Bi-Weekly Digest", "This Week's Highlights")
- Under 60 characters each

7. FOOTER EBOOK LINKS
List all episodes that have ebook URLs, formatted as:
- title | podcast_name | page_count | ebook_url

WRITING RULES:
- Active voice. Human subjects doing things.
- No throat-clearing: "Here's the thing", "It turns out", "The truth is"
- No emphasis crutches: "Full stop", "Let that sink in"
- No binary contrasts: "It's not X, it's Y" — state Y directly
- No business jargon: "leverage", "navigate", "unpack", "ecosystem"
- No em dashes
- Vary sentence lengths
- Trust the reader's intelligence

OUTPUT FORMAT (use these exact headers):
DIALOGUE_HEADER_READER: [first line]
DIALOGUE_HEADER_RESPONSE: [second line]

TOP_INSIGHT: [2-3 sentences]
TOP_INSIGHT_EPISODE: [episode title]
TOP_INSIGHT_PODCAST: [podcast name]
TOP_INSIGHT_EBOOK_URL: [url]

SURPRISING_STAT: [1-2 sentences]

ACTIONABLE_TIP: [specific instruction]

EXERCISE: [reflective prompt]

SUBJECT_LINE_1: [most specific]
SUBJECT_LINE_2: [second choice]
SUBJECT_LINE_3: [third choice]

FOOTER_LINKS:
- [title] | [podcast] | [pages] | [url]
- [title] | [podcast] | [pages] | [url]
...`;
}

function buildSelfReviewPrompt(newsletterText) {
  return `You are an editorial quality reviewer. Review this newsletter text for writing quality.

TEXT TO REVIEW:
${newsletterText}

CONTENT TYPE: newsletter_material

Rate 1-10 on each dimension:

DIRECTNESS: Does the text make statements directly, or does it announce what it's about to say? Are there throat-clearing phrases? Does every sentence get to the point?

RHYTHM: Are sentence lengths varied? Is there a mix of short and long? Or does the text feel metronomic — every sentence roughly the same length and structure?

TRUST: Does the text respect the reader's intelligence? Or does it over-explain, soften, hedge, or justify? Are there phrases like "it's worth noting" or "importantly" that signal the writer doesn't trust the point to land on its own?

AUTHENTICITY: Does this sound like it was written by a thoughtful person? Or does it sound generated? Check for: binary contrasts ("not X, it's Y"), false agency ("the insight reveals"), business jargon, emphasis crutches ("let that sink in"), narrator-from-a-distance voice.

DENSITY: Is every sentence earning its place? Could any paragraph be cut without losing information? Is there padding or repetition?

SCORING:
- Directness: [Score] — [One sentence explaining the score]
- Rhythm: [Score] — [One sentence explaining the score]
- Trust: [Score] — [One sentence explaining the score]
- Authenticity: [Score] — [One sentence explaining the score]
- Density: [Score] — [One sentence explaining the score]
- TOTAL: [sum]/50

THRESHOLD: Total must be 35 or above to pass.

SPECIFIC ISSUES: List up to 5 specific sentences or phrases that should be rewritten, with a brief note on why.

PASS/FAIL: [PASS if >=35, FAIL if <35]`;
}

function parseNewsletterResponse(text) {
  const get = (key) => {
    const regex = new RegExp(`^${key}:\\s*(.+)`, 'm');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  };

  const footerLinksMatch = text.match(/FOOTER_LINKS:\n([\s\S]*?)(?:\n\n|$)/);
  const footerLinks = [];
  if (footerLinksMatch) {
    const lines = footerLinksMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
    for (const line of lines) {
      const parts = line.replace(/^-\s*/, '').split('|').map(s => s.trim());
      if (parts.length >= 4) {
        footerLinks.push({
          title: parts[0],
          podcastName: parts[1],
          pageCount: parts[2],
          pdfUrl: parts[3],
        });
      }
    }
  }

  return {
    dialogueHeader: {
      reader: get('DIALOGUE_HEADER_READER'),
      response: get('DIALOGUE_HEADER_RESPONSE'),
    },
    topInsight: {
      text: get('TOP_INSIGHT'),
      episodeTitle: get('TOP_INSIGHT_EPISODE'),
      podcastName: get('TOP_INSIGHT_PODCAST'),
      ebookUrl: get('TOP_INSIGHT_EBOOK_URL'),
    },
    surprisingStat: get('SURPRISING_STAT'),
    actionableTip: get('ACTIONABLE_TIP'),
    exercise: get('EXERCISE'),
    subjectLines: [
      get('SUBJECT_LINE_1'),
      get('SUBJECT_LINE_2'),
      get('SUBJECT_LINE_3'),
    ].filter(Boolean),
    footerEbookLinks: footerLinks,
  };
}

function parseSelfReviewResponse(text) {
  const scoreMatch = text.match(/TOTAL:\s*(\d+)\/50/);
  const passMatch = text.match(/PASS\/FAIL:\s*(PASS|FAIL)/i);

  const dimensions = {};
  for (const dim of ['Directness', 'Rhythm', 'Trust', 'Authenticity', 'Density']) {
    const match = text.match(new RegExp(`${dim}:\\s*(\\d+)`, 'i'));
    dimensions[dim.toLowerCase()] = match ? parseInt(match[1]) : null;
  }

  return {
    total: scoreMatch ? parseInt(scoreMatch[1]) : null,
    passed: passMatch ? passMatch[1].toUpperCase() === 'PASS' : null,
    dimensions,
    rawText: text,
  };
}

module.exports = {
  PROMPT_NAME,
  PROMPT_VERSION,
  buildNewsletterPrompt,
  buildSelfReviewPrompt,
  parseNewsletterResponse,
  parseSelfReviewResponse,
};
