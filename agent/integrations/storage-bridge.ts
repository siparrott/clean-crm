import { createClient } from "@supabase/supabase-js";
import { decrypt } from "../util/crypto";
import type { StudioCreds } from "../core/ctx";
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { studioIntegrations } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Initialize Supabase client for agent operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gtnwccyxwrevfnbkjvzm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for agent operations');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Database connection for direct PostgreSQL access
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export async function loadStudioCreds(studioId: string): Promise<StudioCreds> {
  try {
    const data = await db.select().from(studioIntegrations).where(eq(studioIntegrations.studioId, studioId));
    
    if (!data || data.length === 0) {
      throw new Error("Studio integrations missing");
    }
    
    const integration = data[0];

    return {
      smtp: {
        host: integration.smtpHost,
        port: integration.smtpPort,
        user: integration.smtpUser,
        pass: decrypt(integration.smtpPassEncrypted ?? ""),
        from: integration.defaultFromEmail ?? process.env.STUDIO_DEFAULT_EMAIL_FROM ?? "no-reply@example.com",
      },
      stripe: {
        accountId: integration.stripeAccountId ?? undefined,
      },
      openai: {
        apiKey: integration.openaiApiKeyEncrypted
          ? decrypt(integration.openaiApiKeyEncrypted)
          : undefined,
      },
      currency: integration.defaultCurrency ?? "EUR",
    };
  } catch (error) {
    console.error("Failed to load studio credentials:", error);
    throw error;
  }
}