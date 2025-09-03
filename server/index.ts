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
if (!process.env.DEMO_MODE || process.env.DEMO_MODE === 'true') {
  process.env.DEMO_MODE = 'false';
  // New Age Fotografie CRM - Live Production Site (Demo Mode Disabled)
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  // Run database migration for communication tables
  try {
    console.log('🔄 Checking communication database schema...');
    
    // Add missing columns to crm_messages table
    await db.execute(sql`
      ALTER TABLE crm_messages 
      ADD COLUMN IF NOT EXISTS message_type varchar(20) DEFAULT 'email'
    `);
    
    await db.execute(sql`
      ALTER TABLE crm_messages 
      ADD COLUMN IF NOT EXISTS phone_number varchar(20)
    `);

    // Create sms_config table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sms_config (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        provider varchar(50) NOT NULL,
        account_sid varchar(255),
        auth_token varchar(255),
        from_number varchar(20),
        api_key varchar(255),
        api_secret varchar(255),
        webhook_url varchar(255),
        is_active boolean DEFAULT false,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);

    // Create message_campaigns table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS message_campaigns (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(255) NOT NULL,
        type varchar(20) NOT NULL,
        content text NOT NULL,
        target_type varchar(50) NOT NULL,
        target_criteria jsonb,
        status varchar(20) DEFAULT 'draft',
        scheduled_at timestamp,
        sent_at timestamp,
        total_recipients integer DEFAULT 0,
        successful_sends integer DEFAULT 0,
        failed_sends integer DEFAULT 0,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);

    // Insert default SMS configuration if none exists
    await db.execute(sql`
      INSERT INTO sms_config (provider, account_sid, auth_token, from_number, is_active)
      SELECT 'demo', 'demo_account', 'demo_token', '+43123456789', false
      WHERE NOT EXISTS (SELECT 1 FROM sms_config LIMIT 1)
    `);

    console.log('✅ Communication database schema updated');
  } catch (error) {
    console.log('⚠️ Database schema update failed (may already exist):', error.message);
  }

  // Initialize services
  await EnhancedEmailService.initialize();
  await SMSService.initialize();
  
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

  // Add a specific middleware to protect API routes from Vite's catch-all
  app.use('/api/*', (req, res, next) => {
    // Skip Vite handling for API routes
    next();
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes

  // For deployment, we'll use development Vite middleware since the build is too complex
  // This serves the React app properly while keeping production API endpoints
  if (app.get("env") === "development" || process.env.NODE_ENV === "production") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Dynamically find available port starting from 5000
  const findPort = async (startPort: number): Promise<number> => {
    return new Promise((resolve, reject) => {
      const testServer = server.listen(startPort, '0.0.0.0', (err?: Error) => {
        if (err) {
          // Port is busy, try next one
          testServer.close();
          if (startPort < 5010) {
            findPort(startPort + 1).then(resolve).catch(reject);
          } else {
            reject(new Error('No available ports found between 5000-5010'));
          }
        } else {
          testServer.close(() => {
            resolve(startPort);
          });
        }
      });
    });
  };

  // Coerce and validate PORT from environment. If invalid, fall back to 10000.
  let requestedPort = parseInt(process.env.PORT ?? '', 10);
  if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65535) {
    console.warn(`Invalid or missing PORT environment variable (${process.env.PORT}). Falling back to 10000.`);
    requestedPort = 10000;
  }

  const port = await findPort(requestedPort);
  const host = "0.0.0.0";

  server.listen(port, host, () => {
    log(`✅ New Age Fotografie CRM successfully started on ${host}:${port}`);
    log(`Environment: ${process.env.NODE_ENV}`);
    log(`Working directory: ${process.cwd()}`);
    log(`Demo mode: ${process.env.DEMO_MODE}`);
  });
})();