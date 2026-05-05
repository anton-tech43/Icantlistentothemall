// Agent 3: Data contract — defines the JSON shape for ebook PDF rendering
// Agent 2 outputs structured Markdown with YAML front matter;
// Agent 3 parses it into this shape via parse-ebook-content.js

/**
 * @typedef {Object} EbookData
 * @property {string} episodeTitle
 * @property {string|null} guestName
 * @property {string} podcastName
 * @property {string} accentColour - hex, e.g. "#C4654A"
 * @property {string} episodeDate - ISO date string
 * @property {number} durationSeconds
 * @property {string} frameworkSelected - "The Big Idea" | "The Playbook" | "The Founder's Lesson" | "The Contrarian Take"
 * @property {string} selfRatingNote
 * @property {number} pageCount - estimated by Agent 2, actual set after PDF generation
 * @property {Chapter[]} chapters
 */

/**
 * @typedef {Object} Chapter
 * @property {number} number
 * @property {string} title
 * @property {string} pullForward - key sentence shown on chapter opener
 * @property {Section[]} sections
 */

/**
 * @typedef {Object} Section
 * @property {string|null} subheader - null for the first block after pull-forward
 * @property {string[]} bodyParagraphs
 * @property {PullQuote[]} pullQuotes
 */

/**
 * @typedef {Object} PullQuote
 * @property {string} text
 * @property {string|null} attribution - e.g. "— Hormozi"
 * @property {number} afterParagraph - insert after this paragraph index
 */

const ACCENT_COLOURS = {
  'Diary of a CEO': '#C4654A',
  'My First Million': '#C48B2A',
  'The Tim Ferriss Show': '#6B8F71',
  'The Game w/ Alex Hormozi': '#A0522D',
  "Lenny's Podcast": '#5B7B8A',
};

const FRAMEWORKS = [
  'The Big Idea',
  'The Playbook',
  "The Founder's Lesson",
  'The Contrarian Take',
];

function validateEbookData(data) {
  const errors = [];

  if (!data.episodeTitle) errors.push('Missing episodeTitle');
  if (!data.podcastName) errors.push('Missing podcastName');
  if (!data.accentColour) errors.push('Missing accentColour');
  if (!data.frameworkSelected) errors.push('Missing frameworkSelected');
  if (!data.selfRatingNote) errors.push('Missing selfRatingNote');
  if (!data.chapters || data.chapters.length === 0) errors.push('No chapters');

  if (data.chapters) {
    data.chapters.forEach((ch, i) => {
      if (!ch.title) errors.push(`Chapter ${i + 1}: missing title`);
      if (!ch.pullForward) errors.push(`Chapter ${i + 1}: missing pullForward`);
      if (!ch.sections || ch.sections.length === 0) {
        errors.push(`Chapter ${i + 1}: no sections`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { ACCENT_COLOURS, FRAMEWORKS, validateEbookData };
