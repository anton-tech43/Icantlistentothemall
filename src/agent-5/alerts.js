// Agent 5 — Hourly alert monitoring
// Queries pipeline_logs, cost_tracking, processing_queue, podcasts, subscribers.
// Fires email alerts to Anton when conditions are met.

const db = require('./db');
const { sendToAnton } = require('./resend');

function queryVal(sql, params = [], fallback = null) {
  try {
    const dbInstance = db.getDb();
    const exists = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?");
    const tables = sql.match(/FROM\s+(\w+)/gi) || [];
    for (const t of tables) {
      const name = t.replace(/FROM\s+/i, '');
      if (!exists.get(name)) return fallback;
    }
    return dbInstance.prepare(sql).get(...params) || fallback;
  } catch {
    return fallback;
  }
}

const ALERT_CHECKS = [
  {
    name: 'weekly_cost_cap',
    severity: 'HIGH',
    check() {
      const weekStart = getWeekStart();
      const row = queryVal(
        "SELECT SUM(cost_usd) as total FROM cost_tracking WHERE created_at >= ?",
        [weekStart], { total: 0 }
      );
      return (row.total || 0) >= 30
        ? `Weekly cost cap hit: $${(row.total).toFixed(2)} (threshold: $30). Processing queue paused.`
        : null;
    },
  },
  {
    name: 'episode_cost_exceeded',
    severity: 'HIGH',
    check() {
      const row = queryVal(
        "SELECT episode_id, SUM(cost_usd) as total FROM cost_tracking GROUP BY episode_id HAVING total >= 8 ORDER BY total DESC LIMIT 1",
        [], null
      );
      return row
        ? `Episode cost exceeded: episode ${row.episode_id} at $${row.total.toFixed(2)} (threshold: $8).`
        : null;
    },
  },
  {
    name: 'monthly_budget_warning',
    severity: 'MEDIUM',
    check() {
      const monthStart = getMonthStart();
      const row = queryVal(
        "SELECT SUM(cost_usd) as total FROM cost_tracking WHERE created_at >= ?",
        [monthStart], { total: 0 }
      );
      const total = row.total || 0;
      if (total >= 200) return `Monthly spend $${total.toFixed(2)} — CRITICAL. All processing paused. Manual restart required.`;
      if (total >= 150) return `Monthly spend $${total.toFixed(2)} — approaching $200 ceiling.`;
      return null;
    },
  },
  {
    name: 'quality_degradation',
    severity: 'MEDIUM',
    check() {
      const rows = queryVal(
        "SELECT AVG(json_extract(self_review_scores, '$.ebook.total')) as avg_score FROM (SELECT self_review_scores FROM processed_content WHERE self_review_scores IS NOT NULL ORDER BY created_at DESC LIMIT 3)",
        [], { avg_score: null }
      );
      return rows.avg_score !== null && rows.avg_score < 35
        ? `Quality degradation: average self-review score ${Math.round(rows.avg_score)}/50 over last 3 episodes (threshold: 35).`
        : null;
    },
  },
  {
    name: 'feed_failure',
    severity: 'MEDIUM',
    check() {
      const dbInstance = db.getDb();
      try {
        const exists = dbInstance.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='podcasts'").get();
        if (!exists) return null;
        const rows = dbInstance.prepare("SELECT name, consecutive_failures FROM podcasts WHERE consecutive_failures >= 3").all();
        if (rows.length === 0) return null;
        return `Feed failure: ${rows.map(r => `${r.name} (${r.consecutive_failures} consecutive failures)`).join(', ')}`;
      } catch {
        return null;
      }
    },
  },
  {
    name: 'worker_stalled',
    severity: 'HIGH',
    check() {
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const queued = queryVal(
        "SELECT COUNT(*) as count FROM processing_queue WHERE status = 'queued'",
        [], { count: 0 }
      );
      if ((queued.count || 0) === 0) return null;

      const recent = queryVal(
        "SELECT COUNT(*) as count FROM processing_queue WHERE status = 'complete' AND completed_at >= ?",
        [twoDaysAgo], { count: 0 }
      );
      return (recent.count || 0) === 0
        ? `Worker stalled: ${queued.count} item(s) queued but no successful processing in 48 hours.`
        : null;
    },
  },
  {
    name: 'api_error_spike',
    severity: 'HIGH',
    check() {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const total = queryVal(
        "SELECT COUNT(*) as count FROM pipeline_logs WHERE created_at >= ?",
        [dayAgo], { count: 0 }
      );
      const errors = queryVal(
        "SELECT COUNT(*) as count FROM pipeline_logs WHERE status = 'failed' AND created_at >= ?",
        [dayAgo], { count: 0 }
      );
      if ((total.count || 0) < 5) return null;
      const errorRate = (errors.count || 0) / total.count;
      return errorRate > 0.2
        ? `API error spike: ${Math.round(errorRate * 100)}% error rate in last 24h (${errors.count}/${total.count} calls).`
        : null;
    },
  },
  {
    name: 'subscriber_milestone',
    severity: 'INFO',
    check() {
      const count = db.getActiveSubscriberCount();
      const milestones = [5000, 1000, 500, 100];
      for (const m of milestones) {
        if (count >= m && count < m + 10) {
          return `Subscriber milestone: ${count} active subscribers (crossed ${m}).`;
        }
      }
      return null;
    },
  },
];

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

async function runAlertCheck() {
  console.log('Running hourly alert check...');
  const triggered = [];

  for (const alert of ALERT_CHECKS) {
    try {
      const message = alert.check();
      if (message) {
        triggered.push({ name: alert.name, severity: alert.severity, message });
      }
    } catch (err) {
      console.error(`Alert check ${alert.name} failed:`, err.message);
    }
  }

  if (triggered.length === 0) {
    console.log('  No alerts triggered.');
    return [];
  }

  console.log(`  ${triggered.length} alert(s) triggered:`);
  for (const alert of triggered) {
    console.log(`    [${alert.severity}] ${alert.name}: ${alert.message}`);
  }

  const alertText = triggered.map(a =>
    `[${a.severity}] ${a.name}\n${a.message}`
  ).join('\n\n---\n\n');

  const highCount = triggered.filter(a => a.severity === 'HIGH').length;
  const subject = highCount > 0
    ? `ALERT (${highCount} HIGH) — ${triggered[0].message.slice(0, 60)}`
    : `Alert — ${triggered[0].message.slice(0, 60)}`;

  await sendToAnton({
    subject,
    text: `ALERT CHECK — icantlistentothemall\n${new Date().toISOString()}\n\n${alertText}`,
    label: 'alert check',
  }).catch(err => console.error('Failed to send alert email:', err.message));

  return triggered;
}

module.exports = { runAlertCheck, ALERT_CHECKS };
