import cron from "node-cron";
import { sendEmail } from "../../agent/integrations/email";
import { storage } from "../storage";

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