import nodemailer from 'nodemailer';
import { db } from '../db';
import { crmMessages, crmClients } from '@shared/schema';
import { eq, or, ilike } from 'drizzle-orm';

export interface EmailAttachment {
  filename: string;
  path?: string;
  content?: Buffer;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  content: string;
  html?: string;
  attachments?: EmailAttachment[];
  clientId?: string;
  autoLinkClient?: boolean; // automatically find client by email
}

export class EnhancedEmailService {
  private static transporter: nodemailer.Transporter | null = null;

  /**
   * Initialize email transporter
   */
  static async initialize() {
    try {
      // Check if required SMTP settings are available
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️ SMTP configuration incomplete. Required: SMTP_HOST, SMTP_USER, SMTP_PASS');
        console.warn('📧 Email service will work in demo mode');
        return false;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        // Additional options for better compatibility
        tls: {
          rejectUnauthorized: false // Allow self-signed certificates
        }
      });

      // Test connection with timeout
      const testPromise = this.transporter.verify();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SMTP connection timeout')), 5000)
      );

      await Promise.race([testPromise, timeoutPromise]);
      
      console.log('✅ Email service initialized successfully');
      console.log(`📧 SMTP Host: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
      console.log(`📧 SMTP User: ${process.env.SMTP_USER}`);
      return true;

    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      console.warn('📧 Email service will work in demo mode');
      // Don't throw error, just warn and continue in demo mode
      return false;
    }
  }

  /**
   * Find client by email address
   */
  static async findClientByEmail(email: string) {
    try {
      const clients = await db
        .select()
        .from(crmClients)
        .where(ilike(crmClients.email, email))
        .limit(1);

      return clients[0] || null;
    } catch (error) {
      console.error('Error finding client by email:', error);
      return null;
    }
  }

  /**
   * Send email and automatically link to client record
   */
  static async sendEmail(options: SendEmailOptions): Promise<{
    success: boolean;
    messageId?: string;
    clientId?: string;
    error?: string;
  }> {
    try {
      // Initialize if not already done
      if (!this.transporter) {
        await this.initialize();
      }

      // Auto-link to client if requested
      let clientId = options.clientId;
      if (options.autoLinkClient && !clientId) {
        const client = await this.findClientByEmail(options.to);
        if (client) {
          clientId = client.id;
          console.log(`📧 Auto-linked email to client: ${client.firstName} ${client.lastName}`);
        }
      }

      // Demo mode if transporter not available
      if (!this.transporter) {
        console.log('📧 Demo mode: Email would be sent to:', options.to);
        console.log('📧 Demo mode: Subject:', options.subject);
        console.log('📧 Demo mode: Content preview:', options.content.substring(0, 100) + '...');
        
        // Save demo email to database (don't write `direction` — some DBs may not have this column)
        const messageRecord = await db.insert(crmMessages).values({
          senderName: process.env.BUSINESS_NAME || 'New Age Fotografie',
          senderEmail: process.env.SMTP_FROM || process.env.SMTP_USER || 'demo@example.com',
          subject: options.subject,
          content: options.content,
          messageType: 'email',
          status: 'demo_sent',
          clientId: clientId,
          emailMessageId: 'demo_' + Date.now(),
          sentAt: new Date(),
        }).returning();

        return {
          success: true,
          messageId: 'demo_' + Date.now(),
          clientId: clientId,
        };
      }

      // Real email sending
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        text: options.content,
        html: options.html || options.content.replace(/\n/g, '<br>'),
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);

      // Save to database (avoid writing `direction` to be compatible with DBs missing that column)
      const messageRecord = await db.insert(crmMessages).values({
        senderName: process.env.BUSINESS_NAME || 'New Age Fotografie',
        senderEmail: process.env.SMTP_FROM || process.env.SMTP_USER || '',
        subject: options.subject,
        content: options.content,
        messageType: 'email',
        status: 'sent',
        clientId: clientId,
        emailMessageId: result.messageId,
        attachments: options.attachments ? JSON.stringify(options.attachments.map(att => ({
          filename: att.filename,
          contentType: att.contentType
        }))) : null,
        sentAt: new Date(),
      }).returning();

      console.log(`✅ Email sent successfully to ${options.to}`, {
        messageId: result.messageId,
        clientLinked: !!clientId
      });

      return {
        success: true,
        messageId: result.messageId,
        clientId: clientId,
      };

    } catch (error) {
      console.error('❌ Failed to send email:', error);
      
      // Fallback to demo mode on SMTP errors
      console.log('📧 Falling back to demo mode due to SMTP error');
      
      try {
        // Auto-link to client if requested
        let clientId = options.clientId;
        if (options.autoLinkClient && !clientId) {
          const client = await this.findClientByEmail(options.to);
          if (client) {
            clientId = client.id;
          }
        }

        // Save demo email to database (avoid writing `direction`)
        await db.insert(crmMessages).values({
          senderName: process.env.BUSINESS_NAME || 'New Age Fotografie',
          senderEmail: process.env.SMTP_FROM || process.env.SMTP_USER || 'demo@example.com',
          subject: options.subject,
          content: options.content,
          messageType: 'email',
          status: 'demo_sent',
          clientId: clientId,
          emailMessageId: 'demo_fallback_' + Date.now(),
          sentAt: new Date(),
        });

        return {
          success: true,
          messageId: 'demo_fallback_' + Date.now(),
          clientId: clientId,
        };
        
      } catch (dbError) {
        console.error('Failed to save demo email:', dbError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get email history for a specific client
   */
  static async getClientEmailHistory(clientId: string) {
    try {
      return await db
        .select()
        .from(crmMessages)
        .where(
          eq(crmMessages.clientId, clientId)
        )
        .orderBy(crmMessages.createdAt);
    } catch (error) {
      console.error('Error fetching client email history:', error);
      return [];
    }
  }

  /**
   * Get all email communications
   */
  static async getAllEmailHistory(limit = 50) {
    try {
        return await db
        .select({
          id: crmMessages.id,
          subject: crmMessages.subject,
          senderEmail: crmMessages.senderEmail,
          status: crmMessages.status,
          clientId: crmMessages.clientId,
          sentAt: crmMessages.sentAt,
          createdAt: crmMessages.createdAt,
          // Join client info
          clientName: crmClients.firstName,
          clientLastName: crmClients.lastName,
          clientEmail: crmClients.email,
        })
        .from(crmMessages)
        .leftJoin(crmClients, eq(crmMessages.clientId, crmClients.id))
        .where(eq(crmMessages.messageType, 'email'))
        .orderBy(crmMessages.createdAt)
        .limit(limit);
    } catch (error) {
      console.error('Error fetching email history:', error);
      return [];
    }
  }

  /**
   * Mark email as read
   */
  static async markAsRead(messageId: string) {
    try {
      await db
        .update(crmMessages)
        .set({ 
          status: 'read',
          readAt: new Date()
        })
        .where(eq(crmMessages.id, messageId));
    } catch (error) {
      console.error('Error marking email as read:', error);
    }
  }
}

// Email templates for common scenarios
export const EmailTemplates = {
  /**
   * Welcome email for new clients
   */
  welcome: (clientName: string) => ({
    subject: 'Willkommen bei New Age Fotografie!',
    content: `Liebe/r ${clientName},

herzlich willkommen bei New Age Fotografie! 

Wir freuen uns sehr, Sie als neuen Kunden begrüßen zu dürfen. Unser Team steht Ihnen jederzeit zur Verfügung, um Ihre Fotoshoot-Wünsche zu verwirklichen.

Was Sie als nächstes erwartet:
• Terminbestätigung innerhalb von 24 Stunden
• Persönliche Beratung zu Ihrem Fotoshoot
• Professionelle Nachbearbeitung Ihrer Bilder
• Zugang zu Ihrer privaten Online-Galerie

Bei Fragen können Sie uns jederzeit unter dieser E-Mail-Adresse oder telefonisch erreichen.

Wir freuen uns auf Ihr Fotoshoot!

Herzliche Grüße
Ihr Team von New Age Fotografie`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7C3AED;">Willkommen bei New Age Fotografie!</h2>
        <p>Liebe/r ${clientName},</p>
        <p>herzlich willkommen bei New Age Fotografie!</p>
        <p>Wir freuen uns sehr, Sie als neuen Kunden begrüßen zu dürfen. Unser Team steht Ihnen jederzeit zur Verfügung, um Ihre Fotoshoot-Wünsche zu verwirklichen.</p>
        
        <h3>Was Sie als nächstes erwartet:</h3>
        <ul>
          <li>Terminbestätigung innerhalb von 24 Stunden</li>
          <li>Persönliche Beratung zu Ihrem Fotoshoot</li>
          <li>Professionelle Nachbearbeitung Ihrer Bilder</li>
          <li>Zugang zu Ihrer privaten Online-Galerie</li>
        </ul>
        
        <p>Bei Fragen können Sie uns jederzeit unter dieser E-Mail-Adresse oder telefonisch erreichen.</p>
        <p>Wir freuen uns auf Ihr Fotoshoot!</p>
        
        <p>Herzliche Grüße<br>
        Ihr Team von New Age Fotografie</p>
      </div>
    `
  }),

  /**
   * Booking confirmation email
   */
  bookingConfirmation: (clientName: string, date: string, time: string, type: string) => ({
    subject: 'Terminbestätigung - Ihr Fotoshoot bei New Age Fotografie',
    content: `Liebe/r ${clientName},

vielen Dank für Ihre Buchung! Hiermit bestätigen wir Ihren Termin:

📅 Datum: ${date}
🕐 Uhrzeit: ${time}
📸 Art: ${type}
📍 Ort: Unser Studio in Wien

Bitte bringen Sie mit:
• Verschiedene Outfits nach Ihrem Geschmack
• Persönliche Accessoires
• Gute Laune!

Bei Fragen oder Änderungen kontaktieren Sie uns bitte mindestens 24 Stunden vorher.

Wir freuen uns auf Sie!

Herzliche Grüße
Ihr Team von New Age Fotografie`
  }),

  /**
   * Follow-up after photoshoot
   */
  shootingFollowUp: (clientName: string) => ({
    subject: 'Danke für Ihr Vertrauen - Ihre Bilder sind in Bearbeitung',
    content: `Liebe/r ${clientName},

vielen Dank für das wunderbare Fotoshoot! Es hat uns große Freude bereitet, Sie zu fotografieren.

Ihre Bilder befinden sich nun in der professionellen Nachbearbeitung. Sie können sich auf folgendes freuen:

• Farbkorrektur und Optimierung jedes Bildes
• Zugang zu Ihrer privaten Online-Galerie
• High-Resolution Downloads verfügbar
• Optional: Professionelle Prints und Produkte

Die Bearbeitung dauert normalerweise 7-14 Werktage. Sie erhalten automatisch eine E-Mail, sobald Ihre Galerie bereit ist.

Vielen Dank für Ihr Vertrauen!

Herzliche Grüße
Ihr Team von New Age Fotografie`
  })
};

export default EnhancedEmailService;
