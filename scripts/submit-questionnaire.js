#!/usr/bin/env node
require('dotenv').config();

function arg(name, def = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return def;
}

async function main() {
  const base = arg('base', process.env.TEST_BASE_URL || process.env.APP_URL || '').replace(/\/$/, '');
  const slug = arg('slug') || process.env.Q_SLUG;
  if (!base || !slug) {
    console.error('Usage: node scripts/submit-questionnaire.js --base <BASE_URL> --slug <SLUG> [--name "Name"] [--email you@example.com] [--shoot Family] [--date "Next week"]');
    process.exit(2);
  }

  const name = arg('name', 'E2E Tester');
  const email = arg('email', 'e2e.tester@example.com');
  const shoot = arg('shoot', 'Family');
  const datewin = arg('date', 'Next week afternoon');

  const body = {
    client_name: name,
    client_email: email,
    shoot_type: shoot,
    date_window: datewin,
    people: '2 Adults, 1 Newborn',
    phone: '+43 660 0000000'
  };

  const url = `${base}/api/questionnaires/${slug}/submit`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  try { console.log(JSON.stringify(JSON.parse(text), null, 2)); }
  catch { console.log(text); }
  if (!res.ok) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
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
