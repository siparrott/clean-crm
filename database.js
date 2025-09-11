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

      // Create Photography Sessions table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS photography_sessions (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          session_type VARCHAR(50) DEFAULT 'portrait',
          status VARCHAR(50) DEFAULT 'scheduled',
          start_time TIMESTAMP WITH TIME ZONE,
          end_time TIMESTAMP WITH TIME ZONE,
          client_id TEXT,
          client_name VARCHAR(255),
          client_email VARCHAR(255),
          client_phone VARCHAR(50),
          attendees JSONB DEFAULT '[]',
          location_name VARCHAR(255),
          location_address TEXT,
          location_coordinates VARCHAR(100),
          base_price DECIMAL(10,2),
          deposit_amount DECIMAL(10,2),
          deposit_paid BOOLEAN DEFAULT FALSE,
          final_payment DECIMAL(10,2),
          final_payment_paid BOOLEAN DEFAULT FALSE,
          payment_status VARCHAR(50) DEFAULT 'pending',
          equipment_list JSONB DEFAULT '[]',
          crew_members JSONB DEFAULT '[]',
          conflict_detected BOOLEAN DEFAULT FALSE,
          weather_dependent BOOLEAN DEFAULT FALSE,
          golden_hour_optimized BOOLEAN DEFAULT FALSE,
          backup_plan TEXT,
          notes TEXT,
          portfolio_worthy BOOLEAN DEFAULT FALSE,
          editing_status VARCHAR(50) DEFAULT 'pending',
          delivery_status VARCHAR(50) DEFAULT 'pending',
          delivery_date TIMESTAMP WITH TIME ZONE,
          is_recurring BOOLEAN DEFAULT FALSE,
          recurrence_rule VARCHAR(255),
          parent_event_id TEXT,
          google_calendar_event_id VARCHAR(255),
          ical_uid VARCHAR(255),
          external_calendar_sync BOOLEAN DEFAULT FALSE,
          reminder_settings JSONB DEFAULT '{}',
          reminder_sent BOOLEAN DEFAULT FALSE,
          confirmation_sent BOOLEAN DEFAULT FALSE,
          follow_up_sent BOOLEAN DEFAULT FALSE,
          is_online_bookable BOOLEAN DEFAULT FALSE,
          booking_requirements JSONB DEFAULT '{}',
          availability_status VARCHAR(50) DEFAULT 'available',
          color VARCHAR(7),
          priority VARCHAR(20) DEFAULT 'medium',
          is_public BOOLEAN DEFAULT FALSE,
          category VARCHAR(100),
          gallery_id TEXT,
          photographer_id TEXT,
          tags JSONB DEFAULT '[]',
          custom_fields JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create Voucher Products table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS voucher_products (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          original_price DECIMAL(10,2),
          category VARCHAR(100),
          type VARCHAR(50) DEFAULT 'voucher',
          sku VARCHAR(100) UNIQUE,
          is_active BOOLEAN DEFAULT TRUE,
          features JSONB DEFAULT '[]',
          terms_and_conditions TEXT,
          validity_period INTEGER DEFAULT 365,
          display_order INTEGER DEFAULT 0,
          image_url TEXT,
          thumbnail_url TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Insert default voucher products if table is empty
      const voucherCount = await pool.query('SELECT COUNT(*) FROM voucher_products');
      if (parseInt(voucherCount.rows[0].count) === 0) {
        console.log('📦 Adding default voucher products...');
        
        await pool.query(`
          INSERT INTO voucher_products (name, description, price, original_price, category, sku, features, terms_and_conditions) VALUES
          ('Family Basic Shooting', 'Perfect for Small Families - 30 minutes shooting with 1 edited photo', 95.00, 195.00, 'family', 'FAM-BASIC', 
           '["30 Minuten Shooting", "1 bearbeitete Fotos", "Begrüßungsgetränk", "Outfit-Wechsel möglich"]', 
           'Gutschein gültig für 1 Jahr ab Kaufdatum. Terminvereinbarung erforderlich.'),
          
          ('Family Premium Shooting', 'Ideal for larger families - 45 minutes shooting with 5 edited photos', 195.00, 295.00, 'family', 'FAM-PREMIUM',
           '["45 Minuten Shooting", "5 bearbeitete Fotos", "Begrüßungsgetränk", "Outfit-Wechsel möglich"]',
           'Gutschein gültig für 1 Jahr ab Kaufdatum. Terminvereinbarung erforderlich.'),
           
          ('Family Deluxe Shooting', 'Complete family experience - 60 minutes shooting with 10 edited photos', 295.00, 395.00, 'family', 'FAM-DELUXE',
           '["60 Minuten Shooting", "10 bearbeitete Fotos", "Begrüßungsgetränk", "Outfit-Wechsel möglich", "Online Galerie"]',
           'Gutschein gültig für 1 Jahr ab Kaufdatum. Terminvereinbarung erforderlich.'),
           
          ('Newborn Basic', 'First precious moments - 30 minutes newborn shooting', 95.00, 195.00, 'newborn', 'NB-BASIC',
           '["30min Shooting", "1 bearbeitete Fotos", "2 Setups", "Requisiten inklusive"]',
           'Beste Zeit: 5-14 Tage nach der Geburt. Terminvereinbarung erforderlich.'),
           
          ('Maternity Basic', 'Beautiful pregnancy memories - 30 minutes maternity shooting', 95.00, 195.00, 'maternity', 'MAT-BASIC',
           '["30 Minuten Shooting", "1 bearbeitete Fotos", "1 Outfit", "Partner-Fotos optional"]',
           'Gutschein gültig für 1 Jahr ab Kaufdatum. Terminvereinbarung erforderlich.'),
           
          ('Business Portrait', 'Professional business portraits', 150.00, 250.00, 'business', 'BUS-PORTRAIT',
           '["45 Minuten Shooting", "3 bearbeitete Fotos", "Professionelle Ausleuchtung", "LinkedIn optimiert"]',
           'Perfekt für Business-Profile und Website. Terminvereinbarung erforderlich.'),
           
          ('Event Photography', 'Professional event documentation', 350.00, 450.00, 'event', 'EVENT-BASIC',
           '["2 Stunden Shooting", "25 bearbeitete Fotos", "Online Galerie", "Alle Rechte inklusive"]',
           'Ideal für Firmenfeiern, Geburtstage und besondere Anlässe.')
        `);
        
        console.log('✅ Default voucher products added');
      }
      
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
    },

    // Photography Sessions Functions
    async getPhotographySessions() {
      try {
        const result = await pool.query(`
          SELECT 
            id, title, description, session_type as "sessionType", status,
            start_time as "startTime", end_time as "endTime",
            client_id as "clientId", client_name as "clientName", client_email as "clientEmail", client_phone as "clientPhone",
            location_name as "locationName", location_address as "locationAddress", location_coordinates as "locationCoordinates",
            base_price as "basePrice", deposit_amount as "depositAmount", deposit_paid as "depositPaid",
            final_payment as "finalPayment", final_payment_paid as "finalPaymentPaid", payment_status as "paymentStatus",
            equipment_list as "equipmentList", crew_members as "crewMembers",
            conflict_detected as "conflictDetected", weather_dependent as "weatherDependent", 
            golden_hour_optimized as "goldenHourOptimized", backup_plan as "backupPlan",
            notes, portfolio_worthy as "portfolioWorthy", editing_status as "editingStatus",
            delivery_status as "deliveryStatus", delivery_date as "deliveryDate",
            is_recurring as "isRecurring", recurrence_rule as "recurrenceRule", parent_event_id as "parentEventId",
            google_calendar_event_id as "googleCalendarEventId", ical_uid as "icalUid", external_calendar_sync as "externalCalendarSync",
            reminder_settings as "reminderSettings", reminder_sent as "reminderSent", confirmation_sent as "confirmationSent", follow_up_sent as "followUpSent",
            is_online_bookable as "isOnlineBookable", booking_requirements as "bookingRequirements", availability_status as "availabilityStatus",
            color, priority, is_public as "isPublic", category, gallery_id as "galleryId", photographer_id as "photographerId",
            tags, custom_fields as "customFields", created_at as "createdAt", updated_at as "updatedAt"
          FROM photography_sessions 
          ORDER BY start_time ASC
        `);
        
        return result.rows.map(session => ({
          ...session,
          equipmentList: session.equipmentList || [],
          crewMembers: session.crewMembers || [],
          tags: session.tags || [],
          reminderSettings: session.reminderSettings || {},
          bookingRequirements: session.bookingRequirements || {},
          customFields: session.customFields || {}
        }));
      } catch (error) {
        console.error('❌ Error getting photography sessions:', error.message);
        // Return empty array if table doesn't exist yet
        return [];
      }
    },

    async createPhotographySession(sessionData) {
      try {
        const {
          title, description, sessionType, status = 'scheduled',
          startTime, endTime, clientId, clientName, clientEmail, clientPhone,
          locationName, locationAddress, locationCoordinates,
          basePrice, depositAmount, equipmentList = [],
          weatherDependent = false, goldenHourOptimized = false, portfolioWorthy = false,
          notes, color, priority = 'medium'
        } = sessionData;

        const result = await pool.query(`
          INSERT INTO photography_sessions (
            title, description, session_type, status,
            start_time, end_time, client_id, client_name, client_email, client_phone,
            location_name, location_address, location_coordinates,
            base_price, deposit_amount, equipment_list,
            weather_dependent, golden_hour_optimized, portfolio_worthy,
            notes, color, priority, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW()
          ) RETURNING *
        `, [
          title, description, sessionType, status,
          startTime, endTime, clientId, clientName, clientEmail, clientPhone,
          locationName, locationAddress, locationCoordinates,
          basePrice, depositAmount, JSON.stringify(equipmentList),
          weatherDependent, goldenHourOptimized, portfolioWorthy,
          notes, color, priority
        ]);

        console.log(`📸 Photography session created: ${title}`);
        return result.rows[0];
      } catch (error) {
        console.error('❌ Error creating photography session:', error.message);
        throw error;
      }
    },

    async getDashboardStats() {
      try {
        // Get counts from various tables
        const sessionStats = await pool.query(`
          SELECT 
            COUNT(*) as total_sessions,
            COUNT(CASE WHEN start_time > NOW() AND start_time <= NOW() + INTERVAL '30 days' THEN 1 END) as upcoming_sessions,
            COUNT(CASE WHEN status = 'completed' AND DATE_TRUNC('month', start_time) = DATE_TRUNC('month', NOW()) THEN 1 END) as completed_sessions,
            SUM(CASE WHEN base_price IS NOT NULL THEN base_price ELSE 0 END) as total_revenue,
            COUNT(CASE WHEN deposit_amount IS NOT NULL AND NOT COALESCE(deposit_paid, false) THEN 1 END) as pending_deposits
          FROM photography_sessions
        `);

        const leadStats = await pool.query(`
          SELECT COUNT(*) as new_leads
          FROM crm_leads 
          WHERE created_at >= NOW() - INTERVAL '7 days'
        `);

        const stats = sessionStats.rows[0] || {};
        const leads = leadStats.rows[0] || {};

        return {
          totalSessions: parseInt(stats.total_sessions) || 0,
          upcomingSessions: parseInt(stats.upcoming_sessions) || 0,
          completedSessions: parseInt(stats.completed_sessions) || 0,
          totalRevenue: parseFloat(stats.total_revenue) || 0,
          pendingDeposits: parseInt(stats.pending_deposits) || 0,
          equipmentConflicts: 0, // Would need more complex logic
          newLeads: parseInt(leads.new_leads) || 0
        };
      } catch (error) {
        console.error('❌ Error getting dashboard stats:', error.message);
        // Return default stats if tables don't exist
        return {
          totalSessions: 0,
          upcomingSessions: 0,
          completedSessions: 0,
          totalRevenue: 0,
          pendingDeposits: 0,
          equipmentConflicts: 0,
          newLeads: 0
        };
      }
    },

    async getTopClients(orderBy = 'total_sales', limit = 20) {
      try {
        let orderColumn = 'COALESCE(total_sales, 0)';
        
        if (orderBy === 'outstanding_balance') {
          orderColumn = 'COALESCE(outstanding_balance, 0)';
        } else if (orderBy === 'created_at') {
          orderColumn = 'created_at';
        }

        const result = await pool.query(`
          SELECT 
            id,
            client_id,
            first_name,
            last_name,
            email,
            phone,
            COALESCE(total_sales, 0) as total_sales,
            COALESCE(outstanding_balance, 0) as outstanding_balance,
            created_at,
            updated_at,
            CASE 
              WHEN COALESCE(total_sales, 0) >= 10000 THEN 'Premium'
              WHEN COALESCE(total_sales, 0) >= 5000 THEN 'Gold'
              WHEN COALESCE(total_sales, 0) >= 1000 THEN 'Silver'
              ELSE 'Bronze'
            END as tier
          FROM crm_clients 
          ORDER BY ${orderColumn} DESC 
          LIMIT $1
        `, [limit]);

        // Map database fields to frontend expected format
        const mappedClients = result.rows.map(client => ({
          id: client.id,
          clientId: client.client_id || client.id,
          firstName: client.first_name || '',
          lastName: client.last_name || '',
          email: client.email || '',
          phone: client.phone || '',
          revenue: parseFloat(client.total_sales) || 0,
          outstandingBalance: parseFloat(client.outstanding_balance) || 0,
          tier: client.tier,
          createdAt: client.created_at,
          updatedAt: client.updated_at
        }));

        return mappedClients;
      } catch (error) {
        console.error('❌ Error fetching top clients:', error.message);
        
        // If columns don't exist, return empty array or try a simpler query
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.log('📝 Trying simpler query without sales columns...');
          
          try {
            const simpleResult = await pool.query(`
              SELECT 
                id,
                client_id,
                first_name,
                last_name,
                email,
                phone,
                created_at
              FROM crm_clients 
              ORDER BY created_at DESC 
              LIMIT $1
            `, [limit]);

            const mappedClients = simpleResult.rows.map(client => ({
              id: client.id,
              clientId: client.client_id || client.id,
              firstName: client.first_name || '',
              lastName: client.last_name || '',
              email: client.email || '',
              phone: client.phone || '',
              revenue: 0,
              outstandingBalance: 0,
              tier: 'Bronze',
              createdAt: client.created_at
            }));

            return mappedClients;
          } catch (fallbackError) {
            console.error('❌ Fallback query also failed:', fallbackError.message);
            return [];
          }
        }
        
        throw error;
      }
    },

    // Voucher Products Functions
    async getVoucherProducts() {
      try {
        console.log('🔍 Getting voucher products from database...');
        const result = await pool.query(`
          SELECT * FROM voucher_products 
          WHERE is_active = true 
          ORDER BY display_order ASC, created_at DESC
        `);
        console.log('✅ Found voucher products:', result.rows.length);
        if (result.rows.length > 0) {
          console.log('📋 First product:', result.rows[0].name, '- €' + result.rows[0].price);
        }
        return result.rows;
      } catch (error) {
        console.error('❌ Error fetching voucher products:', error.message);
        console.error('❌ Error details:', error);
        throw error;
      }
    },

    async getVoucherProduct(id) {
      try {
        const result = await pool.query('SELECT * FROM voucher_products WHERE id = $1', [id]);
        return result.rows[0] || null;
      } catch (error) {
        console.error('❌ Error fetching voucher product:', error.message);
        throw error;
      }
    },

    async createVoucherProduct(productData) {
      try {
        const {
          name, description, price, original_price, category, type = 'voucher',
          sku, is_active = true, features = [], terms_and_conditions,
          validity_period = 365, display_order = 0, image_url, thumbnail_url, metadata = {}
        } = productData;

        const result = await pool.query(`
          INSERT INTO voucher_products (
            name, description, price, original_price, category, type, sku,
            is_active, features, terms_and_conditions, validity_period,
            display_order, image_url, thumbnail_url, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING *
        `, [
          name, description, price, original_price, category, type, sku,
          is_active, JSON.stringify(features), terms_and_conditions, validity_period,
          display_order, image_url, thumbnail_url, JSON.stringify(metadata)
        ]);

        return result.rows[0];
      } catch (error) {
        console.error('❌ Error creating voucher product:', error.message);
        throw error;
      }
    },

    async updateVoucherProduct(id, productData) {
      try {
        const {
          name, description, price, original_price, category, type,
          sku, is_active, features, terms_and_conditions,
          validity_period, display_order, image_url, thumbnail_url, metadata
        } = productData;

        const result = await pool.query(`
          UPDATE voucher_products SET
            name = COALESCE($2, name),
            description = COALESCE($3, description),
            price = COALESCE($4, price),
            original_price = COALESCE($5, original_price),
            category = COALESCE($6, category),
            type = COALESCE($7, type),
            sku = COALESCE($8, sku),
            is_active = COALESCE($9, is_active),
            features = COALESCE($10, features),
            terms_and_conditions = COALESCE($11, terms_and_conditions),
            validity_period = COALESCE($12, validity_period),
            display_order = COALESCE($13, display_order),
            image_url = COALESCE($14, image_url),
            thumbnail_url = COALESCE($15, thumbnail_url),
            metadata = COALESCE($16, metadata),
            updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `, [
          id, name, description, price, original_price, category, type, sku,
          is_active, features ? JSON.stringify(features) : null, terms_and_conditions,
          validity_period, display_order, image_url, thumbnail_url,
          metadata ? JSON.stringify(metadata) : null
        ]);

        return result.rows[0];
      } catch (error) {
        console.error('❌ Error updating voucher product:', error.message);
        throw error;
      }
    },

    async deleteVoucherProduct(id) {
      try {
        const result = await pool.query('DELETE FROM voucher_products WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
      } catch (error) {
        console.error('❌ Error deleting voucher product:', error.message);
        throw error;
      }
    },

    // ==================== EMAIL SETTINGS ====================
    async saveEmailSettings(settings) {
      try {
        // Create email_settings table if it doesn't exist
        await pool.query(`
          CREATE TABLE IF NOT EXISTS email_settings (
            id SERIAL PRIMARY KEY,
            smtp_host VARCHAR(255),
            smtp_port INTEGER DEFAULT 587,
            smtp_user VARCHAR(255),
            smtp_pass VARCHAR(255),
            from_email VARCHAR(255),
            from_name VARCHAR(255),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);

        // Check if settings exist
        const existingResult = await pool.query('SELECT id FROM email_settings LIMIT 1');
        
        if (existingResult.rows.length > 0) {
          // Update existing settings
          const result = await pool.query(`
            UPDATE email_settings 
            SET smtp_host = $1, smtp_port = $2, smtp_user = $3, smtp_pass = $4, 
                from_email = $5, from_name = $6, updated_at = NOW()
            WHERE id = $7
            RETURNING *
          `, [
            settings.smtp_host, settings.smtp_port, settings.smtp_user, 
            settings.smtp_pass, settings.from_email, settings.from_name,
            existingResult.rows[0].id
          ]);
          return result.rows[0];
        } else {
          // Insert new settings
          const result = await pool.query(`
            INSERT INTO email_settings (smtp_host, smtp_port, smtp_user, smtp_pass, from_email, from_name)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `, [
            settings.smtp_host, settings.smtp_port, settings.smtp_user, 
            settings.smtp_pass, settings.from_email, settings.from_name
          ]);
          return result.rows[0];
        }
      } catch (error) {
        console.error('❌ Error saving email settings:', error.message);
        throw error;
      }
    },

    async getEmailSettings() {
      try {
        const result = await pool.query('SELECT * FROM email_settings ORDER BY updated_at DESC LIMIT 1');
        
        if (result.rows.length > 0) {
          return result.rows[0];
        } else {
          // Return default EasyName settings if no custom settings exist
          return {
            smtp_host: 'smtp.easyname.com',
            smtp_port: 587,
            smtp_user: '30840mail10',
            smtp_pass: process.env.EMAIL_PASSWORD || 'HoveBN41!',
            from_email: 'hallo@newagefotografie.com',
            from_name: 'New Age Fotografie'
          };
        }
      } catch (error) {
        console.error('❌ Error getting email settings:', error.message);
        // Return default settings on error
        return {
          smtp_host: 'smtp.easyname.com',
          smtp_port: 587,
          smtp_user: '30840mail10',
          smtp_pass: process.env.EMAIL_PASSWORD || 'HoveBN41!',
          from_email: 'hallo@newagefotografie.com',
          from_name: 'New Age Fotografie'
        };
      }
    }
  };
}
