// Agent 5 — Resend email client with exponential backoff retry
// Handles all outbound email: confirmation, welcome, newsletter, alerts, backups, digests.

const { Resend } = require('resend');
require('dotenv').config();

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const ANTON_EMAIL = process.env.ANTON_EMAIL || 'anton.gustafsson@bookbeat.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'hello@icantlistentothemall.com';
const BASE_URL = process.env.BASE_URL || 'https://icantlistentothemall.com';

const RETRY_DELAYS = [0, 5 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000];

async function sleep(ms) {
  if (ms <= 0) return;
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendWithRetry(emailOptions, { maxAttempts = 4, label = 'email' } = {}) {
  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
      console.log(`  Retry ${attempt}/${maxAttempts - 1} for ${label} — waiting ${Math.round(delay / 1000)}s`);
      await sleep(delay);
    }

    try {
      if (!resend) throw new Error('Resend not configured — set RESEND_API_KEY');
      const { data, error } = await resend.emails.send(emailOptions);
      if (error) throw new Error(error.message || JSON.stringify(error));
      return data;
    } catch (err) {
      lastError = err;
      console.error(`  ${label} attempt ${attempt + 1} failed: ${err.message}`);
    }
  }

  throw lastError;
}

async function sendEmail({ to, subject, html, text, attachments, label }) {
  return sendWithRetry(
    {
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      attachments,
    },
    { label: label || `email to ${to}` }
  );
}

async function sendToAnton({ subject, html, text, attachments, label }) {
  return sendEmail({
    to: ANTON_EMAIL,
    subject: `[icantlistentothemall] ${subject}`,
    html,
    text,
    label: label || 'email to Anton',
    attachments,
  });
}

module.exports = {
  resend,
  sendEmail,
  sendToAnton,
  sendWithRetry,
  ANTON_EMAIL,
  FROM_EMAIL,
  BASE_URL,
};
