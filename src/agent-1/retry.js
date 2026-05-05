// Agent 1 — Retry logic with exponential backoff
// From Technical Addendum §8.

const RETRY_DELAYS = [0, 5 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000]; // 0, 5min, 30min, 2hr

async function withRetry(fn, { label = 'operation', maxAttempts = 4, onRetry } = {}) {
  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
      console.log(`  Retry ${attempt}/${maxAttempts - 1} for ${label} — waiting ${Math.round(delay / 1000)}s`);

      if (onRetry) onRetry(attempt, delay);

      await sleep(delay);
    }

    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      console.log(`  ${label} attempt ${attempt + 1} failed: ${err.message}`);
    }
  }

  throw lastError;
}

function sleep(ms) {
  if (ms <= 0) return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { withRetry, sleep, RETRY_DELAYS };
