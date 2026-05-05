// Agent 2: Simple email utility for pipeline alerts and outline review notifications.
// When SKIP_EMAIL=true or RESEND_API_KEY is missing, logs the email to stderr
// instead of sending. This lets the smoke-test routine run without Resend
// configured.
const { Resend } = require('resend');
require('dotenv').config();

const ANTON_EMAIL = process.env.ANTON_EMAIL || 'anton.gustafsson@bookbeat.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'pipeline@icantlistentothemall.com';

const skipEmail = () => process.env.SKIP_EMAIL === 'true' || !process.env.RESEND_API_KEY;

async function sendAlertEmail(subject, body) {
  if (skipEmail()) {
    console.error(`--- ALERT EMAIL (skipped, SKIP_EMAIL or no RESEND_API_KEY) ---`);
    console.error(`Subject: ${subject}`);
    console.error(body);
    console.error(`--- end alert email ---`);
    return { skipped: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: ANTON_EMAIL,
    subject: `[icantlistentothemall] ${subject}`,
    text: body,
  });

  if (error) {
    console.error('Failed to send alert email:', error);
    throw error;
  }

  return data;
}

module.exports = { sendAlertEmail };
