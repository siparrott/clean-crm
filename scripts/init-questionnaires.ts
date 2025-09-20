import { pool } from "../server/db";

async function main() {
  const client = await pool.connect();
  try {
    console.log("Initializing questionnaire tables...");
    await client.query("BEGIN");
    try {
      await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
    } catch (e) {
      console.warn("pgcrypto extension create skipped:", (e as any)?.message || e);
    }
    await client.query(`
      CREATE TABLE IF NOT EXISTS questionnaires (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug          text UNIQUE NOT NULL,
        title         text NOT NULL,
        description   text,
        fields        jsonb NOT NULL,
        notify_email  text,
        is_active     boolean NOT NULL DEFAULT true,
        created_at    timestamptz NOT NULL DEFAULT now()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS questionnaire_responses (
        id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        questionnaire_id  uuid NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
        client_email      text,
        client_name       text,
        answers           jsonb NOT NULL,
        created_at        timestamptz NOT NULL DEFAULT now(),
        ip                inet,
        user_agent        text
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_qid ON questionnaire_responses(questionnaire_id);
    `);
    await client.query("COMMIT");
    console.log("✅ Questionnaire tables ensured");
  } catch (e: any) {
    await client.query("ROLLBACK");
    console.error("❌ Failed to init questionnaires:", e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
import { pool } from "../server/db";

async function run() {
  const client = await pool.connect();
  try {
    console.log("Initializing questionnaire tables...");
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS questionnaires (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug          text UNIQUE NOT NULL,
        title         text NOT NULL,
        description   text,
        fields        jsonb NOT NULL,
        notify_email  text,
        is_active     boolean NOT NULL DEFAULT true,
        created_at    timestamptz NOT NULL DEFAULT now()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS questionnaire_responses (
        id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        questionnaire_id  uuid NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
        client_email      text,
        client_name       text,
        answers           jsonb NOT NULL,
        created_at        timestamptz NOT NULL DEFAULT now(),
        ip                inet,
        user_agent        text
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_qid 
        ON questionnaire_responses(questionnaire_id);
    `);
    console.log("✅ Questionnaire tables ready");
  } catch (e: any) {
    console.error("❌ Init failed:", e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
