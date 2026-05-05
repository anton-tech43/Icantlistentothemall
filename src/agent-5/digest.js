// Agent 5 — Weekly operational digest
// Every Monday at 9am. Aggregates pipeline stats, quality, costs, subscribers, health.

const db = require('./db');
const { sendToAnton } = require('./resend');
const { manuscriptWrapper } = require('./email-templates');

function queryOrDefault(sql, params = [], fallback = null) {
  const dbInstance = db.getDb();
  try {
    const exists = dbInstance.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    );
    const tables = sql.match(/FROM\s+(\w+)/gi) || [];
    for (const t of tables) {
      const tableName = t.replace(/FROM\s+/i, '');
      if (!exists.get(tableName)) return fallback;
    }
    return dbInstance.prepare(sql).get(...params) || fallback;
  } catch {
    return fallback;
  }
}

function queryAllOrDefault(sql, params = [], fallback = []) {
  const dbInstance = db.getDb();
  try {
    return dbInstance.prepare(sql).all(...params) || fallback;
  } catch {
    return fallback;
  }
}

function buildDigest() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Pipeline stats
  const episodesProcessed = queryOrDefault(
    "SELECT COUNT(*) as count FROM episodes WHERE status = 'published' AND created_at >= ?",
    [weekAgo], { count: 0 }
  );
  const episodesFlagged = queryOrDefault(
    "SELECT COUNT(*) as count FROM episodes WHERE status IN ('failed', 'skipped', 'cost_exceeded') AND created_at >= ?",
    [weekAgo], { count: 0 }
  );

  // Cost stats
  const costStats = queryOrDefault(
    "SELECT SUM(cost_usd) as total, AVG(cost_usd) as avg FROM cost_tracking WHERE created_at >= ?",
    [weekAgo], { total: 0, avg: 0 }
  );

  const avgProcessingTime = queryOrDefault(
    "SELECT AVG(duration_seconds) as avg FROM pipeline_logs WHERE created_at >= ? AND step_name = 'publish'",
    [weekAgo], { avg: 0 }
  );

  // Quality stats
  const qualityStats = queryOrDefault(
    "SELECT AVG(self_review_accuracy_score) as avg_score FROM processed_content WHERE created_at >= ?",
    [weekAgo], { avg_score: 0 }
  );
  const frameworks = queryAllOrDefault(
    "SELECT pass_2_framework_selected as framework, COUNT(*) as count FROM processed_content WHERE created_at >= ? AND pass_2_framework_selected IS NOT NULL GROUP BY pass_2_framework_selected",
    [weekAgo]
  );
  const outlinesApproved = queryOrDefault(
    "SELECT COUNT(*) as total, SUM(CASE WHEN pass_2_outline_edited = 0 THEN 1 ELSE 0 END) as clean FROM processed_content WHERE created_at >= ? AND pass_2_outline_approved = 1",
    [weekAgo], { total: 0, clean: 0 }
  );
  const rewrites = queryOrDefault(
    "SELECT SUM(self_review_rewrites) as total FROM processed_content WHERE created_at >= ?",
    [weekAgo], { total: 0 }
  );

  // Subscriber stats
  const newSubscribers = queryOrDefault(
    "SELECT COUNT(*) as count FROM subscribers WHERE subscribed_at >= ?",
    [weekAgo], { count: 0 }
  );
  const totalActive = db.getActiveSubscriberCount();

  // Newsletter stats
  const lastNewsletter = queryOrDefault(
    "SELECT * FROM newsletters WHERE status = 'sent' ORDER BY sent_at DESC LIMIT 1",
    [], null
  );

  // Health
  const apiErrors = queryOrDefault(
    "SELECT COUNT(*) as count FROM pipeline_logs WHERE status = 'failed' AND created_at >= ?",
    [weekAgo], { count: 0 }
  );
  const feedFailures = queryOrDefault(
    "SELECT COUNT(*) as count FROM podcasts WHERE consecutive_failures >= 3",
    [], { count: 0 }
  );

  const weekOf = new Date().toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' });

  const frameworkList = frameworks.length > 0
    ? frameworks.map(f => `${f.framework} (${f.count})`).join(', ')
    : 'N/A';

  return {
    text: `WEEKLY DIGEST — icantlistentothemall
Week of ${weekOf}

PIPELINE
Episodes processed: ${episodesProcessed.count}
Episodes flagged/skipped: ${episodesFlagged.count}
Total cost: $${(costStats.total || 0).toFixed(2)}
Average cost per episode: $${(costStats.avg || 0).toFixed(2)}
Average processing time: ${avgProcessingTime.avg ? Math.round(avgProcessingTime.avg / 60) + ' minutes' : 'N/A'}

QUALITY
Average self-review score: ${qualityStats.avg_score ? Math.round(qualityStats.avg_score) + '/10' : 'N/A'}
Frameworks used: ${frameworkList}
Outlines approved without edits: ${outlinesApproved.clean}/${outlinesApproved.total}
Rewrites triggered: ${rewrites.total || 0}

SITE
PDF downloads: [analytics integration pending]
New subscribers: ${newSubscribers.count}
Total active subscribers: ${totalActive}

NEWSLETTER
Last issue: ${lastNewsletter ? `"${lastNewsletter.subject_line}" (sent ${lastNewsletter.sent_at})` : 'No issues sent yet'}

HEALTH
API errors this week: ${apiErrors.count}
Feed failures (3+ consecutive): ${feedFailures.count}`,

    stats: {
      episodesProcessed: episodesProcessed.count,
      totalCost: costStats.total || 0,
      newSubscribers: newSubscribers.count,
      totalActive,
      apiErrors: apiErrors.count,
    },
  };
}

async function sendDigest() {
  console.log('Building weekly digest...');
  const digest = buildDigest();

  const html = manuscriptWrapper(`
<pre style="font-family:'Courier New',Courier,monospace;font-size:13px;color:#000000;line-height:1.8;white-space:pre-wrap;margin:0;">
${digest.text}
</pre>`);

  await sendToAnton({
    subject: 'Weekly digest',
    html,
    text: digest.text,
    label: 'weekly digest',
  });

  console.log('Weekly digest sent.');
  return digest.stats;
}

module.exports = { buildDigest, sendDigest };
