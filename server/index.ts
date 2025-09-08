// Console silencing temporarily disabled for debugging
// import '../silence-console.js';

import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import "./jobs";

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

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Session middleware must be before auth routes
app.use(sessionConfig);

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
    
    const server = await registerRoutes(app);

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
        
        // SPA fallback for production
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
      } else {
        console.warn('⚠️ No dist folder found, falling back to development mode');
        await setupVite(app, server);
      }
    } else {
      // Development or local production
      await setupVite(app, server);
    }

    // Heroku provides the PORT, use it exactly as provided
  const port = parseInt(process.env.PORT || '10000', 10);
  // Prefer explicit localhost for local dev to avoid IPv6/0.0.0.0 reachability issues
  const host = process.env.HOST || '127.0.0.1';

    server.listen(port, host, () => {
      console.log(`✅ New Age Fotografie CRM successfully started on ${host}:${port}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Working directory: ${process.cwd()}`);
      console.log(`Demo mode: ${process.env.DEMO_MODE}`);
      console.log(`Database URL configured: ${!!process.env.DATABASE_URL}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
})();