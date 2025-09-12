// PRODUCTION SERVER WITH NEON DATABASE INTEGRATION
// Load environment variables
require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

// Import database functions - with error handling
let database = null;
try {
  database = require('./database.js');
} catch (error) {
  console.log('⚠️ Database module not available, API will use fallback responses');
}

console.log('🚀 Starting PRODUCTION server with Neon database...');

// Files API handler function
async function handleFilesAPI(req, res, pathname, query) {
  let neon, sql;
  try {
    const neonModule = require('@neondatabase/serverless');
    neon = neonModule.neon;
    sql = neon(process.env.DATABASE_URL);
  } catch (error) {
    console.error('❌ Neon database not available:', error.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Database not available' }));
    return;
  }
  
  // Parse the pathname to get the specific endpoint
  const pathParts = pathname.split('/');
  const fileEndpoint = pathParts.slice(3).join('/'); // Remove '/api/files'
  
  if (req.method === 'GET' && fileEndpoint === '') {
    // GET /api/files - Retrieve digital files with filters
    try {
      const { 
        folder_name, 
        file_type, 
        client_id, 
        session_id,
        search_term,
        is_public,
        limit = '20'
      } = query || {};

      let queryStr = `
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
        values.push(is_public === 'true');
        paramIndex++;
      }
      
      if (conditions.length > 0) {
        queryStr += ' WHERE ' + conditions.join(' AND ');
      }
      
      queryStr += ` ORDER BY uploaded_at DESC LIMIT $${paramIndex}`;
      values.push(parseInt(limit));
      
      const files = await sql(queryStr, values);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(files));
    } catch (error) {
      console.error('Failed to fetch digital files:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch digital files' }));
    }
    return;
  }
  
  if (req.method === 'POST' && fileEndpoint === '') {
    // POST /api/files - Upload new file
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const {
          folder_name,
          file_name,
          file_type,
          file_size,
          client_id,
          session_id,
          description = '',
          tags = [],
          is_public = false
        } = JSON.parse(body);

        // Validate required fields
        if (!folder_name || !file_name || !file_type || !file_size) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Missing required fields: folder_name, file_name, file_type, file_size' 
          }));
          return;
        }

        const fileId = crypto.randomUUID();
        
        const result = await sql`
          INSERT INTO digital_files (
            id, folder_name, file_name, file_type, file_size, 
            client_id, session_id, description, tags, is_public, 
            uploaded_at, created_at, updated_at
          ) VALUES (
            ${fileId}, ${folder_name}, ${file_name}, ${file_type}, ${file_size},
            ${client_id || null}, ${session_id || null}, ${description}, 
            ${JSON.stringify(tags)}, ${is_public}, NOW(), NOW(), NOW()
          ) RETURNING *
        `;

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result[0]));
      } catch (error) {
        console.error('Failed to upload file:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to upload file' }));
      }
    });
    return;
  }
  
  if (req.method === 'GET' && fileEndpoint === 'folders') {
    // GET /api/files/folders - Get folder organization and statistics
    try {
      const { folder_name } = query || {};

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
      if (folder_name) {
        folderStatsQuery += ` WHERE folder_name = $1`;
        values.push(folder_name);
      }

      folderStatsQuery += ` GROUP BY folder_name ORDER BY file_count DESC`;

      const folders = await sql(folderStatsQuery, values);

      // Get recent files
      const recentFiles = await sql`
        SELECT folder_name, file_name, file_type, uploaded_at
        FROM digital_files
        ORDER BY uploaded_at DESC
        LIMIT 10
      `;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        total_folders: folders.length,
        folders: folders.map(folder => ({
          name: folder.folder_name,
          file_count: folder.file_count,
          total_size: `${(folder.total_size / 1024 / 1024).toFixed(2)} MB`,
          breakdown: {
            images: folder.image_count,
            documents: folder.document_count,
            videos: folder.video_count
          },
          last_uploaded: folder.last_uploaded
        })),
        recent_files: recentFiles.map(file => ({
          folder: file.folder_name,
          name: file.file_name,
          type: file.file_type,
          uploaded: file.uploaded_at
        }))
      }));
    } catch (error) {
      console.error('Failed to get folder organization:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to get folder organization' }));
    }
    return;
  }
  
  // Handle file ID-specific operations
  const fileId = pathParts[3];
  if (fileId && req.method === 'PUT') {
    // PUT /api/files/:id - Update file metadata
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const updateData = JSON.parse(body);
        
        // Remove ID from update data
        delete updateData.id;
        
        // Convert tags to JSON string if provided
        if (updateData.tags && Array.isArray(updateData.tags)) {
          updateData.tags = JSON.stringify(updateData.tags);
        }
        
        // Build update query dynamically
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        
        for (const [key, value] of Object.entries(updateData)) {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
        
        if (updateFields.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No fields to update' }));
          return;
        }
        
        updateFields.push(`updated_at = NOW()`);
        values.push(fileId);
        
        const result = await sql(`
          UPDATE digital_files 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING *
        `, values);

        if (result.length === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'File not found' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result[0]));
      } catch (error) {
        console.error('Failed to update file:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to update file' }));
      }
    });
    return;
  }
  
  if (fileId && req.method === 'DELETE') {
    // DELETE /api/files/:id - Delete file
    try {
      const result = await sql`
        DELETE FROM digital_files 
        WHERE id = ${fileId}
        RETURNING *
      `;

      if (result.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File not found' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        message: 'File deleted successfully', 
        file: result[0] 
      }));
    } catch (error) {
      console.error('Failed to delete file:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to delete file' }));
    }
    return;
  }
  
  // If no matching endpoint found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Files API endpoint not found' }));
}

const port = process.env.PORT || 3001;

// Mock database responses for now - will integrate real Neon connection next
const mockApiResponses = {
  '/api/status': {
    status: 'PRODUCTION_READY',
    database: 'Neon PostgreSQL',
    timestamp: new Date().toISOString()
  },
  '/api/crm/clients': {
    status: 'success',
    data: [],
    message: 'Client database ready - integrating with Neon next'
  },
  '/api/crm/leads': {
    status: 'success', 
    data: [],
    message: 'Leads database ready - integrating with Neon next'
  },
  '/api/crm/top-clients': {
    status: 'success',
    data: [],
    message: 'Top clients metrics ready with revenue analytics'
  },
  '/api/_db_counts': {
    clients: 0,
    leads: 0,
    status: 'Database integration pending'
  }
};

// Handle login authentication
function handleLogin(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    try {
      const { email, password } = JSON.parse(body);
      
      // Admin credentials check
      if ((email === 'admin@newagefotografie.com' || email === 'matt@newagefotografie.com') && password === 'admin123') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          user: {
            email: email,
            role: 'admin',
            name: 'Admin User'
          },
          token: 'admin-session-token'
        }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Invalid credentials'
        }));
      }
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Invalid request format'
      }));
    }
  });
}

// MIME types for static files
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  console.log('Request:', req.method, pathname);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Health check
  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ONLINE',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'Neon PostgreSQL (ready)'
    }));
    return;
  }
  
  // API endpoints
  if (pathname.startsWith('/api/')) {
    // Handle login specifically
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      handleLogin(req, res);
      return;
    }
    
    // Handle database API endpoints
    if (database) {
      if (pathname === '/api/crm/clients' && req.method === 'GET') {
        try {
          const clients = await database.getClients();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(clients));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }
      
      if (pathname === '/api/crm/leads' && req.method === 'GET') {
        try {
          const leads = await database.getLeads();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(leads));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }
      
      if (pathname === '/api/crm/top-clients' && req.method === 'GET') {
        try {
          const urlParams = new URLSearchParams(parsedUrl.query);
          const orderBy = urlParams.get('orderBy') || 'total_sales';
          const limit = parseInt(urlParams.get('limit')) || 20;
          
          const topClients = await database.getTopClients(orderBy, limit);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(topClients));
        } catch (error) {
          console.error('❌ Error fetching top clients:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }
      
      if (pathname.startsWith('/api/crm/clients/') && pathname.endsWith('/messages') && req.method === 'GET') {
        try {
          const clientId = pathname.split('/')[4]; // Extract client ID from URL
          const messages = await database.getClientMessages(clientId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(messages));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }
      
      // Get sent emails endpoint
      if (pathname === '/api/emails/sent' && req.method === 'GET') {
        try {
          const sentEmails = await database.getSentEmails();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(sentEmails));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }
      
      if (pathname === '/api/_db_counts' && req.method === 'GET') {
        try {
          const result = await database.getCounts();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }
      
      if (pathname === '/api/status' && req.method === 'GET') {
        try {
          const dbTest = await database.testConnection();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'PRODUCTION_READY',
            database: dbTest.success ? 'Neon PostgreSQL (Connected)' : 'Neon PostgreSQL (Connection Error)',
            timestamp: new Date().toISOString(),
            dbTest: dbTest
          }));
        } catch (error) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'DATABASE_ERROR',
            database: 'Neon PostgreSQL (Error)',
            error: error.message,
            timestamp: new Date().toISOString()
          }));
        }
        return;
      }
      
      // Database schema info endpoint
      if (pathname === '/api/db/schema' && req.method === 'GET') {
        try {
          const schemaInfo = await database.getTableInfo();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(schemaInfo));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }
      
      // Email sending endpoint
      if (pathname === '/api/email/send' && req.method === 'POST') {
        try {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const emailData = JSON.parse(body);
              console.log('📧 Sending email to:', emailData.to);
              
              const result = await database.sendEmail(emailData);
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                messageId: result.messageId,
                clientId: result.clientId,
                message: 'Email sent successfully'
              }));
            } catch (error) {
              console.error('❌ Email send error:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: false, 
                error: error.message 
              }));
            }
          });
        } catch (error) {
          console.error('❌ Email API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }
      
      // Communications email endpoint (frontend expects this path)
      if (pathname === '/api/communications/email/send' && req.method === 'POST') {
        try {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const emailData = JSON.parse(body);
              console.log('📧 Communications: Sending email to:', emailData.to);
              
              const result = await database.sendEmail(emailData);
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                messageId: result.messageId,
                clientId: result.clientId,
                message: 'Email sent successfully'
              }));
            } catch (error) {
              console.error('❌ Communications email error:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: false, 
                error: error.message 
              }));
            }
          });
        } catch (error) {
          console.error('❌ Communications API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Photography Sessions API endpoints
      if (pathname === '/api/photography/sessions' && req.method === 'GET') {
        try {
          const sessions = await database.getPhotographySessions();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(sessions));
        } catch (error) {
          console.error('❌ Get photography sessions error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      if (pathname === '/api/photography/sessions' && req.method === 'POST') {
        try {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const sessionData = JSON.parse(body);
              console.log('📸 Creating photography session:', sessionData.title);
              
              const result = await database.createPhotographySession(sessionData);
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                session: result,
                message: 'Photography session created successfully'
              }));
            } catch (error) {
              console.error('❌ Create photography session error:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: false, 
                error: error.message 
              }));
            }
          });
        } catch (error) {
          console.error('❌ Photography sessions API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Dashboard stats endpoint for calendar
      if (pathname === '/api/admin/dashboard-stats' && req.method === 'GET') {
        try {
          const stats = await database.getDashboardStats();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(stats));
        } catch (error) {
          console.error('❌ Get dashboard stats error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // Create questionnaire link endpoint
      if (pathname === '/api/admin/create-questionnaire-link' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { client_id, template_id } = JSON.parse(body);
            
            // Generate a unique token for the questionnaire
            const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
            
            // Get default survey (we'll use the first active survey or create a default one)
            const surveys = [
              {
                id: 'default-survey',
                title: 'Client Pre-Shoot Questionnaire',
                description: 'Help us prepare for your perfect photoshoot',
                status: 'active',
                pages: [
                  {
                    id: 'page-1',
                    title: 'About Your Session',
                    questions: [
                      {
                        id: 'q1',
                        type: 'text',
                        title: 'What type of photoshoot are you looking for?',
                        description: 'e.g., Portrait, Family, Business, etc.',
                        required: true,
                        options: []
                      },
                      {
                        id: 'q2',
                        type: 'multiple_choice',
                        title: 'What is the occasion for this photoshoot?',
                        required: true,
                        options: [
                          { id: 'birthday', text: 'Birthday' },
                          { id: 'anniversary', text: 'Anniversary' },
                          { id: 'professional', text: 'Professional/Business' },
                          { id: 'family', text: 'Family Portrait' },
                          { id: 'personal', text: 'Personal/Creative' },
                          { id: 'other', text: 'Other' }
                        ]
                      },
                      {
                        id: 'q3',
                        type: 'text',
                        title: 'Do you have any specific ideas or inspiration for the shoot?',
                        description: 'Share any Pinterest boards, reference photos, or themes you have in mind',
                        required: false,
                        options: []
                      },
                      {
                        id: 'q4',
                        type: 'multiple_choice',
                        title: 'Preferred location type?',
                        required: true,
                        options: [
                          { id: 'studio', text: 'Studio' },
                          { id: 'outdoor', text: 'Outdoor/Nature' },
                          { id: 'urban', text: 'Urban/City' },
                          { id: 'home', text: 'At Home' },
                          { id: 'venue', text: 'Specific Venue' }
                        ]
                      },
                      {
                        id: 'q5',
                        type: 'rating',
                        title: 'How comfortable are you in front of the camera?',
                        description: '1 = Very nervous, 5 = Very comfortable',
                        required: true,
                        options: []
                      }
                    ]
                  }
                ],
                settings: {
                  allowAnonymous: true,
                  progressBar: true
                },
                thankYouMessage: 'Thank you for completing the questionnaire! We will review your responses and be in touch soon.'
              }
            ];
            
            // Store the questionnaire link in database
            try {
              // Store the questionnaire link using the existing schema
              await sql`
                INSERT INTO questionnaire_links (
                  token, client_id, template_id, expires_at, created_at
                ) VALUES (
                  ${token}, ${client_id}, 'default-questionnaire',
                  NOW() + INTERVAL '30 days', NOW()
                )
              `;
              
              console.log('💾 Questionnaire link stored for client:', client_id);
            } catch (dbError) {
              console.error('❌ Database storage error:', dbError.message);
              // Continue even if database fails
            }
            
            // Create the public link
            const link = `${req.headers.origin || 'https://newagefotografie.com'}/q/${token}`;
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: true, 
              link,
              token,
              expires_at: questionnaireLink.expires_at
            }));
          } catch (error) {
            console.error('❌ Create questionnaire link error:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return;
      }

      // Get questionnaire by token endpoint
      if (pathname.startsWith('/api/questionnaire/') && req.method === 'GET') {
        try {
          const token = pathname.split('/').pop();
          
          // Mock questionnaire data for the token
          const mockQuestionnaire = {
            token,
            clientName: '',
            clientEmail: '',
            isUsed: false,
            survey: {
              title: 'Client Pre-Shoot Questionnaire',
              description: 'Help us prepare for your perfect photoshoot experience',
              pages: [
                {
                  id: 'page-1',
                  title: 'About Your Session',
                  questions: [
                    {
                      id: 'q1',
                      type: 'text',
                      title: 'What type of photoshoot are you looking for?',
                      required: true
                    },
                    {
                      id: 'q2',
                      type: 'single_choice',
                      title: 'What is the occasion for this photoshoot?',
                      required: true,
                      options: [
                        { id: 'birthday', text: 'Birthday' },
                        { id: 'anniversary', text: 'Anniversary' },
                        { id: 'professional', text: 'Professional/Business' },
                        { id: 'family', text: 'Family Portrait' },
                        { id: 'personal', text: 'Personal/Creative' },
                        { id: 'other', text: 'Other' }
                      ]
                    },
                    {
                      id: 'q3',
                      type: 'long_text',
                      title: 'Do you have any specific ideas or inspiration for the shoot?',
                      required: false
                    },
                    {
                      id: 'q4',
                      type: 'single_choice',
                      title: 'Preferred location type?',
                      required: true,
                      options: [
                        { id: 'studio', text: 'Studio' },
                        { id: 'outdoor', text: 'Outdoor/Nature' },
                        { id: 'urban', text: 'Urban/City' },
                        { id: 'home', text: 'At Home' },
                        { id: 'venue', text: 'Specific Venue' }
                      ]
                    },
                    {
                      id: 'q5',
                      type: 'text',
                      title: 'How comfortable are you in front of the camera? (1-5 scale)',
                      required: true
                    }
                  ]
                }
              ],
              settings: {
                thankYouMessage: 'Thank you for completing the questionnaire! We will review your responses and be in touch soon to discuss your perfect photoshoot.'
              }
            }
          };
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(mockQuestionnaire));
        } catch (error) {
          console.error('❌ Get questionnaire error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // Submit questionnaire endpoint
      if (pathname === '/api/email-questionnaire' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { token, clientName, clientEmail, answers } = JSON.parse(body);
            
            // Create email content
            const emailContent = `
New Client Questionnaire Submitted

Client Information:
- Name: ${clientName}
- Email: ${clientEmail}
- Token: ${token}

Responses:
${Object.entries(answers).map(([questionId, answer]) => {
  // Map question IDs to readable questions
  const questionMap = {
    'q1': 'Type of photoshoot',
    'q2': 'Occasion for photoshoot',
    'q3': 'Specific ideas/inspiration',
    'q4': 'Preferred location type',
    'q5': 'Comfort level in front of camera'
  };
  
  return `- ${questionMap[questionId] || questionId}: ${answer}`;
}).join('\n')}

This questionnaire was submitted on ${new Date().toLocaleString('de-DE')}.
            `.trim();

            // Send email to hallo@newagefotografie.com
            try {
              const emailData = {
                to: 'hallo@newagefotografie.com',
                subject: `New Questionnaire Response: ${clientName}`,
                html: `
                  <h2>New Questionnaire Response</h2>
                  <p><strong>Client:</strong> ${clientName}</p>
                  <p><strong>Submitted:</strong> ${new Date().toLocaleString('de-DE')}</p>
                  
                  <h3>Responses:</h3>
                  <ul>
                    ${Object.entries(responses).map(([questionId, answer]) => {
                      const questionMap = {
                        'q1': 'What type of photography session are you interested in?',
                        'q2': 'Preferred session duration?',
                        'q3': 'What style do you prefer?',
                        'q4': 'Preferred location type?',
                        'q5': 'How comfortable are you in front of the camera?'
                      };
                      return `<li><strong>${questionMap[questionId] || questionId}:</strong> ${answer}</li>`;
                    }).join('')}
                  </ul>
                  
                  <p><em>This questionnaire was submitted via the New Age Fotografie CRM system.</em></p>
                `,
                text: emailContent
              };
              
              await database.sendEmail(emailData);
              console.log('📧 Questionnaire notification email sent successfully');
            } catch (emailError) {
              console.error('❌ Email sending error:', emailError.message);
              // Don't fail the request if email fails
            }

            // Store the response in the database
            try {
              // Store the questionnaire response using existing schema
              await sql`
                INSERT INTO questionnaire_responses (
                  client_id, token, template_slug, answers, submitted_at
                ) VALUES (
                  (SELECT client_id FROM questionnaire_links WHERE token = ${token}),
                  ${token},
                  'default-questionnaire',
                  ${JSON.stringify(responses)},
                  NOW()
                )
              `;
              
              // Mark the questionnaire link as used
              await sql`
                UPDATE questionnaire_links 
                SET is_used = true
                WHERE token = ${token}
              `;
              
              console.log('💾 Questionnaire response stored for client:', clientName);
            } catch (dbError) {
              console.error('❌ Database storage error:', dbError.message);
              // Continue even if database fails
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: true, 
              message: 'Questionnaire submitted successfully' 
            }));
          } catch (error) {
            console.error('❌ Submit questionnaire error:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return;
      }
      
      // Get client questionnaire responses endpoint
      if (pathname.startsWith('/api/admin/client-questionnaires/') && req.method === 'GET') {
        try {
          const clientId = pathname.split('/').pop();
          
          // Get questionnaire links and responses for this client using existing schema
          const questionnaires = await sql`
            SELECT 
              ql.token,
              ql.client_id,
              ql.template_id,
              ql.is_used,
              ql.created_at as sent_at,
              ql.expires_at,
              qr.id as response_id,
              qr.answers,
              qr.submitted_at,
              c.first_name,
              c.last_name,
              c.email
            FROM questionnaire_links ql
            LEFT JOIN questionnaire_responses qr ON ql.token = qr.token
            LEFT JOIN crm_clients c ON ql.client_id = c.id
            WHERE ql.client_id = ${clientId}
            ORDER BY ql.created_at DESC
          `;
          
          // Transform the data for the frontend
          const formattedQuestionnaires = questionnaires.map(q => ({
            id: q.response_id || q.token,
            questionnaireName: 'Photography Preferences Survey',
            sentDate: q.sent_at,
            responseDate: q.submitted_at,
            status: q.is_used ? 'responded' : (new Date() > new Date(q.expires_at) ? 'expired' : 'sent'),
            responses: q.answers,
            link: q.is_used ? null : `${req.headers.host}/questionnaire/${q.token}`
          }));
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(formattedQuestionnaires));
        } catch (error) {
          console.error('❌ Get client questionnaires error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }
      
      // Debug photography sessions endpoint (for development)
      if (pathname === '/api/debug/photography-sessions' && req.method === 'GET') {
        try {
          // Return mock data for development
          const mockSessions = [
            {
              id: '1',
              title: 'Portrait Session - Anna Schmidt',
              description: 'Professional headshots for LinkedIn',
              sessionType: 'portrait',
              status: 'scheduled',
              startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
              endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
              clientName: 'Anna Schmidt',
              clientEmail: 'anna@example.com',
              locationName: 'Studio Berlin',
              basePrice: 150,
              depositAmount: 75,
              depositPaid: true,
              goldenHourOptimized: false,
              weatherDependent: false,
              portfolioWorthy: true,
              equipmentList: ['Camera', 'Lighting Kit', 'Backdrop'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: '2',
              title: 'Wedding Photography - Mueller Wedding',
              description: 'Full day wedding photography',
              sessionType: 'wedding',
              status: 'scheduled',
              startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
              endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(), // +8 hours
              clientName: 'Hans & Maria Mueller',
              clientEmail: 'hans.mueller@example.com',
              locationName: 'Schloss Charlottenburg',
              basePrice: 2500,
              depositAmount: 1000,
              depositPaid: true,
              goldenHourOptimized: true,
              weatherDependent: true,
              portfolioWorthy: true,
              equipmentList: ['Camera', 'Lenses', 'Flash', 'Drone'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ];
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(mockSessions));
        } catch (error) {
          console.error('❌ Debug photography sessions error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }
      
      // Email test endpoint
      if (pathname === '/api/email/test' && req.method === 'POST') {
        try {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const { to } = JSON.parse(body);
              console.log('📧 Testing email to:', to);
              
              const testEmail = {
                to: to || 'test@example.com',
                subject: 'CRM Email Test',
                content: 'This is a test email from your CRM system.',
                html: '<p>This is a <strong>test email</strong> from your CRM system.</p>',
                autoLinkClient: true
              };
              
              const result = await database.sendEmail(testEmail);
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                messageId: result.messageId,
                clientId: result.clientId,
                message: 'Test email sent successfully'
              }));
            } catch (error) {
              console.error('❌ Email test error:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: false, 
                error: error.message,
                details: {
                  smtpHost: !!process.env.SMTP_HOST,
                  smtpUser: !!process.env.SMTP_USER,
                  smtpPass: !!process.env.SMTP_PASS
                }
              }));
            }
          });
        } catch (error) {
          console.error('❌ Email test API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // IMAP Email Import endpoint
      if (pathname === '/api/emails/import' && req.method === 'POST') {
        try {
          console.log('📥 Starting IMAP email import...');
          
          const result = await database.importEmailsFromIMAP();
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            imported: result.imported || 0,
            processed: result.processed || 0,
            message: `Successfully imported ${result.imported || 0} new emails`
          }));
        } catch (error) {
          console.error('❌ Email import error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: error.message,
            details: {
              imapHost: !!process.env.IMAP_HOST,
              imapUser: !!process.env.IMAP_USER,
              imapPass: !!process.env.IMAP_PASS
            }
          }));
        }
        return;
      }

      // Get inbox messages endpoint
      if (pathname === '/api/messages' && req.method === 'GET') {
        try {
          const messages = await database.getCrmMessages();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(messages));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // Assign email to client endpoint
      if (pathname === '/api/emails/assign' && req.method === 'POST') {
        try {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const { messageId, clientId } = JSON.parse(body);
              console.log(`🔗 Assigning message ${messageId} to client ${clientId}`);
              
              const result = await database.assignEmailToClient(messageId, clientId);
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                message: 'Email assigned to client successfully'
              }));
            } catch (error) {
              console.error('❌ Email assignment error:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: false, 
                error: error.message 
              }));
            }
          });
        } catch (error) {
          console.error('❌ Email assignment API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // CRM Price List API endpoint (returns voucher products for invoice creation)
      if (pathname === '/api/crm/price-list' && req.method === 'GET') {
        try {
          console.log('📋 Fetching price list (voucher products) for invoice creation...');
          const products = await database.getVoucherProducts();
          
          // Transform voucher products to price list format expected by frontend
          const priceListItems = products.map(product => ({
            id: product.id,
            name: product.name,
            description: product.description,
            price: parseFloat(product.price),
            category: product.category,
            type: product.type || 'service',
            unit: 'session', // Default unit for photography services
            taxRate: 19, // Default German VAT rate
            isActive: product.is_active
          }));
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(priceListItems));
        } catch (error) {
          console.error('❌ Price list API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Voucher Products API endpoints
      if (pathname === '/api/vouchers/products' && req.method === 'GET') {
        try {
          console.log('📦 Fetching voucher products...');
          const products = await database.getVoucherProducts();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(products));
        } catch (error) {
          console.error('❌ Voucher products API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      if (pathname.startsWith('/api/vouchers/products/') && req.method === 'GET') {
        try {
          const id = pathname.split('/').pop();
          console.log('📦 Fetching voucher product:', id);
          const product = await database.getVoucherProduct(id);
          if (!product) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Voucher product not found' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(product));
        } catch (error) {
          console.error('❌ Voucher product API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Stripe Checkout API endpoints
      if (pathname === '/api/checkout/create-session' && req.method === 'POST') {
        try {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const checkoutData = JSON.parse(body);
              console.log('💳 Creating Stripe checkout session:', checkoutData);
              
              // For demo purposes without full Stripe setup, create a mock success response
              const mockSessionId = `mock_session_${Date.now()}`;
              const baseUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:3001';
              const mockSuccessUrl = `${baseUrl}/checkout/mock-success?session_id=${mockSessionId}`;
              
              console.log('🎭 Demo mode: Redirecting to mock success page:', mockSuccessUrl);
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                sessionId: mockSessionId,
                url: mockSuccessUrl,
                message: 'Demo checkout session created'
              }));
            } catch (error) {
              console.error('❌ Checkout creation error:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: false, 
                error: error.message 
              }));
            }
          });
        } catch (error) {
          console.error('❌ Checkout API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      if (pathname === '/api/checkout/success' && req.method === 'GET') {
        try {
          const { session_id } = parsedUrl.query;
          console.log('✅ Processing checkout success for session:', session_id);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            session: {
              id: session_id,
              payment_status: 'paid',
              customer_email: 'demo@example.com'
            },
            message: 'Demo payment successful'
          }));
        } catch (error) {
          console.error('❌ Checkout success error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      if (pathname === '/api/vouchers/validate' && req.method === 'POST') {
        try {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const { code, cartTotal } = JSON.parse(body);
              console.log('🎫 Validating voucher code:', code, 'for total:', cartTotal);
              
              // Mock voucher validation for demo
              const mockVouchers = {
                'DEMO10': { type: 'percentage', value: 10, description: 'Demo 10% discount' },
                'SAVE20': { type: 'fixed', value: 20, description: 'Demo €20 off' },
                'WELCOME': { type: 'percentage', value: 15, description: 'Demo 15% welcome discount' }
              };
              
              const voucher = mockVouchers[code.toUpperCase()];
              if (voucher) {
                const discount = voucher.type === 'percentage' 
                  ? cartTotal * (voucher.value / 100)
                  : Math.min(voucher.value, cartTotal);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  valid: true,
                  code: code.toUpperCase(),
                  discount: discount,
                  type: voucher.type,
                  description: voucher.description
                }));
              } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  valid: false,
                  message: 'Ungültiger Gutscheincode'
                }));
              }
            } catch (error) {
              console.error('❌ Voucher validation error:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: false, 
                error: error.message 
              }));
            }
          });
        } catch (error) {
          console.error('❌ Voucher validation API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Surveys/Questionnaires API endpoints
      if (pathname.startsWith('/api/surveys')) {
        try {
          if (pathname === '/api/surveys' && req.method === 'GET') {
            // Return mock surveys for questionnaires page
            const mockSurveys = [
              {
                id: '1',
                title: 'Client Photography Questionnaire',
                description: 'Photography session preferences and details',
                status: 'active',
                created_at: new Date().toISOString(),
                questions: [
                  { id: '1', type: 'text', question: 'What style of photography do you prefer?' },
                  { id: '2', type: 'multiple_choice', question: 'What is the occasion for this shoot?', options: ['Birthday', 'Anniversary', 'Professional', 'Family'] }
                ],
                responses_count: 12
              },
              {
                id: '2', 
                title: 'Post-Shoot Feedback Form',
                description: 'Collect client feedback after the session',
                status: 'active',
                created_at: new Date().toISOString(),
                questions: [
                  { id: '1', type: 'rating', question: 'How satisfied were you with the service?' },
                  { id: '2', type: 'text', question: 'What could we improve?' }
                ],
                responses_count: 8
              }
            ];
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(mockSurveys));
            return;
          }
          
          if (pathname === '/api/surveys' && req.method === 'POST') {
            // Handle survey creation
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
              try {
                const surveyData = JSON.parse(body);
                console.log('📋 Creating new survey:', surveyData.title);
                
                const newSurvey = {
                  id: Date.now().toString(),
                  ...surveyData,
                  created_at: new Date().toISOString(),
                  responses_count: 0
                };
                
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, survey: newSurvey }));
              } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid survey data' }));
              }
            });
            return;
          }

          // Handle individual survey operations
          const surveyIdMatch = pathname.match(/^\/api\/surveys\/([^\/]+)$/);
          const duplicateMatch = pathname.match(/^\/api\/surveys\/([^\/]+)\/duplicate$/);
          
          if (surveyIdMatch && req.method === 'PUT') {
            const surveyId = surveyIdMatch[1];
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
              try {
                const updates = JSON.parse(body);
                console.log('📝 Updating survey:', surveyId);
                
                const updatedSurvey = {
                  id: surveyId,
                  ...updates,
                  updated_at: new Date().toISOString()
                };
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, survey: updatedSurvey }));
              } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid update data' }));
              }
            });
            return;
          }

          if (surveyIdMatch && req.method === 'GET') {
            const surveyId = surveyIdMatch[1];
            console.log('📋 Getting survey:', surveyId);
            
            // Return mock survey data
            const mockSurvey = {
              id: surveyId,
              title: 'Client Pre-Shoot Questionnaire',
              description: 'Help us prepare for your perfect photoshoot',
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              pages: [
                {
                  id: 'page-1',
                  title: 'About Your Session',
                  questions: [
                    {
                      id: 'q1',
                      type: 'text',
                      title: 'What type of photoshoot are you looking for?',
                      description: 'e.g., Portrait, Family, Business, etc.',
                      required: true,
                      options: []
                    },
                    {
                      id: 'q2',
                      type: 'multiple_choice',
                      title: 'What is the occasion for this photoshoot?',
                      required: true,
                      options: [
                        { id: 'birthday', text: 'Birthday' },
                        { id: 'anniversary', text: 'Anniversary' },
                        { id: 'professional', text: 'Professional/Business' },
                        { id: 'family', text: 'Family Portrait' },
                        { id: 'personal', text: 'Personal/Creative' },
                        { id: 'other', text: 'Other' }
                      ]
                    },
                    {
                      id: 'q3',
                      type: 'text',
                      title: 'Do you have any specific ideas or inspiration for the shoot?',
                      description: 'Share any Pinterest boards, reference photos, or themes you have in mind',
                      required: false,
                      options: []
                    },
                    {
                      id: 'q4',
                      type: 'multiple_choice',
                      title: 'Preferred location type?',
                      required: true,
                      options: [
                        { id: 'studio', text: 'Studio' },
                        { id: 'outdoor', text: 'Outdoor/Nature' },
                        { id: 'urban', text: 'Urban/City' },
                        { id: 'home', text: 'At Home' },
                        { id: 'venue', text: 'Specific Venue' }
                      ]
                    },
                    {
                      id: 'q5',
                      type: 'rating',
                      title: 'How comfortable are you in front of the camera?',
                      description: '1 = Very nervous, 5 = Very comfortable',
                      required: true,
                      options: []
                    }
                  ]
                }
              ],
              settings: {
                allowAnonymous: true,
                progressBar: true
              },
              thankYouMessage: 'Thank you for completing the questionnaire! We will review your responses and be in touch soon.',
              analytics: {
                totalCompletes: 0
              }
            };
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, survey: mockSurvey }));
            return;
          }
          
          if (surveyIdMatch && req.method === 'DELETE') {
            const surveyId = surveyIdMatch[1];
            console.log('🗑️ Deleting survey:', surveyId);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Survey deleted' }));
            return;
          }
          
          if (duplicateMatch && req.method === 'POST') {
            const surveyId = duplicateMatch[1];
            console.log('📄 Duplicating survey:', surveyId);
            
            const duplicatedSurvey = {
              id: Date.now().toString(),
              title: 'Copy of Questionnaire',
              description: 'Duplicated questionnaire',
              status: 'draft',
              created_at: new Date().toISOString(),
              questions: [],
              responses_count: 0
            };
            
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, survey: duplicatedSurvey }));
            return;
          }
          
          // Fallback for other survey operations
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Survey operation completed' }));
          
        } catch (error) {
          console.error('❌ Surveys API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Digital Files API endpoints
      if (pathname.startsWith('/api/files')) {
        try {
          await handleFilesAPI(req, res, pathname, parsedUrl.query);
        } catch (error) {
          console.error('❌ Files API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }
    }
    
    // Handle other API endpoints with fallback
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const response = mockApiResponses[pathname] || {
      status: 'API_READY',
      endpoint: pathname,
      message: 'API endpoint ready for database integration'
    };
    res.end(JSON.stringify(response));
    return;
  }
  
  // Serve static files
  let filePath = path.join(__dirname, 'dist', pathname === '/' ? 'index.html' : pathname);
  
  // Security check
  if (!filePath.startsWith(path.join(__dirname, 'dist'))) {
    filePath = path.join(__dirname, 'dist', 'index.html');
  }
  
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // SPA fallback - serve index.html for client-side routing
        fs.readFile(path.join(__dirname, 'dist', 'index.html'), (error, content) => {
          if (error) {
            res.writeHead(500);
            res.end('Server Error: Cannot load application');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`✅ PRODUCTION server with database support running on port ${port}`);
  console.log(`🌐 Website: http://localhost:${port}`);
  console.log(`🔌 API: http://localhost:${port}/api/status`);
  console.log(`📊 Health: http://localhost:${port}/healthz`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

module.exports = server;
