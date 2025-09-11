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
      
      // Initialize database schema
      initializeDatabaseSchema();
    }
  });

  // Initialize database schema
  async function initializeDatabaseSchema() {
    try {
      console.log('🔨 Initializing database schema...');
      
      // Create CRM Clients table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS crm_clients (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          client_id TEXT UNIQUE,
          first_name VARCHAR(255),
          last_name VARCHAR(255),
          email VARCHAR(255),
          phone VARCHAR(50),
          address TEXT,
          city VARCHAR(100),
          state VARCHAR(100),
          zip VARCHAR(20),
          country VARCHAR(100),
          total_sales DECIMAL(10,2) DEFAULT 0,
          outstanding_balance DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      // Create Leads table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS leads (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          first_name VARCHAR(255),
          last_name VARCHAR(255),
          email VARCHAR(255),
          phone VARCHAR(50),
          message TEXT,
          source VARCHAR(100),
          status VARCHAR(50) DEFAULT 'new',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      // Create Invoices table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS invoices (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          client_id TEXT,
          invoice_number VARCHAR(50) UNIQUE,
          status VARCHAR(50) DEFAULT 'draft',
          due_date DATE,
          subtotal DECIMAL(10,2) DEFAULT 0,
          tax_amount DECIMAL(10,2) DEFAULT 0,
          total_amount DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      // Create Digital Files table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS digital_files (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          folder_name TEXT,
          file_name TEXT NOT NULL,
          file_type TEXT NOT NULL,
          file_size INTEGER DEFAULT 0,
          client_id TEXT,
          session_id TEXT,
          description TEXT,
          tags TEXT,
          is_public BOOLEAN DEFAULT FALSE,
          uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          file_path TEXT,
          original_filename TEXT,
          mime_type TEXT,
          category TEXT,
          uploaded_by TEXT,
          location TEXT
        )
      `);
      
      // Create CRM Messages table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS crm_messages (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          client_id TEXT,
          type VARCHAR(50) DEFAULT 'email',
          content TEXT,
          subject VARCHAR(500),
          recipient VARCHAR(255),
          sender_name VARCHAR(255),
          sender_email VARCHAR(255),
          status VARCHAR(50) DEFAULT 'unread',
          message_type VARCHAR(50),
          client_name VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      // Create Galleries table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS galleries (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          slug VARCHAR(255) UNIQUE,
          cover_image TEXT,
          password_hash TEXT,
          download_enabled BOOLEAN DEFAULT TRUE,
          is_public BOOLEAN DEFAULT FALSE,
          client_id TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      console.log('✅ Database schema initialized successfully');
      
    } catch (error) {
      console.error('❌ Error initializing database schema:', error.message);
    }
  }

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
        console.log(`📧 Email sent successfully to ${to}, Message ID: ${result.messageId}`);
        
        // Try to log email to database (if table exists)
        console.log('💾 Attempting to log sent email to database...');
        try {
          await pool.query(
            `INSERT INTO crm_messages (client_id, type, content, subject, recipient, status, created_at) 
             VALUES ($1, 'email', $2, $3, $4, 'sent', NOW())`,
            [finalClientId, content, subject, to]
          );
          console.log('✅ Email logged to crm_messages table');
        } catch (logError) {
          console.log('⚠️ crm_messages failed, trying communications table...');
          // Try alternative table structure
          try {
            await pool.query(
              `INSERT INTO communications (client_id, message_type, content, subject, recipient, status, created_at) 
               VALUES ($1, 'email', $2, $3, $4, 'sent', NOW())`,
              [finalClientId, content, subject, to]
            );
            console.log('✅ Email logged to communications table');
          } catch (altLogError) {
            console.log('⚠️ communications failed, creating/using sent_emails table...');
            // Create a simple sent_emails table if nothing else works
            try {
              await pool.query(`
                CREATE TABLE IF NOT EXISTS sent_emails (
                  id SERIAL PRIMARY KEY,
                  recipient VARCHAR(255) NOT NULL,
                  subject VARCHAR(500),
                  content TEXT,
                  html TEXT,
                  client_id INTEGER,
                  message_id VARCHAR(255),
                  sent_at TIMESTAMP DEFAULT NOW()
                )
              `);
              
              await pool.query(
                `INSERT INTO sent_emails (recipient, subject, content, html, client_id, message_id, sent_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                [to, subject, content, html, finalClientId, result.messageId]
              );
              console.log('✅ Email logged to sent_emails table (created)');
            } catch (createError) {
              console.log('⚠️ Could not log email to database, but email was sent successfully');
              console.log('Database log error details:', createError.message);
              console.log('Original error:', logError.message);
            }
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
    },

    // Get all sent emails
    async getSentEmails() {
      try {
        console.log('🔍 Fetching sent emails from database...');
        // Try multiple table structures
        let result;
        
        try {
          console.log('📧 Trying sent_emails table...');
          result = await pool.query(`
            SELECT id, recipient, subject, content, message_id, sent_at as "sentAt", client_id as "clientId"
            FROM sent_emails 
            ORDER BY sent_at DESC 
            LIMIT 100
          `);
          console.log(`✅ Found ${result.rows.length} emails in sent_emails table`);
        } catch (error) {
          console.log('⚠️ sent_emails table not found, trying crm_messages...');
          try {
            result = await pool.query(`
              SELECT id, recipient, subject, content, status, created_at as "sentAt", client_id as "clientId"
              FROM crm_messages 
              WHERE type = 'email' AND status = 'sent'
              ORDER BY created_at DESC 
              LIMIT 100
            `);
            console.log(`✅ Found ${result.rows.length} emails in crm_messages table`);
          } catch (altError) {
            console.log('⚠️ crm_messages table not found, trying communications...');
            try {
              result = await pool.query(`
                SELECT id, recipient, subject, content, status, created_at as "sentAt", client_id as "clientId"
                FROM communications 
                WHERE message_type = 'email' AND status = 'sent'
                ORDER BY created_at DESC 
                LIMIT 100
              `);
              console.log(`✅ Found ${result.rows.length} emails in communications table`);
            } catch (finalError) {
              console.log('⚠️ No sent emails table found, returning empty array');
              console.log('Available tables might not include email logging structures');
              return [];
            }
          }
        }
        
        console.log(`📤 Returning ${result.rows.length} sent emails`);
        return result.rows;
      } catch (error) {
        console.error('❌ Error fetching sent emails:', error.message);
        return [];
      }
    },

    // Find client by email address
    async findClientByEmail(email) {
      try {
        const result = await pool.query(`
          SELECT id, first_name, last_name, email 
          FROM crm_clients 
          WHERE LOWER(email) = LOWER($1)
        `, [email]);
        
        return result.rows.length > 0 ? result.rows[0] : null;
      } catch (error) {
        console.error('❌ Error finding client by email:', error.message);
        return null;
      }
    },

    // IMAP Email Import Function
    async importEmailsFromIMAP() {
      const imap = require('imap');
      const { simpleParser } = require('mailparser');
      
      return new Promise((resolve, reject) => {
        console.log('📥 Starting IMAP email import...');
        
        // IMAP Configuration from environment variables
        const imapConfig = {
          user: process.env.IMAP_USER || process.env.SMTP_USER || 'hallo@newagefotografie.com',
          password: process.env.IMAP_PASS || process.env.SMTP_PASS || 'HoveBN41!',
          host: process.env.IMAP_HOST || 'imap.easyname.com',
          port: parseInt(process.env.IMAP_PORT || '993'),
          tls: (process.env.IMAP_TLS || 'true').toLowerCase() !== 'false',
          tlsOptions: { rejectUnauthorized: false },
          connTimeout: 30000,
          authTimeout: 30000,
          keepalive: false
        };

        console.log(`🔌 Connecting to IMAP: ${imapConfig.user}@${imapConfig.host}:${imapConfig.port}`);

        const connection = new imap(imapConfig);
        const emails = [];
        let imported = 0;
        let processed = 0;

        // Add timeout for the whole operation
        const timeout = setTimeout(() => {
          connection.end();
          reject(new Error('IMAP connection timeout after 60 seconds'));
        }, 60000);

        connection.once('ready', () => {
          console.log('✅ IMAP connection ready');
          
          connection.openBox('INBOX', true, (err, box) => {
            if (err) {
              clearTimeout(timeout);
              return reject(err);
            }

            console.log(`📧 INBOX opened - ${box.messages.total} total messages`);
            
            if (box.messages.total === 0) {
              clearTimeout(timeout);
              connection.end();
              return resolve({ imported: 0, processed: 0 });
            }

            // Fetch recent emails (last 20 to avoid overwhelming)
            const recent = Math.max(1, box.messages.total - 19);
            const fetchRange = `${recent}:${box.messages.total}`;
            
            console.log(`📨 Fetching emails ${fetchRange}`);
            
            const fetch = connection.fetch(fetchRange, {
              bodies: '',
              struct: true,
              markSeen: false
            });

            const emailPromises = [];

            fetch.on('message', (msg, seqno) => {
              const emailPromise = new Promise(async (emailResolve) => {
                let buffer = '';
                
                msg.on('body', (stream, info) => {
                  stream.on('data', (chunk) => {
                    buffer += chunk.toString('utf8');
                  });
                  
                  stream.once('end', async () => {
                    try {
                      const parsed = await simpleParser(buffer);
                      
                      const emailData = {
                        senderName: parsed.from?.text?.split('<')[0]?.trim() || 'Unknown',
                        senderEmail: parsed.from?.value?.[0]?.address || parsed.from?.text || 'unknown@unknown.com',
                        subject: parsed.subject || 'No Subject',
                        content: parsed.text || parsed.html || 'No content',
                        createdAt: parsed.date || new Date(),
                        status: 'unread',
                        messageType: 'email'
                      };
                      
                      // Skip sent items and system messages
                      if (!emailData.subject.startsWith('[SENT]') && 
                          !emailData.subject.includes('Auto-Reply') &&
                          emailData.senderEmail !== 'hallo@newagefotografie.com') {
                        
                        // Check if email already exists
                        const existing = await this.getCrmMessages();
                        const isDuplicate = existing.some(msg =>
                          msg.subject === emailData.subject &&
                          msg.senderEmail === emailData.senderEmail &&
                          Math.abs(new Date(msg.createdAt).getTime() - new Date(emailData.createdAt).getTime()) < 300000
                        );
                        
                        if (!isDuplicate) {
                          // Try to auto-link to client
                          const client = await this.findClientByEmail(emailData.senderEmail);
                          if (client) {
                            emailData.clientId = client.id;
                            emailData.clientName = `${client.first_name} ${client.last_name}`.trim();
                            console.log(`🔗 Auto-linked email to client: ${emailData.clientName}`);
                          }

                          // Save email to database
                          await this.createCrmMessage(emailData);
                          emails.push(emailData);
                          imported++;
                        }
                      }
                      
                      processed++;
                      emailResolve();
                    } catch (error) {
                      console.error('❌ Error processing email:', error);
                      emailResolve();
                    }
                  });
                });
              });
              
              emailPromises.push(emailPromise);
            });

            fetch.once('error', (err) => {
              clearTimeout(timeout);
              console.error('❌ Fetch error:', err);
              reject(err);
            });

            fetch.once('end', async () => {
              try {
                await Promise.all(emailPromises);
                clearTimeout(timeout);
                connection.end();
                
                console.log(`✅ Email import completed: ${imported} new emails, ${processed} processed`);
                resolve({ imported, processed, emails });
              } catch (error) {
                clearTimeout(timeout);
                console.error('❌ Error processing emails:', error);
                connection.end();
                reject(error);
              }
            });
          });
        });

        connection.once('error', (err) => {
          clearTimeout(timeout);
          console.error('❌ IMAP connection error:', err);
          reject(err);
        });

        connection.once('end', () => {
          console.log('📪 IMAP connection ended');
        });

        connection.connect();
      });
    },

    // Assign email to client manually
    async assignEmailToClient(messageId, clientId) {
      try {
        // Try different table structures
        let result;
        
        try {
          result = await pool.query(`
            UPDATE crm_messages 
            SET client_id = $1, client_name = (
              SELECT CONCAT(first_name, ' ', last_name) 
              FROM crm_clients 
              WHERE id = $1
            )
            WHERE id = $2
            RETURNING *
          `, [clientId, messageId]);
        } catch (error) {
          // Try alternative table structure
          try {
            result = await pool.query(`
              UPDATE communications 
              SET client_id = $1
              WHERE id = $2
              RETURNING *
            `, [clientId, messageId]);
          } catch (altError) {
            throw new Error(`Unable to assign email to client: ${error.message}`);
          }
        }
        
        if (result.rows.length > 0) {
          console.log(`✅ Email ${messageId} assigned to client ${clientId}`);
          return result.rows[0];
        } else {
          throw new Error('Email not found');
        }
      } catch (error) {
        console.error('❌ Error assigning email to client:', error.message);
        throw error;
      }
    },

    // Digital Files Management Functions
    
    // Get digital files with filtering
    async getDigitalFiles(filters = {}) {
      try {
        const { folder_name, file_type, client_id, session_id, search_term, is_public, limit = 20 } = filters;
        
        let query = `
          SELECT id, folder_name, file_name, file_type, file_size, 
                 client_id, session_id, description, tags, is_public, 
                 uploaded_at, created_at, updated_at
          FROM digital_files
        `;
        
        const conditions = [];
        const values = [];
        let paramIndex = 1;
        
        if (folder_name) {
          conditions.push(`folder_name ILIKE $${paramIndex}`);
          values.push(`%${folder_name}%`);
          paramIndex++;
        }
        
        if (file_type) {
          conditions.push(`file_type = $${paramIndex}`);
          values.push(file_type);
          paramIndex++;
        }
        
        if (client_id) {
          conditions.push(`client_id = $${paramIndex}`);
          values.push(client_id);
          paramIndex++;
        }
        
        if (session_id) {
          conditions.push(`session_id = $${paramIndex}`);
          values.push(session_id);
          paramIndex++;
        }
        
        if (search_term) {
          conditions.push(`file_name ILIKE $${paramIndex}`);
          values.push(`%${search_term}%`);
          paramIndex++;
        }
        
        if (is_public !== undefined) {
          conditions.push(`is_public = $${paramIndex}`);
          values.push(is_public);
          paramIndex++;
        }
        
        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ` ORDER BY uploaded_at DESC LIMIT $${paramIndex}`;
        values.push(parseInt(limit));
        
        const result = await pool.query(query, values);
        return result.rows;
      } catch (error) {
        console.error('❌ Error fetching digital files:', error.message);
        throw error;
      }
    },

    // Create digital file record
    async createDigitalFile(fileData) {
      try {
        const {
          id,
          folder_name,
          file_name,
          file_type,
          file_size,
          client_id,
          session_id,
          description = '',
          tags = [],
          is_public = false,
          file_path,
          original_filename,
          mime_type,
          category,
          uploaded_by,
          location
        } = fileData;

        // Create table if it doesn't exist
        await pool.query(`
          CREATE TABLE IF NOT EXISTS digital_files (
            id TEXT PRIMARY KEY,
            folder_name TEXT,
            file_name TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER DEFAULT 0,
            client_id TEXT,
            session_id TEXT,
            description TEXT,
            tags TEXT,
            is_public BOOLEAN DEFAULT FALSE,
            uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            file_path TEXT,
            original_filename TEXT,
            mime_type TEXT,
            category TEXT,
            uploaded_by TEXT,
            location TEXT
          )
        `);

        const fileId = id || require('crypto').randomUUID();
        
        const result = await pool.query(`
          INSERT INTO digital_files (
            id, folder_name, file_name, file_type, file_size, 
            client_id, session_id, description, tags, is_public, 
            uploaded_at, created_at, updated_at, file_path,
            original_filename, mime_type, category, uploaded_by, location
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
            NOW(), NOW(), NOW(), $11, $12, $13, $14, $15, $16
          ) RETURNING *
        `, [
          fileId, folder_name, file_name, file_type, file_size,
          client_id || null, session_id || null, description, 
          JSON.stringify(tags), is_public, file_path,
          original_filename, mime_type, category, uploaded_by, location
        ]);

        return result.rows[0];
      } catch (error) {
        console.error('❌ Error creating digital file:', error.message);
        throw error;
      }
    },

    // Update digital file metadata
    async updateDigitalFile(fileId, updateData) {
      try {
        // Remove ID from update data
        const { id, ...cleanData } = updateData;
        
        // Convert tags to JSON string if provided
        if (cleanData.tags && Array.isArray(cleanData.tags)) {
          cleanData.tags = JSON.stringify(cleanData.tags);
        }
        
        // Build update query dynamically
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        
        for (const [key, value] of Object.entries(cleanData)) {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
        
        if (updateFields.length === 0) {
          throw new Error('No fields to update');
        }
        
        updateFields.push(`updated_at = NOW()`);
        values.push(fileId);
        
        const result = await pool.query(`
          UPDATE digital_files 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING *
        `, values);

        if (result.rows.length === 0) {
          throw new Error('File not found');
        }

        return result.rows[0];
      } catch (error) {
        console.error('❌ Error updating digital file:', error.message);
        throw error;
      }
    },

    // Delete digital file
    async deleteDigitalFile(fileId) {
      try {
        const result = await pool.query(
          'DELETE FROM digital_files WHERE id = $1 RETURNING *',
          [fileId]
        );

        if (result.rows.length === 0) {
          throw new Error('File not found');
        }

        return result.rows[0];
      } catch (error) {
        console.error('❌ Error deleting digital file:', error.message);
        throw error;
      }
    },

    // Get folder statistics
    async getDigitalFilesFolderStats(folderName = null) {
      try {
        let folderStatsQuery = `
          SELECT 
            folder_name,
            COUNT(*) as file_count,
            SUM(file_size) as total_size,
            COUNT(CASE WHEN file_type = 'image' THEN 1 END) as image_count,
            COUNT(CASE WHEN file_type = 'document' THEN 1 END) as document_count,
            COUNT(CASE WHEN file_type = 'video' THEN 1 END) as video_count,
            MAX(uploaded_at) as last_uploaded
          FROM digital_files
        `;

        const values = [];
        if (folderName) {
          folderStatsQuery += ` WHERE folder_name = $1`;
          values.push(folderName);
        }

        folderStatsQuery += ` GROUP BY folder_name ORDER BY file_count DESC`;

        const folders = await pool.query(folderStatsQuery, values);

        // Get recent files
        const recentFiles = await pool.query(`
          SELECT folder_name, file_name, file_type, uploaded_at
          FROM digital_files
          ORDER BY uploaded_at DESC
          LIMIT 10
        `);

        return {
          total_folders: folders.rows.length,
          folders: folders.rows.map(folder => ({
            name: folder.folder_name,
            file_count: parseInt(folder.file_count),
            total_size: `${(parseInt(folder.total_size) / 1024 / 1024).toFixed(2)} MB`,
            breakdown: {
              images: parseInt(folder.image_count),
              documents: parseInt(folder.document_count),
              videos: parseInt(folder.video_count)
            },
            last_uploaded: folder.last_uploaded
          })),
          recent_files: recentFiles.rows.map(file => ({
            folder: file.folder_name,
            name: file.file_name,
            type: file.file_type,
            uploaded: file.uploaded_at
          }))
        };
      } catch (error) {
        console.error('❌ Error getting folder stats:', error.message);
        throw error;
      }
    }
  };
}
