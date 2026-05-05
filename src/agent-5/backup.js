// Agent 5 — Nightly database backup
// Exports critical tables to JSON, compresses, emails to Anton as attachment.
// Daily at 3am: subscribers, podcasts, episodes, processed_content
// Sunday nights: also includes transcripts table

const zlib = require('zlib');
const { promisify } = require('util');
const gzip = promisify(zlib.gzip);

const db = require('./db');
const { sendToAnton } = require('./resend');

const DAILY_TABLES = ['subscribers', 'podcasts', 'episodes', 'processed_content'];
const WEEKLY_TABLES = [...DAILY_TABLES, 'transcripts'];

function exportTable(tableName) {
  const dbInstance = db.getDb();
  const exists = dbInstance.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  ).get(tableName);

  if (!exists) return [];

  return dbInstance.prepare(`SELECT * FROM ${tableName}`).all();
}

function isSunday() {
  return new Date().getDay() === 0;
}

async function runBackup() {
  const tables = isSunday() ? WEEKLY_TABLES : DAILY_TABLES;
  const backupType = isSunday() ? 'weekly (includes transcripts)' : 'daily';

  console.log(`Starting ${backupType} backup...`);

  const data = {};
  let totalRows = 0;

  for (const table of tables) {
    const rows = exportTable(table);
    data[table] = rows;
    totalRows += rows.length;
    console.log(`  ${table}: ${rows.length} row(s)`);
  }

  const json = JSON.stringify(data, null, 2);
  const compressed = await gzip(Buffer.from(json, 'utf-8'));

  const today = new Date().toISOString().slice(0, 10);
  const filename = `backup-${today}.json.gz`;

  console.log(`  JSON size: ${(json.length / 1024).toFixed(1)} KB`);
  console.log(`  Compressed: ${(compressed.length / 1024).toFixed(1)} KB`);

  await sendToAnton({
    subject: `BACKUP — icantlistentothemall — ${today}`,
    text: `${backupType.charAt(0).toUpperCase() + backupType.slice(1)} backup attached.\n\nTables: ${tables.join(', ')}\nTotal rows: ${totalRows}\nCompressed size: ${(compressed.length / 1024).toFixed(1)} KB`,
    attachments: [
      {
        filename,
        content: compressed.toString('base64'),
        content_type: 'application/gzip',
      },
    ],
    label: `${backupType} backup`,
  });

  console.log(`Backup sent: ${filename}`);
  return { filename, tables: tables.length, totalRows, sizeKb: (compressed.length / 1024).toFixed(1) };
}

module.exports = { runBackup, exportTable };
