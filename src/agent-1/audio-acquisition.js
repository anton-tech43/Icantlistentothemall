// Agent 1 — Audio acquisition
// Validates audio URLs and provides fallback download for transcription.

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const TEMP_DIR = path.join(__dirname, '..', '..', 'tmp');

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function validateAudioUrl(audioUrl, timeoutMs = 10000) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(audioUrl);
      const client = parsed.protocol === 'https:' ? https : http;

      const req = client.request(parsed, { method: 'HEAD', timeout: timeoutMs }, (res) => {
        const contentType = res.headers['content-type'] || '';
        const contentLength = parseInt(res.headers['content-length'] || '0', 10);
        const isAudio = contentType.includes('audio') || contentType.includes('octet-stream');
        const isRedirect = res.statusCode >= 300 && res.statusCode < 400;

        resolve({
          reachable: res.statusCode >= 200 && res.statusCode < 400,
          statusCode: res.statusCode,
          contentType,
          contentLength,
          isAudio,
          isRedirect,
          redirectUrl: isRedirect ? res.headers.location : null,
          estimatedDurationMinutes: contentLength > 0 ? Math.round(contentLength / (128 * 1024 / 8) / 60) : null,
        });
      });

      req.on('error', (err) => {
        resolve({ reachable: false, error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ reachable: false, error: 'timeout' });
      });

      req.end();
    } catch (err) {
      resolve({ reachable: false, error: err.message });
    }
  });
}

function downloadAudio(audioUrl, episodeId) {
  ensureTempDir();
  const filePath = path.join(TEMP_DIR, `${episodeId}.mp3`);

  return new Promise((resolve, reject) => {
    const parsed = new URL(audioUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const file = fs.createWriteStream(filePath);

    const req = client.get(audioUrl, { timeout: 300000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(filePath);
        return downloadAudio(res.headers.location, episodeId).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filePath);
        return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
      }

      res.pipe(file);

      file.on('finish', () => {
        file.close();
        const stats = fs.statSync(filePath);
        resolve({
          filePath,
          sizeBytes: stats.size,
          sizeMB: Math.round(stats.size / (1024 * 1024) * 10) / 10,
        });
      });
    });

    req.on('error', (err) => {
      file.close();
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      file.close();
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      reject(new Error('Download timeout'));
    });
  });
}

function cleanupTempFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = {
  validateAudioUrl,
  downloadAudio,
  cleanupTempFile,
};
