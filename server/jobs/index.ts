/// <reference types="node" />
// Hourly inbox polling + existing jobs
// NOTE: Requires IMAP env vars (INBOX_IMAP_HOST, INBOX_IMAP_USER, INBOX_IMAP_PASS)
import cron from "node-cron";
import { sendEmail } from "../../agent/integrations/email";
import { storage } from "../storage";
import { importEmailsFromIMAP } from "../email-import";

// Helper: safe log wrapper for jobs
function jobLog(label: string, message: string, extra?: any) {
  const prefix = `[JOB:${label}]`;
  if (extra) {
    console.log(prefix, message, extra);
  } else {
    console.log(prefix, message);
  }
}

/* daily report 07:00 */
cron.schedule("0 7 * * *", async () => {
  const leads = await storage.getCrmLeads();
  const leadCount = leads.length;
  await sendEmail({
    to: "owner@studio.com",
    subject: "Daily report",
    html: `<h3>Total leads: ${leadCount}</h3>`
  });
}, { timezone: process.env.TZ || "UTC" });

/* flush email queue every minute */
cron.schedule("*/1 * * * *", async () => {
  // Email queue functionality will be implemented when needed
  // For now, emails are sent immediately via the CRM agent
  console.log('Email queue check - direct sending active');
});

/* hourly inbox sync (top of hour) */
cron.schedule("0 * * * *", async () => {
  const IMAP_HOST = process.env.INBOX_IMAP_HOST || process.env.IMAP_HOST;
  const IMAP_USER = process.env.INBOX_IMAP_USER || process.env.IMAP_USER;
  const IMAP_PASS = process.env.INBOX_IMAP_PASS || process.env.IMAP_PASS;
  const IMAP_PORT = parseInt(process.env.INBOX_IMAP_PORT || process.env.IMAP_PORT || '993', 10);
  const IMAP_TLS  = (process.env.INBOX_IMAP_TLS || process.env.IMAP_TLS || 'true').toLowerCase() !== 'false';

  if (!IMAP_HOST || !IMAP_USER || !IMAP_PASS) {
    jobLog('INBOX', 'Skipped hourly sync - IMAP env vars missing');
    return;
  }

  jobLog('INBOX', `Starting hourly IMAP sync for ${IMAP_USER}@${IMAP_HOST}`);
  try {
    // Determine since date based on most recent stored email (avoid full fetch each time)
    let since: Date | undefined = undefined;
    try {
      const existing = await storage.getCrmMessages(); // ordered desc by createdAt in storage implementation
      const latestEmail = existing.find(m => m.messageType === 'email');
      if (latestEmail && latestEmail.createdAt) {
        // subtract 2 minutes overlap to catch any near-boundary arrivals
        const d = new Date(latestEmail.createdAt as any);
        if (!isNaN(d.getTime())) {
          d.setMinutes(d.getMinutes() - 2);
          since = d;
        }
      }
    } catch (e) {
      jobLog('INBOX', 'Could not determine latest email timestamp, performing recent fetch only', e instanceof Error ? e.message : e);
    }

  const importedRaw = await importEmailsFromIMAP({
      host: IMAP_HOST,
      port: IMAP_PORT,
      username: IMAP_USER,
      password: IMAP_PASS,
      useTLS: IMAP_TLS,
      since
    });
  const imported = importedRaw as any[];

    jobLog('INBOX', `Fetched ${imported.length} emails from IMAP`);

    if (imported.length === 0) return;

    // Get current messages once for duplication check
    const existingMessages = await storage.getCrmMessages();
    let created = 0;
  for (const email of imported as any[]) {
      const isDuplicate = existingMessages.some(msg =>
        msg.subject === email.subject &&
        msg.senderEmail === email.from &&
        msg.createdAt && Math.abs(new Date(msg.createdAt).getTime() - new Date(email.date).getTime()) < 300000
      );
      if (isDuplicate) continue;
      try {
        await storage.createCrmMessage({
          senderName: email.fromName,
          senderEmail: email.from,
          subject: email.subject,
            content: email.body,
          status: email.isRead ? 'read' : 'unread'
        });
        created++;
      } catch (err) {
        jobLog('INBOX', 'Failed to persist email', err instanceof Error ? err.message : err);
      }
    }
    jobLog('INBOX', `Stored ${created} new emails (of ${imported.length} fetched)`);
  } catch (err) {
    jobLog('INBOX', 'Hourly IMAP sync failed', err instanceof Error ? err.message : err);
  }
}, { timezone: process.env.TZ || 'UTC' });

// NOTE: Supabase realtime/live update paths deprecated; hourly polling via Neon is now active.