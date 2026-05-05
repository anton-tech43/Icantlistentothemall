// Agent 3: HTML renderer — takes EbookData and returns a complete HTML string
const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, 'templates', 'ebook.html');

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderCoverPage(data) {
  const guestLine = data.guestName
    ? `<div class="guest-name">${escapeHtml(data.guestName)}</div>`
    : '';

  return `
  <div class="page cover">
    <div class="accent-line"></div>
    <div class="content-area">
      <div class="episode-title">${escapeHtml(data.episodeTitle)}</div>
      <div class="episode-meta">
        ${guestLine}
        <div>${escapeHtml(data.podcastName)}</div>
      </div>
    </div>
    <div class="bottom-left">icantlistentothemall</div>
    <div class="bottom-right">${escapeHtml(data.frameworkSelected)} · ${data.pageCount} pages</div>
  </div>`;
}

function renderPageTwo(data) {
  const chapterItems = data.chapters
    .map(ch => `<div class="chapter-item"><span class="chapter-number">${ch.number}.</span>${escapeHtml(ch.title)}</div>`)
    .join('\n      ');

  return `
  <div class="page page-two">
    <div class="accent-line"></div>
    <div class="self-rating">${escapeHtml(data.selfRatingNote)}</div>
    <div class="chapter-list">
      <div class="chapter-list-title">What's inside:</div>
      ${chapterItems}
    </div>
  </div>`;
}

function renderPullQuote(quote) {
  const attribution = quote.attribution
    ? `<div class="attribution">${escapeHtml(quote.attribution)}</div>`
    : '';
  return `
      <div class="pull-quote">
        ${escapeHtml(quote.text)}
        ${attribution}
      </div>`;
}

function renderSectionContent(section) {
  let html = '';

  if (section.subheader) {
    html += `\n      <div class="subheader">${escapeHtml(section.subheader)}</div>`;
  }

  const quotesByPosition = {};
  if (section.pullQuotes) {
    section.pullQuotes.forEach(q => {
      quotesByPosition[q.afterParagraph] = q;
    });
  }

  section.bodyParagraphs.forEach((para, i) => {
    html += `\n      <p class="body-text">${escapeHtml(para)}</p>`;
    if (quotesByPosition[i] !== undefined) {
      html += renderPullQuote(quotesByPosition[i]);
    }
  });

  return html;
}

function renderChapter(chapter) {
  // Render ALL sections inside the chapter — let content flow naturally
  // across pages via CSS page breaks. Page numbers come from Puppeteer footer.
  let allSectionsHtml = '';
  chapter.sections.forEach(section => {
    allSectionsHtml += renderSectionContent(section);
  });

  return `
  <div class="page chapter-opener">
    <div class="accent-line"></div>
    <div class="chapter-label">Chapter ${chapter.number}</div>
    <div class="chapter-title">${escapeHtml(chapter.title)}</div>
    <div class="pull-forward">${escapeHtml(chapter.pullForward)}</div>
    <div class="body-start">
      ${allSectionsHtml}
    </div>
  </div>`;
}

function renderLastPage() {
  return `
  <div class="page last-page">
    <div class="brand">icantlistentothemall</div>
    <div class="cta-text">Want insights like this every two weeks?</div>
    <div class="cta-url">icantlistentothemall.com/newsletter</div>
  </div>`;
}

function renderHtml(data) {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

  let pages = [];
  pages.push(renderCoverPage(data));
  pages.push(renderPageTwo(data));

  for (const chapter of data.chapters) {
    pages.push(renderChapter(chapter));
  }

  pages.push(renderLastPage());

  const content = pages.join('\n');

  // Font paths — for local dev, use file paths; for production, use base64
  const fontsDir = path.join(__dirname, 'fonts');
  const fontRegularPath = path.join(fontsDir, 'JetBrainsMono-Regular.woff2');
  const fontBoldPath = path.join(fontsDir, 'JetBrainsMono-Bold.woff2');
  const fontItalicPath = path.join(fontsDir, 'JetBrainsMono-Italic.woff2');

  let fontRegularUrl, fontBoldUrl, fontItalicUrl;

  if (fs.existsSync(fontRegularPath)) {
    const regularB64 = fs.readFileSync(fontRegularPath).toString('base64');
    const boldB64 = fs.readFileSync(fontBoldPath).toString('base64');
    const italicB64 = fs.readFileSync(fontItalicPath).toString('base64');
    fontRegularUrl = `data:font/woff2;base64,${regularB64}`;
    fontBoldUrl = `data:font/woff2;base64,${boldB64}`;
    fontItalicUrl = `data:font/woff2;base64,${italicB64}`;
  } else {
    fontRegularUrl = '';
    fontBoldUrl = '';
    fontItalicUrl = '';
  }

  let html = template
    .replace(/\{\{content\}\}/g, content)
    .replace(/\{\{accentColour\}\}/g, data.accentColour)
    .replace(/\{\{fontRegularUrl\}\}/g, fontRegularUrl)
    .replace(/\{\{fontBoldUrl\}\}/g, fontBoldUrl)
    .replace(/\{\{fontItalicUrl\}\}/g, fontItalicUrl);

  return html;
}

module.exports = { renderHtml };
