// Agent 3: Test script — generates HTML and PDF files for review
// Usage:
//   node generate-test.js          → HTML only (fast, for browser review)
//   node generate-test.js --pdf    → HTML + PDF (requires Chrome/Chromium)
const fs = require('fs');
const path = require('path');
const { renderHtml } = require('../render-html');
const { testEpisodeBigIdea, testEpisodePlaybook, testEpisodeContrarian } = require('./test-data');

const OUTPUT_DIR = path.join(__dirname, 'output');
const generatePdfs = process.argv.includes('--pdf');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const episodes = [
  { name: 'big-idea-hormozi', data: testEpisodeBigIdea },
  { name: 'playbook-cold-outreach', data: testEpisodePlaybook },
  { name: 'contrarian-free-trials', data: testEpisodeContrarian },
];

async function run() {
  // Generate HTML
  for (const episode of episodes) {
    const html = renderHtml(episode.data);
    const htmlPath = path.join(OUTPUT_DIR, `${episode.name}.html`);
    fs.writeFileSync(htmlPath, html, 'utf-8');
    console.log(`HTML: ${htmlPath}`);
  }

  // Generate PDFs if requested
  if (generatePdfs) {
    const { htmlToPdf, countPdfPages } = require('../puppeteer-config');
    console.log('\nGenerating PDFs...');

    for (const episode of episodes) {
      const html = renderHtml(episode.data);
      try {
        const pdfBuffer = await htmlToPdf(html);
        const pageCount = countPdfPages(pdfBuffer);
        const pdfPath = path.join(OUTPUT_DIR, `${episode.name}.pdf`);
        fs.writeFileSync(pdfPath, pdfBuffer);
        console.log(`PDF: ${pdfPath} (${pageCount} pages, ${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
      } catch (err) {
        console.error(`PDF generation failed for ${episode.name}: ${err.message}`);
      }
    }
  }

  console.log('\nOpen the HTML files in Chrome to review the manuscript aesthetic.');
  if (!generatePdfs) {
    console.log('Run with --pdf to also generate PDF files.');
  }
}

run().catch(console.error);
