// Agent 5 — Email HTML templates (manuscript aesthetic)
// Monospaced, black on white, no images, max-width 600px.
// Built as plain HTML strings — deliberately simple to render perfectly everywhere.

const { BASE_URL } = require('./resend');

function manuscriptWrapper(bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>icantlistentothemall</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="font-family:'Courier New',Courier,monospace;font-size:14px;line-height:1.8;color:#000000;">
              ${bodyContent}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function confirmationEmail(confirmUrl) {
  const body = `
<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#666666;margin:0 0 40px 0;">
  icantlistentothemall
</p>

<p style="font-family:'Courier New',Courier,monospace;font-size:16px;color:#000000;margin:0 0 40px 0;">
  One click and you'll stop pretending you'll get to all those podcast episodes.
</p>

<p style="margin:0 0 40px 0;">
  <a href="${confirmUrl}" style="font-family:'Courier New',Courier,monospace;font-size:16px;color:#000000;text-decoration:underline;">Confirm my subscription</a>
</p>

<p style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#666666;margin:40px 0 0 0;">
  icantlistentothemall.com
</p>`;

  return manuscriptWrapper(body);
}

function welcomeEmail({ nextSendDate, recentEbooks }) {
  let ebookSection = '';

  if (recentEbooks && recentEbooks.length > 0) {
    const ebookLinks = recentEbooks.map(ebook =>
      `<a href="${ebook.pdfUrl}" style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;text-decoration:underline;">${ebook.title}</a> — ${ebook.podcastName}`
    ).join('<br style="margin-bottom:8px;">\n');

    ebookSection = `
<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;margin:0 0 8px 0;">
  In the meantime, here are the latest ebooks:
</p>
<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;margin:0 0 40px 0;line-height:2.2;">
  ${ebookLinks}
</p>`;
  }

  const dateText = nextSendDate ? `Your first newsletter arrives on ${nextSendDate}.` : 'Your first newsletter arrives soon.';

  const body = `
<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#666666;margin:0 0 40px 0;">
  icantlistentothemall
</p>

<p style="font-family:'Courier New',Courier,monospace;font-size:16px;color:#000000;margin:0 0 24px 0;">
  Every two weeks you'll get the sharpest insights from the best business podcasts. No fluff, no filler, no ads.
</p>

<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;margin:0 0 40px 0;">
  ${dateText}
</p>

${ebookSection}

<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;margin:0 0 0 0;">
  <a href="${BASE_URL}" style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;text-decoration:underline;">icantlistentothemall.com</a>
</p>`;

  return manuscriptWrapper(body);
}

function newsletterEmail({ dialogueHeader, topInsight, surprisingStat, actionableTip, exercise, footerEbookLinks, unsubscribeUrl }) {
  const reader = dialogueHeader?.reader || '"I missed another 3-hour episode" he said';
  const response = dialogueHeader?.response || '–We caught it for you we said';

  let ebookFooter = '';
  if (footerEbookLinks && footerEbookLinks.length > 0) {
    const links = footerEbookLinks.map(link =>
      `<a href="${link.pdfUrl}" style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;text-decoration:underline;">${link.title}</a> · ${link.podcastName} · ${link.pageCount} pages`
    ).join('<br>\n');

    ebookFooter = `
<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;margin:0 0 8px 0;">
  Free e-books from the last two weeks:
</p>
<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;margin:0 0 40px 0;line-height:2.2;">
  ${links}
</p>`;
  }

  const body = `
<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#666666;margin:0 0 40px 0;">
  icantlistentothemall
</p>

<p style="font-family:'Courier New',Courier,monospace;font-size:16px;color:#000000;margin:0 0 4px 0;">
  ${reader}
</p>
<p style="font-family:'Courier New',Courier,monospace;font-size:16px;color:#000000;margin:0 0 40px 0;">
  ${response}
</p>

<hr style="border:none;border-top:1px solid #000000;margin:0 0 40px 0;">

<p style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#000000;font-weight:bold;letter-spacing:1px;margin:0 0 16px 0;">
  TOP INSIGHT
</p>
<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;margin:0 0 8px 0;">
  ${topInsight.text}
</p>
<p style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#666666;margin:0 0 8px 0;">
  From: ${topInsight.episodeTitle} · ${topInsight.podcastName}
</p>
<p style="margin:0 0 40px 0;">
  <a href="${topInsight.ebookUrl}" style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;text-decoration:underline;">Read the full e-book</a>
</p>

<p style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#000000;font-weight:bold;letter-spacing:1px;margin:0 0 16px 0;">
  SURPRISING STAT
</p>
<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;margin:0 0 40px 0;">
  ${surprisingStat}
</p>

<p style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#000000;font-weight:bold;letter-spacing:1px;margin:0 0 16px 0;">
  DO THIS TODAY
</p>
<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;margin:0 0 40px 0;">
  ${actionableTip}
</p>

<p style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#000000;font-weight:bold;letter-spacing:1px;margin:0 0 16px 0;">
  REFLECT ON THIS
</p>
<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;margin:0 0 40px 0;">
  ${exercise}
</p>

<hr style="border:none;border-top:1px solid #000000;margin:0 0 40px 0;">

${ebookFooter}

<hr style="border:none;border-top:1px solid #000000;margin:0 0 40px 0;">

<p style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#666666;margin:0 0 8px 0;">
  <a href="${BASE_URL}" style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#666666;text-decoration:underline;">icantlistentothemall.com</a>
</p>
<p style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#666666;margin:0;">
  <a href="${unsubscribeUrl || '#'}" style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#666666;text-decoration:underline;">unsubscribe</a>
</p>`;

  return manuscriptWrapper(body);
}

function antonNotificationEmail({ newsletter, approveUrl, holdUrl }) {
  const body = `
<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#666666;margin:0 0 24px 0;">
  NEWSLETTER DRAFT READY FOR REVIEW
</p>

<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;margin:0 0 8px 0;">
  <strong>Subject line (ranked):</strong>
</p>
<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;margin:0 0 24px 0;">
  1. ${newsletter.subjectLine}<br>
  ${newsletter.alternativeSubjects ? newsletter.alternativeSubjects.map((s, i) => `${i + 2}. ${s}`).join('<br>\n  ') : ''}
</p>

<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;margin:0 0 8px 0;">
  <strong>Dialogue header:</strong>
</p>
<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;margin:0 0 24px 0;">
  ${newsletter.dialogueHeader}
</p>

<hr style="border:none;border-top:1px solid #000000;margin:0 0 24px 0;">

<p style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#000000;font-weight:bold;margin:0 0 8px 0;">TOP INSIGHT</p>
<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;margin:0 0 24px 0;">
  ${newsletter.topInsight}
</p>

<p style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#000000;font-weight:bold;margin:0 0 8px 0;">SURPRISING STAT</p>
<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;margin:0 0 24px 0;">
  ${newsletter.surprisingStat}
</p>

<p style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#000000;font-weight:bold;margin:0 0 8px 0;">DO THIS TODAY</p>
<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;margin:0 0 24px 0;">
  ${newsletter.actionableTip}
</p>

<p style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#000000;font-weight:bold;margin:0 0 8px 0;">REFLECT ON THIS</p>
<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;margin:0 0 24px 0;">
  ${newsletter.exercise}
</p>

<hr style="border:none;border-top:1px solid #000000;margin:0 0 24px 0;">

<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;margin:0 0 8px 0;">
  Self-review score: ${newsletter.selfReviewScore || 'N/A'}
</p>
<p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;margin:0 0 24px 0;">
  Episodes covered: ${newsletter.episodeCount || 0}
</p>

<p style="margin:0 0 8px 0;">
  <a href="${approveUrl}" style="font-family:'Courier New',Courier,monospace;font-size:16px;color:#000000;text-decoration:underline;font-weight:bold;">Approve and send</a>
</p>
<p style="margin:0;">
  <a href="${holdUrl}" style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#666666;text-decoration:underline;">Hold for review</a>
</p>`;

  return manuscriptWrapper(body);
}

module.exports = {
  manuscriptWrapper,
  confirmationEmail,
  welcomeEmail,
  newsletterEmail,
  antonNotificationEmail,
};
