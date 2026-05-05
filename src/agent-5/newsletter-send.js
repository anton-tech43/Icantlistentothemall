// Agent 5 — Newsletter approval and sending
// Handles: approve → send to all active subscribers → mark episodes included

const db = require('./db');
const { sendEmail, sendToAnton, BASE_URL } = require('./resend');
const { newsletterEmail } = require('./email-templates');
const { markEpisodesIncluded } = require('./newsletter-generate');

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1000;

async function handleApprove(newsletterId) {
  const newsletter = db.getNewsletterById(newsletterId);
  if (!newsletter) return { success: false, error: 'Newsletter not found' };
  if (newsletter.status !== 'draft') return { success: false, error: `Cannot approve — status is ${newsletter.status}` };

  db.approveNewsletter(newsletterId);
  console.log(`Newsletter ${newsletterId} approved. Starting send...`);

  const result = await sendNewsletter(newsletterId);
  return result;
}

async function handleHold(newsletterId) {
  const newsletter = db.getNewsletterById(newsletterId);
  if (!newsletter) return { success: false, error: 'Newsletter not found' };

  console.log(`Newsletter ${newsletterId} held for review. No changes made.`);
  return { success: true, message: 'Newsletter held as draft for manual review' };
}

async function sendNewsletter(newsletterId) {
  const newsletter = db.getNewsletterById(newsletterId);
  if (!newsletter) return { success: false, error: 'Newsletter not found' };
  if (newsletter.status !== 'approved') return { success: false, error: `Cannot send — status is ${newsletter.status}` };

  const subscribers = db.getActiveSubscribers();
  console.log(`Sending to ${subscribers.length} active subscriber(s)...`);

  if (subscribers.length === 0) {
    console.log('No active subscribers. Marking as sent (empty audience).');
    db.markNewsletterSent(newsletterId);
    return { success: true, sent: 0 };
  }

  const dialogueParts = newsletter.dialogue_header ? newsletter.dialogue_header.split('\n') : [];
  const dialogueHeader = {
    reader: dialogueParts[0] || '"I missed another 3-hour episode" he said',
    response: dialogueParts[1] || '–We caught it for you we said',
  };

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(sub => {
        const unsubscribeUrl = `${BASE_URL}/api/unsubscribe?email=${encodeURIComponent(sub.email)}`;

        const html = newsletterEmail({
          dialogueHeader,
          topInsight: {
            text: newsletter.top_insight_text,
            episodeTitle: '',
            podcastName: '',
            ebookUrl: '#',
          },
          surprisingStat: newsletter.surprising_stat_text,
          actionableTip: newsletter.actionable_tip_text,
          exercise: newsletter.exercise_text,
          footerEbookLinks: newsletter.footer_ebook_links,
          unsubscribeUrl,
        });

        return sendEmail({
          to: sub.email,
          subject: newsletter.subject_line,
          html,
          label: `newsletter to ${sub.email}`,
        });
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') sent++;
      else failed++;
    }

    if (i + BATCH_SIZE < subscribers.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log(`Send complete: ${sent} sent, ${failed} failed`);

  if (failed > 0 && sent === 0) {
    db.markNewsletterSendFailed(newsletterId);

    await sendToAnton({
      subject: 'Newsletter send FAILED',
      text: `Newsletter "${newsletter.subject_line}" failed to send to all ${subscribers.length} subscriber(s). The newsletter is stored as approved and will retry on the next hourly check.\n\nNewsletter ID: ${newsletterId}`,
      label: 'newsletter send failure alert',
    }).catch(() => {});

    return { success: false, error: 'All sends failed', sent, failed };
  }

  db.markNewsletterSent(newsletterId);
  markEpisodesIncluded(newsletter.episode_ids);

  if (failed > 0) {
    await sendToAnton({
      subject: 'Newsletter sent with partial failures',
      text: `Newsletter "${newsletter.subject_line}" sent to ${sent}/${subscribers.length} subscriber(s). ${failed} failed.\n\nNewsletter ID: ${newsletterId}`,
      label: 'newsletter partial failure alert',
    }).catch(() => {});
  }

  return { success: true, sent, failed };
}

async function retrySendFailed() {
  const dbInstance = db.getDb();
  const failedNewsletters = dbInstance.prepare(
    "SELECT id FROM newsletters WHERE status = 'send_failed'"
  ).all();

  for (const nl of failedNewsletters) {
    console.log(`Retrying failed newsletter ${nl.id}...`);
    db.approveNewsletter(nl.id);
    await sendNewsletter(nl.id);
  }

  return failedNewsletters.length;
}

module.exports = {
  handleApprove,
  handleHold,
  sendNewsletter,
  retrySendFailed,
};
