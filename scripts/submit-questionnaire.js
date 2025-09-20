#!/usr/bin/env node
// Submits a test response to a questionnaire

require('dotenv').config();

async function main() {
  const appUrl = (process.env.APP_BASE_URL || process.env.APP_URL || '').replace(/\/$/, '');
  if (!appUrl) throw new Error('APP_URL or APP_BASE_URL not set');

  const slugEnv = process.env.Q_SLUG;
  let slug = slugEnv;

  if (!slug) {
    // load latest
    const neonModule = require('@neondatabase/serverless');
    const sql = neonModule.neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT slug FROM questionnaires WHERE is_active = true ORDER BY created_at DESC LIMIT 1`;
    if (!rows.length) throw new Error('No questionnaires found');
    slug = rows[0].slug;
  }

  // Build payload matching dynamic fields
  const neonModule = require('@neondatabase/serverless');
  const sql = neonModule.neon(process.env.DATABASE_URL);
  const [qn] = await sql`SELECT fields FROM questionnaires WHERE slug = ${slug}`;
  const fields = qn?.fields || [];
  const payload = {
    client_name: process.env.Q_NAME || 'QA Test User',
    client_email: process.env.Q_EMAIL || 'qa+questionnaire@newagefotografie.com',
  };
  for (const f of fields) {
    if (f.type === 'select' && Array.isArray(f.options) && f.options.length) {
      payload[f.key] = f.options[0];
    } else if (f.type === 'checkbox') {
      payload[f.key] = false;
    } else {
      payload[f.key] = `Test value for ${f.label}`;
    }
  }

  const url = `${appUrl}/api/questionnaires/${slug}/submit`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const text = await resp.text();
  console.log(text);
}

main().catch((e) => { console.error(e); process.exit(1); });
// Submits a test response for a given slug
const url = process.env.APP_URL || 'https://clean-crm-photography-cf3af67a2afe.herokuapp.com';
const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node scripts/submit-questionnaire.js <slug>');
  process.exit(1);
}
(async () => {
  try {
    const payload = {
      client_name: 'Test User',
      client_email: 'test@example.com',
      note: 'This is a test submission.'
    };
    const res = await fetch(`${url}/api/questionnaires/${slug}/submit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    console.log(text);
  } catch (e) {
    console.error('submit-questionnaire error:', e);
    process.exit(1);
  }
})();
