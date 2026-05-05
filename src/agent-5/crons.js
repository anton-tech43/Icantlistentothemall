// Agent 5 — Cron entry points for Railway worker
// Each function is called by the Railway cron scheduler at its configured interval.

const { runCleanup } = require('./unsubscribe');
const { generateNewsletter } = require('./newsletter-generate');
const { retrySendFailed } = require('./newsletter-send');
const { runBackup } = require('./backup');
const { sendDigest } = require('./digest');
const { runAlertCheck } = require('./alerts');

async function cronNewsletter() {
  console.log(`[${new Date().toISOString()}] Cron: newsletter generation`);
  try {
    const result = await generateNewsletter();
    console.log('Newsletter cron complete:', result);
  } catch (err) {
    console.error('Newsletter cron failed:', err);
  }
}

async function cronHourly() {
  console.log(`[${new Date().toISOString()}] Cron: hourly check`);
  try {
    await runAlertCheck();
    await retrySendFailed();
  } catch (err) {
    console.error('Hourly cron failed:', err);
  }
}

async function cronNightlyBackup() {
  console.log(`[${new Date().toISOString()}] Cron: nightly backup`);
  try {
    await runBackup();
  } catch (err) {
    console.error('Backup cron failed:', err);
  }
}

async function cronWeeklyDigest() {
  console.log(`[${new Date().toISOString()}] Cron: weekly digest`);
  try {
    await sendDigest();
  } catch (err) {
    console.error('Digest cron failed:', err);
  }
}

async function cronDailyCleanup() {
  console.log(`[${new Date().toISOString()}] Cron: subscriber cleanup`);
  try {
    const deleted = runCleanup(30);
    console.log(`Cleanup complete: ${deleted} removed`);
  } catch (err) {
    console.error('Cleanup cron failed:', err);
  }
}

module.exports = {
  cronNewsletter,
  cronHourly,
  cronNightlyBackup,
  cronWeeklyDigest,
  cronDailyCleanup,
};
