// Agent 2: save-pass-2 — parse the structuring output, save framework + outline
// + guest_name + page_count + raw outline text. Sends the outline review email
// to Anton with approve/flag links and advances state to awaiting_approval.
//
// Usage:
//   cat outline.txt | node src/agent-2/scripts/save-pass-2.js <episode_id>
const { supabase } = require('../utils/supabase');
const { sendAlertEmail } = require('../utils/email');
const { setStep } = require('./_set-step');

const APPROVE_URL_BASE = process.env.APPROVE_URL_BASE
  || `${process.env.SUPABASE_URL || ''}/functions/v1/approve-outline`;

async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function parseStructure(text) {
  const guestMatch = text.match(/GUEST NAME:\s*([^\n]+)/i);
  const frameworkMatch = text.match(/FRAMEWORK SELECTED:\s*([^\n—-]+)/i);
  const pagesMatch = text.match(/ESTIMATED PAGES:\s*(\d+)/i);
  const gapsMatch = text.match(/GAPS OR CONCERNS:\s*([\s\S]*?)$/i);

  return {
    guestName: guestMatch ? guestMatch[1].trim() : 'Unknown',
    framework: frameworkMatch ? frameworkMatch[1].trim() : 'Three Things Worth Knowing',
    pageCount: pagesMatch ? parseInt(pagesMatch[1], 10) : 6,
    gaps: gapsMatch ? gapsMatch[1].trim() : 'None',
  };
}

async function main() {
  const episodeId = process.argv[2];
  if (!episodeId) {
    console.error('Usage: save-pass-2.js <episode_id> < outline.txt');
    process.exit(2);
  }

  const text = await readStdin();
  if (!text.trim()) {
    console.error('Empty outline on stdin');
    process.exit(2);
  }

  const parsed = parseStructure(text);

  // Save the full outline text (and parsed metadata) into processed_content.
  // The full outline lives in the pass_2_outline column (added to schema).
  const { error: upErr } = await supabase.from('processed_content').upsert(
    {
      episode_id: episodeId,
      pass_2_framework_selected: parsed.framework,
      pass_2_outline: text.trim(),
      guest_name: parsed.guestName,
      final_page_count: parsed.pageCount,
      pass_2_outline_approved: null,
      status: 'draft',
    },
    { onConflict: 'episode_id' }
  );
  if (upErr) throw new Error(`Upsert failed: ${upErr.message}`);

  // Look up episode + podcast for the email body
  const { data: ep } = await supabase
    .from('episodes')
    .select('title, podcasts(name)')
    .eq('id', episodeId)
    .single();

  const approveUrl = `${APPROVE_URL_BASE}?episode=${episodeId}&action=approve`;
  const flagUrl = `${APPROVE_URL_BASE}?episode=${episodeId}&action=flag`;

  const body = `OUTLINE REVIEW

Episode: ${ep?.title || episodeId}
Podcast: ${ep?.podcasts?.name || '(unknown)'}
Guest: ${parsed.guestName}
Framework: ${parsed.framework}
Estimated pages: ${parsed.pageCount}

${parsed.gaps && parsed.gaps !== 'None' ? `Gaps/concerns: ${parsed.gaps}\n\n` : ''}---

${text.trim()}

---

APPROVE: ${approveUrl}
FLAG FOR REVIEW: ${flagUrl}

(Click Approve to trigger Pass 3 on the next routine fire.
 Click Flag to pause processing.)`;

  // SKIP_EMAIL=true bypasses Resend during smoke testing. The outline body
  // is logged to stderr instead so it shows up in the routine session log.
  // Approve/flag still works via the Edge Function URL — just open it in a
  // browser or curl the approve link directly.
  const skipEmail = process.env.SKIP_EMAIL === 'true' || !process.env.RESEND_API_KEY;

  if (skipEmail) {
    console.error('--- OUTLINE REVIEW (SKIP_EMAIL active, no email sent) ---');
    console.error(body);
    console.error('--- end outline review ---');
    console.error(`To approve: open ${approveUrl}`);
    console.error(`To flag:    open ${flagUrl}`);
  } else {
    await sendAlertEmail(`Outline review: ${ep?.title || episodeId}`, body);
  }

  await setStep(episodeId, 'processing', 'awaiting_approval', 'pass_2');

  console.log(JSON.stringify({ ok: true, ...parsed, emailSent: !skipEmail, approveUrl }));
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
