// Agent 2: Simple email utility for pipeline alerts and outline review notifications
const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);
const ANTON_EMAIL = process.env.ANTON_EMAIL || 'anton.gustafsson@bookbeat.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'pipeline@icantlistentothemall.com';

async function sendAlertEmail(subject, body) {
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
