// Agent 3: Ebook content parser — converts Agent 2's structured Markdown
// with YAML front matter into the EbookData structure for rendering
//
// Expected format from Agent 2:
// ---
// framework: The Big Idea
// guest_name: Alex Hormozi
// chapters:
//   - number: 1
//     title: The problem with cost-based pricing
//     pull_forward: Most founders price based on cost...
//   - number: 2
//     title: The value equation
//     pull_forward: Value is not a feeling...
// ---
// # Chapter 1: The problem with cost-based pricing
//
// Body text here...
//
// ## The revenue ceiling
//
// More body text...
//
// > "Price is what you pay. Value is what you get."
// > — Hormozi

/**
 * Parse YAML front matter from a Markdown string.
 * Returns { frontMatter: object, body: string }
 */
function parseFrontMatter(markdown) {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) {
    return { frontMatter: {}, body: markdown };
  }

  const yamlStr = match[1];
  const body = match[2];

  // Simple YAML parser for our known structure
  const frontMatter = parseSimpleYaml(yamlStr);
  return { frontMatter, body };
}

/**
 * Simple YAML parser — handles our specific front matter structure:
 * scalar values and a list of objects (chapters).
 */
function parseSimpleYaml(yamlStr) {
  const result = {};
  const lines = yamlStr.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) { i++; continue; }

    // Top-level key: value
    const scalarMatch = line.match(/^(\w+):\s*(.+)$/);
    if (scalarMatch) {
      result[scalarMatch[1]] = scalarMatch[2].trim();
      i++;
      continue;
    }

    // Top-level key with list (chapters:)
    const listKeyMatch = line.match(/^(\w+):\s*$/);
    if (listKeyMatch) {
      const key = listKeyMatch[1];
      result[key] = [];
      i++;

      // Parse list items
      while (i < lines.length) {
        const itemLine = lines[i];
        if (!itemLine.trim()) { i++; continue; }

        // New list item starts with "  - "
        if (itemLine.match(/^\s+-\s/)) {
          const obj = {};
          // First property of the item
          const firstProp = itemLine.match(/^\s+-\s+(\w+):\s*(.+)$/);
          if (firstProp) {
            obj[firstProp[1]] = firstProp[2].trim();
          }
          i++;

          // Continuation properties (indented, no dash)
          while (i < lines.length) {
            const contLine = lines[i];
            if (!contLine.trim()) { i++; continue; }
            const contMatch = contLine.match(/^\s{4,}(\w+):\s*(.+)$/);
            if (contMatch) {
              obj[contMatch[1]] = contMatch[2].trim();
              i++;
            } else {
              break;
            }
          }

          result[key].push(obj);
        } else if (!itemLine.match(/^\s/)) {
          // Back to top level
          break;
        } else {
          i++;
        }
      }
      continue;
    }

    i++;
  }

  return result;
}

/**
 * Parse a pull quote block from Markdown lines.
 * Handles single-line and multi-line blockquotes.
 * > "Quote text here"
 * > — Attribution
 */
function parsePullQuote(lines) {
  let text = '';
  let attribution = null;

  for (const line of lines) {
    const content = line.replace(/^>\s*/, '').trim();

    // Check if this is an attribution line
    if (content.match(/^[—–-]\s*.+/)) {
      attribution = content.replace(/^[—–-]\s*/, '').trim();
    } else {
      // Remove surrounding quotes if present
      const cleaned = content.replace(/^[""]/, '').replace(/[""]$/, '');
      text += (text ? ' ' : '') + cleaned;
    }
  }

  return { text, attribution };
}

/**
 * Parse the Markdown body into chapter structures.
 * Chapters start with # Chapter N: Title
 * Sections start with ## Subheader
 * Pull quotes are > blockquotes
 */
function parseMarkdownBody(body) {
  const lines = body.split('\n');
  const chapters = [];
  let currentChapter = null;
  let currentSection = null;
  let blockquoteBuffer = [];

  function flushBlockquote() {
    if (blockquoteBuffer.length === 0) return;
    if (currentSection) {
      const quote = parsePullQuote(blockquoteBuffer);
      currentSection.pullQuotes.push({
        ...quote,
        afterParagraph: Math.max(0, currentSection.bodyParagraphs.length - 1),
      });
    }
    blockquoteBuffer = [];
  }

  function flushSection() {
    flushBlockquote();
    if (currentSection && currentChapter) {
      currentChapter.sections.push(currentSection);
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Chapter heading: # Chapter N: Title
    const chapterMatch = line.match(/^#\s+Chapter\s+(\d+):\s*(.+)$/i);
    if (chapterMatch) {
      flushSection();
      if (currentChapter) {
        chapters.push(currentChapter);
      }
      currentChapter = {
        number: parseInt(chapterMatch[1], 10),
        title: chapterMatch[2].trim(),
        pullForward: '', // Will be set from front matter
        sections: [],
      };
      currentSection = {
        subheader: null,
        bodyParagraphs: [],
        pullQuotes: [],
      };
      continue;
    }

    // Section heading: ## Subheader
    const sectionMatch = line.match(/^##\s+(.+)$/);
    if (sectionMatch) {
      flushSection();
      currentSection = {
        subheader: sectionMatch[1].trim(),
        bodyParagraphs: [],
        pullQuotes: [],
      };
      continue;
    }

    // Blockquote line
    if (line.match(/^>\s/)) {
      blockquoteBuffer.push(line);
      continue;
    }

    // End of blockquote (non-quote line after quote lines)
    if (blockquoteBuffer.length > 0 && !line.match(/^>/)) {
      flushBlockquote();
    }

    // Body paragraph (non-empty, non-heading)
    const trimmed = line.trim();
    if (trimmed && currentSection) {
      currentSection.bodyParagraphs.push(trimmed);
    }
  }

  // Flush remaining
  flushSection();
  if (currentChapter) {
    chapters.push(currentChapter);
  }

  return chapters;
}

/**
 * Parse Agent 2's ebook_content into the EbookData structure.
 *
 * @param {Object} params
 * @param {string} params.ebookContent - The ebook_content field from processed_content
 * @param {string} params.selfRatingNote - The self_rating_note field
 * @param {string} params.frameworkSelected - The pass_2_framework_selected field
 * @param {string|null} params.guestName - The guest_name field from processed_content
 * @param {string} params.episodeTitle - From episodes table
 * @param {string} params.podcastName - From podcasts table
 * @param {string} params.accentColour - From podcasts table
 * @param {string} params.episodeDate - From episodes.published_at
 * @param {number} params.durationSeconds - From episodes table
 * @returns {import('./data-contract').EbookData}
 */
function parseEbookContent(params) {
  const {
    ebookContent,
    selfRatingNote,
    frameworkSelected,
    guestName,
    episodeTitle,
    podcastName,
    accentColour,
    episodeDate,
    durationSeconds,
  } = params;

  // Parse the Markdown content
  const { frontMatter, body } = parseFrontMatter(ebookContent);

  // Parse chapters from Markdown body
  const chapters = parseMarkdownBody(body);

  // Apply pull-forwards from front matter
  if (frontMatter.chapters && Array.isArray(frontMatter.chapters)) {
    for (const fmChapter of frontMatter.chapters) {
      const num = parseInt(fmChapter.number, 10);
      const chapter = chapters.find(ch => ch.number === num);
      if (chapter && fmChapter.pull_forward) {
        chapter.pullForward = fmChapter.pull_forward;
      }
    }
  }

  // Use front matter values as fallbacks
  const resolvedFramework = frameworkSelected || frontMatter.framework || 'The Big Idea';
  const resolvedGuestName = guestName || frontMatter.guest_name || null;

  return {
    episodeTitle,
    guestName: resolvedGuestName,
    podcastName,
    accentColour,
    episodeDate,
    durationSeconds,
    frameworkSelected: resolvedFramework,
    selfRatingNote: selfRatingNote || '',
    pageCount: chapters.length + 3, // chapters + cover + page two + last page (estimate)
    chapters,
  };
}

module.exports = { parseEbookContent, parseFrontMatter, parseMarkdownBody };
