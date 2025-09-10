// Supabase storage bridge removed. This file remains as a compatibility stub
// to avoid refactors in modules still importing it. Uses Neon-only.
import { decrypt } from "../util/crypto";
import { db } from "../../server/db"; // reuse existing Neon drizzle instance
import { studioIntegrations } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export interface StudioCreds {
  smtp: { host: string | null; port: number | null; user: string | null; pass: string; from: string };
  stripe: { accountId?: string };
  openai: { apiKey?: string };
  currency: string;
}

export async function loadStudioCreds(studioId: string): Promise<StudioCreds> {
  const rows = await db.select().from(studioIntegrations).where(eq(studioIntegrations.studioId, studioId));
  if (!rows.length) throw new Error('Studio integrations missing');
  const integration = rows[0];
  return {
    smtp: {
      host: integration.smtpHost,
      port: integration.smtpPort,
      user: integration.smtpUser,
      pass: decrypt(integration.smtpPassEncrypted ?? ''),
      from: integration.defaultFromEmail ?? process.env.STUDIO_DEFAULT_EMAIL_FROM ?? 'no-reply@example.com'
    },
    stripe: { accountId: integration.stripeAccountId ?? undefined },
    openai: {
      apiKey: integration.openaiApiKeyEncrypted ? decrypt(integration.openaiApiKeyEncrypted) : undefined,
    },
    currency: integration.defaultCurrency ?? 'EUR'
  };
}

export const SUPABASE_REMOVED = true;