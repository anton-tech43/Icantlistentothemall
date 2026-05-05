// Agent 2: bootstrap-secrets — fetch service keys from the bootstrap-secrets
// Edge Function and write them to a local .env file at the repo root. All
// other scripts use `require('dotenv').config()` and pick them up automatically.
//
// Required env vars at fire time:
//   SUPABASE_URL — your project URL (public, safe to leave in plaintext)
//   PIPELINE_API_TOKEN — bearer token to authenticate against the function
//
// Run once at the start of every routine fire:
//   node src/agent-2/scripts/bootstrap-secrets.js

const fs = require('fs');
const path = require('path');

async function main() {
  const url = process.env.SUPABASE_URL;
  const token = process.env.PIPELINE_API_TOKEN;

  if (!url || !token) {
    console.error('Missing SUPABASE_URL or PIPELINE_API_TOKEN in environment.');
    process.exit(2);
  }

  const endpoint = `${url}/functions/v1/bootstrap-secrets`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`bootstrap-secrets failed: ${res.status} ${text}`);
    process.exit(1);
  }

  const secrets = await res.json();
  const required = ['SUPABASE_SERVICE_ROLE_KEY', 'DEEPGRAM_API_KEY'];
  for (const k of required) {
    if (!secrets[k]) {
      console.error(`Missing ${k} in bootstrap response`);
      process.exit(1);
    }
  }

  // Build a .env file at the repo root. Includes SUPABASE_URL passthrough so
  // existing scripts that load dotenv get a complete environment.
  const envLines = [
    `SUPABASE_URL=${url}`,
    `SUPABASE_SERVICE_ROLE_KEY=${secrets.SUPABASE_SERVICE_ROLE_KEY}`,
    `DEEPGRAM_API_KEY=${secrets.DEEPGRAM_API_KEY}`,
  ];

  if (secrets.RESEND_API_KEY) {
    envLines.push(`RESEND_API_KEY=${secrets.RESEND_API_KEY}`);
  }

  // Pass through public-ish env vars that are configured directly in the
  // Anthropic Cloud Environment (and are safe to leave there).
  for (const k of ['ANTON_EMAIL', 'FROM_EMAIL', 'SKIP_EMAIL', 'APPROVE_URL_BASE', 'NODE_ENV']) {
    if (process.env[k]) envLines.push(`${k}=${process.env[k]}`);
  }

  const envPath = path.resolve(__dirname, '../../../.env');
  fs.writeFileSync(envPath, envLines.join('\n') + '\n', { mode: 0o600 });

  console.log(JSON.stringify({
    ok: true,
    envPath,
    keysWritten: envLines.length,
    sources: {
      bootstrap: required.concat(secrets.RESEND_API_KEY ? ['RESEND_API_KEY'] : []),
      passthrough: envLines.filter(l => !l.startsWith('SUPABASE_SERVICE_ROLE_KEY=') && !l.startsWith('DEEPGRAM_API_KEY=') && !l.startsWith('RESEND_API_KEY=')).map(l => l.split('=')[0]),
    },
  }));
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
