// Agent 3: Test the Markdown parser against sample Agent 2 output
const { parseEbookContent, parseFrontMatter, parseMarkdownBody } = require('../parse-ebook-content');

const sampleMarkdown = `---
framework: The Big Idea
guest_name: Alex Hormozi
chapters:
  - number: 1
    title: The problem with cost-based pricing
    pull_forward: Most founders price based on cost. Hormozi argues that's leaving 5-10x revenue on the table.
  - number: 2
    title: The value equation
    pull_forward: Value is not a feeling. Hormozi breaks it into four variables you can measure and improve.
---
# Chapter 1: The problem with cost-based pricing

The default for most founders is simple: figure out what it costs to deliver, add a margin, and call it a price. It feels logical. It feels fair. And according to Hormozi, it is the single biggest revenue mistake a business can make.

The problem isn't that cost-based pricing is wrong in some abstract sense. It's that it anchors your revenue to the wrong variable. Your costs have nothing to do with what the customer gets.

> "Price is what you pay. Value is what you get. Most founders confuse the two."
> — Hormozi

## The revenue ceiling

When you price based on cost, you create a ceiling. You can only charge more by spending more.

The alternative — pricing based on the outcome you create — removes that ceiling entirely.

# Chapter 2: The value equation

Hormozi's value equation has four components: the dream outcome, the perceived likelihood of achieving it, the time delay before results, and the effort and sacrifice required.

## Dream outcome

The dream outcome is what the customer actually wants, stated in their language.

> "If you can't articulate the dream outcome in one sentence, you don't understand your customer well enough to price correctly."
> — Hormozi

Hormozi suggests a simple exercise: ask ten customers what they would pay to have their problem completely solved.
`;

// Test front matter parsing
console.log('=== Front Matter ===');
const { frontMatter, body } = parseFrontMatter(sampleMarkdown);
console.log('Framework:', frontMatter.framework);
console.log('Guest:', frontMatter.guest_name);
console.log('Chapters:', frontMatter.chapters?.length, 'items');
if (frontMatter.chapters) {
  frontMatter.chapters.forEach(ch => {
    console.log(`  Chapter ${ch.number}: ${ch.title}`);
    console.log(`    Pull forward: ${ch.pull_forward}`);
  });
}

// Test body parsing
console.log('\n=== Chapters ===');
const chapters = parseMarkdownBody(body);
console.log(`Found ${chapters.length} chapters`);
chapters.forEach(ch => {
  console.log(`\nChapter ${ch.number}: ${ch.title}`);
  console.log(`  Sections: ${ch.sections.length}`);
  ch.sections.forEach((s, i) => {
    console.log(`  Section ${i + 1}: ${s.subheader || '(intro)'}`);
    console.log(`    Paragraphs: ${s.bodyParagraphs.length}`);
    console.log(`    Pull quotes: ${s.pullQuotes.length}`);
    s.pullQuotes.forEach(q => {
      console.log(`      "${q.text.substring(0, 60)}..." — ${q.attribution}`);
    });
  });
});

// Test full parse
console.log('\n=== Full Parse ===');
const result = parseEbookContent({
  ebookContent: sampleMarkdown,
  selfRatingNote: 'This was a focused conversation.',
  frameworkSelected: 'The Big Idea',
  guestName: null, // Should fall back to front matter
  episodeTitle: 'The Pricing Framework Most Founders Get Wrong',
  podcastName: 'The Game w/ Alex Hormozi',
  accentColour: '#A0522D',
  episodeDate: '2026-03-12',
  durationSeconds: 6120,
});

console.log('Title:', result.episodeTitle);
console.log('Guest:', result.guestName);
console.log('Framework:', result.frameworkSelected);
console.log('Chapters:', result.chapters.length);
result.chapters.forEach(ch => {
  console.log(`  ${ch.number}. ${ch.title}`);
  console.log(`     Pull forward: ${ch.pullForward ? ch.pullForward.substring(0, 60) + '...' : 'MISSING'}`);
});

console.log('\n✓ Parser test complete');
