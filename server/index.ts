// Console silencing temporarily disabled for debugging
// import '../silence-console.js';

import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import "./jobs";

// Override demo mode for production New Age Fotografie site
// This is NOT a demo - it's the live business website
if (!process.env.DEMO_MODE || process.env.DEMO_MODE === 'true') {
  process.env.DEMO_MODE = 'false';
  // New Age Fotografie CRM - Live Production Site (Demo Mode Disabled)
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

  const port = await findPort(parseInt(process.env.PORT || '5000', 10));
  const host = "0.0.0.0";
  
  server.listen(port, host, () => {
    log(`✅ New Age Fotografie CRM successfully started on ${host}:${port}`);
    log(`Environment: ${process.env.NODE_ENV}`);
    log(`Working directory: ${process.cwd()}`);
    log(`Demo mode: ${process.env.DEMO_MODE}`);
  });
})();
