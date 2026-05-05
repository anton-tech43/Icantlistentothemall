// Agent 5 — Unsubscribe handling
// Marks subscriber as inactive immediately. Cleanup cron deletes after 30 days.

const db = require('./db');

function handleUnsubscribe(email) {
  if (!email) {
    return { success: false, error: 'Missing email' };
  }

  const normalised = email.trim().toLowerCase();
  const result = db.unsubscribe(normalised);

  if (!result) {
    return { success: false, error: 'Subscriber not found or already unsubscribed' };
  }

  return { success: true };
}

function runCleanup(daysOld = 30) {
  const deleted = db.cleanupInactiveSubscribers(daysOld);
  console.log(`Subscriber cleanup: deleted ${deleted} inactive subscriber(s) older than ${daysOld} days`);
  return deleted;
}

module.exports = {
  handleUnsubscribe,
  runCleanup,
};
