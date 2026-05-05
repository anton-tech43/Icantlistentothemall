// Agent 5 — Double opt-in flow
// Handles: signup → confirmation email → confirm click → active → welcome email
// Called by Agent 4's API route when a new subscriber signs up.

const db = require('./db');
const { sendEmail, BASE_URL } = require('./resend');
const { confirmationEmail, welcomeEmail } = require('./email-templates');

async function handleSignup(email) {
  const normalised = email.trim().toLowerCase();

  if (!isValidEmail(normalised)) {
    return { success: false, error: 'Invalid email address' };
  }

  const { id, token, alreadyActive } = db.createSubscriber(normalised);

  if (alreadyActive) {
    return { success: true, message: 'Already subscribed' };
  }

  const confirmUrl = `${BASE_URL}/api/confirm?token=${token}`;
  const html = confirmationEmail(confirmUrl);

  await sendEmail({
    to: normalised,
    subject: "You're almost in",
    html,
    label: `confirmation to ${normalised}`,
  });

  return { success: true, subscriberId: id };
}

async function handleConfirmation(token) {
  if (!token) {
    return { success: false, error: 'Missing confirmation token' };
  }

  const result = db.confirmSubscriber(token);

  if (!result) {
    return { success: false, error: 'Invalid or expired confirmation token' };
  }

  if (result.alreadyConfirmed) {
    return { success: true, message: 'Already confirmed', redirectUrl: `${BASE_URL}/confirmed` };
  }

  await sendWelcomeEmail(result.email);

  return { success: true, redirectUrl: `${BASE_URL}/confirmed` };
}

async function sendWelcomeEmail(email) {
  const recentEbooks = getRecentPublishedEbooks();

  const nextSendDate = getNextNewsletterDate();

  const html = welcomeEmail({
    nextSendDate,
    recentEbooks,
  });

  await sendEmail({
    to: email,
    subject: "You're in. Headphones off.",
    html,
    label: `welcome to ${email}`,
  });
}

function getRecentPublishedEbooks() {
  try {
    const dbInstance = db.getDb();
    const hasTable = dbInstance.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='processed_content'"
    ).get();

    if (!hasTable) return [];

    return dbInstance.prepare(`
      SELECT pc.ebook_pdf_url, pc.summary_text, e.title, p.name as podcast_name
      FROM processed_content pc
      JOIN episodes e ON pc.episode_id = e.id
      JOIN podcasts p ON e.podcast_id = p.id
      WHERE pc.status = 'published' AND pc.ebook_pdf_url IS NOT NULL
      ORDER BY pc.published_at DESC
      LIMIT 3
    `).all().map(row => ({
      title: row.title,
      podcastName: row.podcast_name,
      pdfUrl: row.ebook_pdf_url,
    }));
  } catch {
    return [];
  }
}

function getNextNewsletterDate() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilTuesday = (2 - dayOfWeek + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilTuesday);

  if (next.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000) {
    next.setDate(next.getDate() + 14);
  } else {
    next.setDate(next.getDate() + 7);
  }

  return next.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = {
  handleSignup,
  handleConfirmation,
  sendWelcomeEmail,
};
