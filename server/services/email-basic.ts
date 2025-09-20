import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

export async function sendNotification(opts: { to: string; subject: string; html: string }) {
  const from = process.env.FROM_EMAIL || "no-reply@example.com";
  await transporter.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html });
}
