// Agent 5 — Database layer for subscribers and newsletters
// Local SQLite for development. Swap to Supabase client when Agent 4 sets up the schema.

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'dev.sqlite');

let _db = null;

function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      confirmation_token TEXT,
      confirmed_at TEXT,
      subscribed_at TEXT,
      unsubscribed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS newsletters (
      id TEXT PRIMARY KEY,
      subject_line TEXT,
      dialogue_header TEXT,
      top_insight_text TEXT,
      surprising_stat_text TEXT,
      actionable_tip_text TEXT,
      exercise_text TEXT,
      footer_ebook_links TEXT,
      self_review_score TEXT,
      episode_ids TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      skip_reason TEXT,
      scheduled_for TEXT,
      sent_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function uuid() {
  return crypto.randomUUID();
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// --- Subscriber operations ---

function createSubscriber(email) {
  const db = getDb();
  const id = uuid();
  const token = generateToken();

  const existing = db.prepare('SELECT id, status FROM subscribers WHERE email = ?').get(email);

  if (existing) {
    if (existing.status === 'active') {
      return { id: existing.id, token: null, alreadyActive: true };
    }
    if (existing.status === 'pending') {
      db.prepare('UPDATE subscribers SET confirmation_token = ? WHERE id = ?').run(token, existing.id);
      return { id: existing.id, token, alreadyActive: false };
    }
    if (existing.status === 'inactive') {
      db.prepare(`
        UPDATE subscribers
        SET status = 'pending', confirmation_token = ?, unsubscribed_at = NULL
        WHERE id = ?
      `).run(token, existing.id);
      return { id: existing.id, token, alreadyActive: false };
    }
  }

  db.prepare(`
    INSERT INTO subscribers (id, email, status, confirmation_token)
    VALUES (?, ?, 'pending', ?)
  `).run(id, email, token);

  return { id, token, alreadyActive: false };
}

function confirmSubscriber(token) {
  const db = getDb();
  const subscriber = db.prepare(
    'SELECT id, email, status FROM subscribers WHERE confirmation_token = ?'
  ).get(token);

  if (!subscriber) return null;
  if (subscriber.status === 'active') return { ...subscriber, alreadyConfirmed: true };

  db.prepare(`
    UPDATE subscribers
    SET status = 'active', confirmed_at = datetime('now'), subscribed_at = datetime('now'), confirmation_token = NULL
    WHERE id = ?
  `).run(subscriber.id);

  return { ...subscriber, alreadyConfirmed: false };
}

function unsubscribe(email) {
  const db = getDb();
  const result = db.prepare(`
    UPDATE subscribers SET status = 'inactive', unsubscribed_at = datetime('now') WHERE email = ? AND status = 'active'
  `).run(email);
  return result.changes > 0;
}

function getActiveSubscribers() {
  return getDb().prepare("SELECT * FROM subscribers WHERE status = 'active'").all();
}

function getActiveSubscriberCount() {
  const row = getDb().prepare("SELECT COUNT(*) as count FROM subscribers WHERE status = 'active'").get();
  return row.count;
}

function cleanupInactiveSubscribers(daysOld = 30) {
  const db = getDb();
  const result = db.prepare(`
    DELETE FROM subscribers
    WHERE status = 'inactive'
    AND unsubscribed_at <= datetime('now', '-' || ? || ' days')
  `).run(daysOld);
  return result.changes;
}

function getSubscriberByEmail(email) {
  return getDb().prepare('SELECT * FROM subscribers WHERE email = ?').get(email);
}

// --- Newsletter operations ---

function createNewsletter(data) {
  const db = getDb();
  const id = uuid();

  db.prepare(`
    INSERT INTO newsletters (id, subject_line, dialogue_header, top_insight_text, surprising_stat_text,
      actionable_tip_text, exercise_text, footer_ebook_links, self_review_score, episode_ids, status, scheduled_for)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
  `).run(
    id,
    data.subjectLine,
    data.dialogueHeader || null,
    data.topInsight,
    data.surprisingStat,
    data.actionableTip,
    data.exercise,
    JSON.stringify(data.footerEbookLinks || []),
    JSON.stringify(data.selfReviewScore || null),
    JSON.stringify(data.episodeIds || []),
    data.scheduledFor || null
  );

  return id;
}

function approveNewsletter(id) {
  getDb().prepare("UPDATE newsletters SET status = 'approved' WHERE id = ? AND status = 'draft'").run(id);
}

function markNewsletterSent(id) {
  getDb().prepare("UPDATE newsletters SET status = 'sent', sent_at = datetime('now') WHERE id = ?").run(id);
}

function markNewsletterSendFailed(id) {
  getDb().prepare("UPDATE newsletters SET status = 'send_failed' WHERE id = ?").run(id);
}

function skipNewsletter(id, reason) {
  getDb().prepare("UPDATE newsletters SET status = 'skipped', skip_reason = ? WHERE id = ?").run(reason, id);
}

function getNewsletterById(id) {
  const row = getDb().prepare('SELECT * FROM newsletters WHERE id = ?').get(id);
  if (row) {
    row.footer_ebook_links = JSON.parse(row.footer_ebook_links || '[]');
    row.self_review_score = JSON.parse(row.self_review_score || 'null');
    row.episode_ids = JSON.parse(row.episode_ids || '[]');
  }
  return row;
}

function getApprovedNewsletters() {
  return getDb().prepare("SELECT * FROM newsletters WHERE status = 'approved'").all().map(row => ({
    ...row,
    footer_ebook_links: JSON.parse(row.footer_ebook_links || '[]'),
    self_review_score: JSON.parse(row.self_review_score || 'null'),
    episode_ids: JSON.parse(row.episode_ids || '[]'),
  }));
}

function getRecentNewsletters(limit = 10) {
  return getDb().prepare("SELECT * FROM newsletters WHERE status = 'sent' ORDER BY sent_at DESC LIMIT ?").all(limit).map(row => ({
    ...row,
    footer_ebook_links: JSON.parse(row.footer_ebook_links || '[]'),
    self_review_score: JSON.parse(row.self_review_score || 'null'),
    episode_ids: JSON.parse(row.episode_ids || '[]'),
  }));
}

function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

module.exports = {
  getDb,
  uuid,
  generateToken,
  createSubscriber,
  confirmSubscriber,
  unsubscribe,
  getActiveSubscribers,
  getActiveSubscriberCount,
  cleanupInactiveSubscribers,
  getSubscriberByEmail,
  createNewsletter,
  approveNewsletter,
  markNewsletterSent,
  markNewsletterSendFailed,
  skipNewsletter,
  getNewsletterById,
  getApprovedNewsletters,
  getRecentNewsletters,
  closeDb,
};
