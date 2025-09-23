require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

(async () => {
  try {
    const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'crm_clients' ORDER BY ordinal_position`;
    console.log('crm_clients columns:');
    console.log(JSON.stringify(cols, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();