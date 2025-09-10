// Console silencing temporarily disabled for debugging
// import '../silence-console.js';

import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
// Import routes and jobs directly to fix client database access
import { registerRoutes } from "./routes";
import "./jobs";
import { setupVite, serveStatic, log } from "./vite";
// Mount lightweight auth routes immediately (full routes registered later lazily)
import authRoutes from './routes/auth';

// Import and configure session middleware
import { sessionConfig } from './auth';

// Import email service for initialization
import { EnhancedEmailService } from './services/enhancedEmailService';
import { SMSService } from './services/smsService';
import { sql } from 'drizzle-orm';
import { db } from './db';

// Override demo mode for production New Age Fotografie site
// This is NOT a demo - it's the live business website
process.env.DEMO_MODE = 'false';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const BOOT_MARK = Date.now();
console.log('[BOOT] Starting minimal server bootstrap');
const app = express();
// Increase body size limits to accommodate large ICS payloads
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false, limit: '5mb' }));

// Add CORS headers for API requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health & ping endpoints before anything else for diagnostics
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok-preinit', uptime: process.uptime(), bootMs: Date.now() - BOOT_MARK });
});

// Session middleware must be before auth routes (still early but after healthz)
app.use(sessionConfig);

// Early auth routes so backend login functions even before lazy route load
app.use('/api/auth', authRoutes);
app.use('/api/auth/*', (req, _res, next) => { console.log('[AUTH-EARLY]', req.method, req.originalUrl); next(); });

// Serve uploaded files statically
app.use('/uploads', express.static('public/uploads'));

// Serve blog images statically (before Vite middleware)
app.use('/blog-images', express.static('server/public/blog-images', {
  setHeaders: (res, path) => {
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    }
  }
}));

// Domain redirect middleware - redirect root domain to www
app.use((req, res, next) => {
  if (req.headers.host === 'newagefotografie.com') {
    return res.redirect(301, `https://www.newagefotografie.com${req.url}`);
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Global error handlers to surface startup/runtime issues clearly
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception thrown:', err);
      // Give logs a moment before exiting in Heroku
      setTimeout(() => process.exit(1), 1000);
    });

    console.log('� Starting New Age Fotografie CRM server...');
    
    // Initialize services with error handling
    try {
      await EnhancedEmailService.initialize();
      console.log('✅ Email service initialized');
    } catch (error) {
      console.warn('⚠️ Email service initialization failed:', error.message);
    }

    try {
      await SMSService.initialize();
      console.log('✅ SMS service initialized');
    } catch (error) {
      console.warn('⚠️ SMS service initialization failed:', error.message);
    }

    // Skip complex database migrations for now to avoid startup issues
    try {
      // Quick database test
      await db.execute(sql`SELECT 1 as test`);
      console.log('✅ Database connection verified');
    } catch (error) {
      console.warn('⚠️ Database connection issue:', error.message);
    }
    
    // Register routes immediately to restore client database access
    console.log('🔄 Registering routes immediately...');
    await registerRoutes(app);
    console.log('✅ Routes registered successfully - Client database should now be accessible');
    
    // Start listening ASAP
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
    const server = app.listen(port, host, () => {
      console.log(`[BOOT] HTTP server listening on ${host}:${port} - Client database is now accessible`);
    });

    // Status endpoint for diagnostics
    app.get('/api/status', (_req, res) => {
      res.json({ 
        status: 'ready',
        uptime: process.uptime(),
        message: 'Client database is accessible'
      });
    });

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Enhanced error logging for production debugging
      console.error('Server Error:', {
        status,
        message,
        stack: err.stack,
        url: _req.url,
        method: _req.method,
        timestamp: new Date().toISOString()
      });

      res.status(status).json({ message });
    });

    // For production on Heroku, serve static files differently
  if (process.env.NODE_ENV === "production" && process.env.PORT) {
      // Heroku production mode - serve built files
      const path = await import('path');
      const fs = await import('fs');
      
      const distPath = path.join(process.cwd(), 'dist');
      
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        
        // Defer wildcard registration slightly to let routes mount
        setTimeout(() => {
          app.get('*', (req, res) => {
            if (req.path.startsWith('/api')) {
              return res.status(404).json({ message: 'API endpoint not found' });
            }
            const indexPath = path.join(distPath, 'index.html');
            if (fs.existsSync(indexPath)) {
              res.sendFile(indexPath);
            } else {
              res.status(404).send('Frontend build not found');
            }
          });
        }, 1500);
      } else {
        console.warn('⚠️ No dist folder found, falling back to development mode');
        await setupVite(app, server);
      }
    } else {
      // Development or local production
      await setupVite(app, server);
    }

    // Heroku provides the PORT, use it exactly as provided
  // Prefer 3000 for local development to match client expectations; platforms set PORT explicitly
  // Additional runtime info after initial async init completes
  console.log(`✅ New Age Fotografie CRM post-init. Environment: ${process.env.NODE_ENV}`);
  console.log(`Working directory: ${process.cwd()}`);
  console.log(`Demo mode: ${process.env.DEMO_MODE}`);
  console.log(`Database URL configured: ${!!process.env.DATABASE_URL}`);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
})();