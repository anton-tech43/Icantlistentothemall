// Agent 3: Puppeteer configuration — HTML to PDF conversion
const puppeteer = require('puppeteer-core');

// Chromium executable paths by platform
const CHROMIUM_PATHS = {
  // Railway Docker container
  docker: '/usr/bin/chromium-browser',
  // Windows (common install locations)
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
  ],
  // macOS
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  // Linux
  linux: '/usr/bin/chromium-browser',
};

function findChromePath() {
  // Environment variable override (Railway, CI, etc.)
  if (process.env.CHROMIUM_PATH) {
    return process.env.CHROMIUM_PATH;
  }

  const fs = require('fs');
  const platform = process.platform;

  if (platform === 'win32') {
    for (const p of CHROMIUM_PATHS.win32) {
      if (p && fs.existsSync(p)) return p;
    }
  } else if (platform === 'darwin') {
    if (fs.existsSync(CHROMIUM_PATHS.darwin)) return CHROMIUM_PATHS.darwin;
  } else {
    // Linux / Docker
    if (fs.existsSync(CHROMIUM_PATHS.docker)) return CHROMIUM_PATHS.docker;
    if (fs.existsSync(CHROMIUM_PATHS.linux)) return CHROMIUM_PATHS.linux;
  }

  throw new Error(
    'Could not find Chrome/Chromium. Set CHROMIUM_PATH environment variable.'
  );
}

const LAUNCH_OPTIONS = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--font-render-hinting=none',
  ],
};

// Footer: page numbers on every page EXCEPT the first two (cover + page two).
// Uses Puppeteer's pageNumber/totalPages tokens inside a JS-driven template.
const FOOTER_TEMPLATE = `
  <style>
    .footer-pg {
      width: 100%;
      font-family: 'Courier New', monospace;
      font-size: 8pt;
      color: #666666;
      padding: 0 20mm 0 0;
      text-align: right;
      box-sizing: border-box;
    }
    .footer-pg.hidden { visibility: hidden; }
  </style>
  <div class="footer-pg">
    <span class="pageNumber"></span>
  </div>
  <script>
    // Hide footer on pages 1 and 2 (cover + page two)
    try {
      const pn = parseInt(document.querySelector('.pageNumber').textContent, 10);
      if (pn <= 2) document.querySelector('.footer-pg').classList.add('hidden');
    } catch (e) {}
  </script>
`;

const PDF_OPTIONS = {
  format: 'A4',
  printBackground: true,
  // Margins: CSS handles most, but we need bottom margin for the footer
  margin: { top: '0', right: '0', bottom: '14mm', left: '0' },
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate: FOOTER_TEMPLATE,
  preferCSSPageSize: false,
};

/**
 * Convert an HTML string to a PDF buffer.
 * @param {string} html - Complete HTML document string
 * @returns {Promise<Buffer>} PDF file as a buffer
 */
async function htmlToPdf(html) {
  const chromePath = findChromePath();
  const browser = await puppeteer.launch({
    ...LAUNCH_OPTIONS,
    executablePath: chromePath,
  });

  try {
    const page = await browser.newPage();

    // Set content and wait for fonts to load
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Small delay to ensure fonts are fully rendered
    await new Promise(resolve => setTimeout(resolve, 500));

    const pdfBuffer = await page.pdf(PDF_OPTIONS);
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

/**
 * Count pages in a PDF buffer using a simple heuristic.
 * Looks for PDF page tree entries. For exact count, use pdf-parse.
 * @param {Buffer} pdfBuffer
 * @returns {number}
 */
function countPdfPages(pdfBuffer) {
  // Count /Type /Page entries (excluding /Type /Pages)
  const pdfStr = pdfBuffer.toString('latin1');
  const matches = pdfStr.match(/\/Type\s*\/Page(?!s)/g);
  return matches ? matches.length : 0;
}

module.exports = { htmlToPdf, countPdfPages, findChromePath };
