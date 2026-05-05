// Agent 2: AI Pipeline worker entry point
// Runs on Railway — processes episodes through transcription, extraction, structuring, writing, and review
const express = require('express');
const { processNextEpisode } = require('./pipeline/orchestrator');
const { setupApprovalRoutes } = require('./pipeline/outline-approval');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const PROCESS_INTERVAL_MS = 60 * 1000; // Check for work every 60 seconds

setupApprovalRoutes(app);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', agent: 2, timestamp: new Date().toISOString() });
});

let processing = false;

async function runProcessingLoop() {
  if (processing) return;
  processing = true;

  try {
    const result = await processNextEpisode();
    if (result) {
      console.log(`Processing result: ${result.status} (episode: ${result.episodeId})`);
    }
  } catch (err) {
    console.error('Processing loop error:', err);
  } finally {
    processing = false;
  }
}

app.listen(PORT, () => {
  console.log(`Agent 2 worker running on port ${PORT}`);
  setInterval(runProcessingLoop, PROCESS_INTERVAL_MS);
  runProcessingLoop();
});
