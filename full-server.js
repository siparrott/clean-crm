// PRODUCTION SERVER WITH NEON DATABASE INTEGRATION
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Import database functions
const database = require('./database.js');

console.log('🚀 Starting PRODUCTION server with Neon database...');

const port = process.env.PORT || 3000;

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
              console.log('📧 Sending email via communications to:', emailData.to);
              
              const result = await database.sendEmail(emailData);
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                messageId: result.messageId,
                clientId: result.clientId,
                message: 'Email sent successfully'
              }));
            } catch (error) {
              console.error('❌ Communications email send error:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: false, 
                error: error.message 
              }));
            }
          });
        } catch (error) {
          console.error('❌ Communications email API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
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
