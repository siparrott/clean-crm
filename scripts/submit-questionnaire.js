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
