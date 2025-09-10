// Simple Node.js database connection for production server
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

console.log('🔌 Connecting to Neon database...');

// Use your existing DATABASE_URL environment variable
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL not found in environment variables');
  module.exports = null;
} else {
  console.log('✅ DATABASE_URL found, creating connection pool...');
  
  const pool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test the connection
  pool.connect((err, client, release) => {
    if (err) {
      console.error('❌ Database connection failed:', err.message);
    } else {
      console.log('✅ Database connected successfully');
      release();
    }
  });

  // Export database functions
  module.exports = {
    // Get all clients
    async getClients() {
      try {
        const result = await pool.query('SELECT * FROM crm_clients ORDER BY created_at DESC');
        // Map database fields to frontend expected format
        const mappedClients = result.rows.map(client => ({
          id: client.id,
          firstName: client.first_name || '',
          lastName: client.last_name || '', 
          clientId: client.client_id || client.id,
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          city: client.city || '',
          state: client.state || '',
          zip: client.zip || '',
          country: client.country || '',
          total_sales: client.total_sales || 0,
          outstanding_balance: client.outstanding_balance || 0,
          createdAt: client.created_at,
          updatedAt: client.updated_at
        }));
        return mappedClients;
      } catch (error) {
        console.error('❌ Error fetching clients:', error.message);
        throw error;
      }
    },

    // Get all leads  
    async getLeads() {
      try {
        const result = await pool.query('SELECT * FROM leads ORDER BY created_at DESC');
        // Map database fields to frontend expected format
        const mappedLeads = result.rows.map(lead => ({
          id: lead.id,
          firstName: lead.first_name || '',
          lastName: lead.last_name || '',
          email: lead.email || '',
          phone: lead.phone || '',
          message: lead.message || '',
          source: lead.source || '',
          status: lead.status || 'new',
          createdAt: lead.created_at,
          updatedAt: lead.updated_at
        }));
        return mappedLeads;
      } catch (error) {
        console.error('❌ Error fetching leads:', error.message);
        throw error;
      }
    },

    // Get database counts
    async getCounts() {
      try {
        const clientsResult = await pool.query('SELECT COUNT(*) FROM crm_clients');
        const leadsResult = await pool.query('SELECT COUNT(*) FROM leads');
        
        return {
          success: true,
          data: {
            clients: parseInt(clientsResult.rows[0].count),
            leads: parseInt(leadsResult.rows[0].count)
          }
        };
      } catch (error) {
        console.error('❌ Error getting counts:', error.message);
        return { success: false, error: error.message };
      }
    },

    // Test database connection
    async testConnection() {
      try {
        const result = await pool.query('SELECT NOW()');
        return { success: true, timestamp: result.rows[0].now };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    // Send email and log to database
    async sendEmail(emailData) {
      try {
        const { to, subject, content, html, clientId, autoLinkClient, attachments } = emailData;
        
        // Try to find client if autoLinkClient is enabled
        let finalClientId = clientId;
        if (autoLinkClient && !clientId && to) {
          const clientResult = await pool.query(
            'SELECT id FROM crm_clients WHERE email ILIKE $1 LIMIT 1',
            [`%${to}%`]
          );
          if (clientResult.rows.length > 0) {
            finalClientId = clientResult.rows[0].id;
          }
        }

        // Create email transporter (basic SMTP)
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        // Prepare mail options
        const mailOptions = {
          from: process.env.SMTP_USER,
          to: to,
          subject: subject,
          text: content,
          html: html || content
        };

        // Add attachments if provided
        if (attachments && attachments.length > 0) {
          mailOptions.attachments = attachments.map(att => ({
            filename: att.name,
            content: att.data.split(',')[1], // Remove data:mime;base64, prefix
            encoding: 'base64'
          }));
        }

        // Send email
        const result = await transporter.sendMail(mailOptions);
        
        // Try to log email to database (if table exists)
        try {
          await pool.query(
            `INSERT INTO crm_messages (client_id, type, content, subject, recipient, status, created_at) 
             VALUES ($1, 'email', $2, $3, $4, 'sent', NOW())`,
            [finalClientId, content, subject, to]
          );
          console.log('✅ Email logged to crm_messages table');
        } catch (logError) {
          // Try alternative table structure
          try {
            await pool.query(
              `INSERT INTO communications (client_id, message_type, content, subject, recipient, status, created_at) 
               VALUES ($1, 'email', $2, $3, $4, 'sent', NOW())`,
              [finalClientId, content, subject, to]
            );
            console.log('✅ Email logged to communications table');
          } catch (altLogError) {
            console.log('⚠️ Could not log email to database, but email was sent successfully');
            console.log('Database log error:', logError.message);
          }
        }

        return { 
          success: true, 
          messageId: result.messageId,
          clientId: finalClientId 
        };
      } catch (error) {
        console.error('❌ Error sending email:', error.message);
        
        // Don't fail if we can't log the error to database
        console.log('⚠️ Skipping database error logging to avoid secondary failures');

        throw error;
      }
    },

    // Get database schema info
    async getTableInfo() {
      try {
        const tables = await pool.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name
        `);
        
        const tableInfo = {};
        for (const table of tables.rows) {
          const columns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = $1 AND table_schema = 'public'
            ORDER BY ordinal_position
          `, [table.table_name]);
          
          tableInfo[table.table_name] = columns.rows;
        }
        
        return { success: true, tables: tableInfo };
      } catch (error) {
        console.error('❌ Error getting table info:', error.message);
        return { success: false, error: error.message };
      }
    },

    // Get email messages for a client
    async getClientMessages(clientId) {
      try {
        // Try primary table first
        let result;
        try {
          result = await pool.query(`
            SELECT id, type, content, subject, recipient, status, 
                   created_at as "createdAt"
            FROM crm_messages 
            WHERE client_id = $1 
            ORDER BY created_at DESC
          `, [clientId]);
        } catch (error) {
          // Try alternative table structure
          try {
            result = await pool.query(`
              SELECT id, message_type as type, content, subject, recipient, status, 
                     created_at as "createdAt"
              FROM communications 
              WHERE client_id = $1 
              ORDER BY created_at DESC
            `, [clientId]);
          } catch (altError) {
            console.log('⚠️ No messages table found, returning empty array');
            return [];
          }
        }
        
        return result.rows;
      } catch (error) {
        console.error('❌ Error fetching client messages:', error.message);
        return [];
      }
    }
  };
}
