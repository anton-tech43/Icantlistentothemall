// Agent 3: Simple static file server for previewing test output
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const DIR = path.join(__dirname, 'output');

const MIME = {
  '.html': 'text/html',
  '.pdf': 'application/pdf',
  '.css': 'text/css',
  '.js': 'text/javascript',
};

http.createServer((req, res) => {
  let url = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(DIR, url);

  // Generate index if needed
  if (url === '/index.html') {
    const files = fs.readdirSync(DIR).filter(f => f.endsWith('.html') || f.endsWith('.pdf'));
    const links = files.map(f => `<li><a href="/${f}">${f}</a></li>`).join('\n');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html><html><head><title>Agent 3 PDF Preview</title>
      <style>body{font-family:monospace;padding:40px;line-height:2}</style></head>
      <body><h2>Agent 3 — Test Output</h2><ul>${links}</ul></body></html>`);
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}).listen(PORT, () => {
  console.log(`PDF preview server running on http://localhost:${PORT}`);
});
