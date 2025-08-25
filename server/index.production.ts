import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from "path";
import fs from "fs";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Trust proxy for production deployment
app.set('trust proxy', true);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Domain redirect middleware - redirect root domain to www
app.use((req, res, next) => {
  if (req.headers.host === 'newagefotografie.com') {
    return res.redirect(301, `https://www.newagefotografie.com${req.url}`);
  }
  next();
});

// API request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

// Register API routes
(async () => {
  const server = await registerRoutes(app);

  // Error handling middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    console.error('Server Error:', {
      status,
      message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    res.status(status).json({ message });
  });

  // Serve static files from dist/public (production build)
  const distPath = path.join(process.cwd(), 'dist/public');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    
    // SPA fallback - serve index.html for all non-API routes
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Frontend not built. Run npm run build first.');
      }
    });
  } else {
    // Development fallback - serve from client directory
    const clientPath = path.join(process.cwd(), 'client');
    app.use(express.static(path.join(clientPath, 'public')));
    
    app.get('*', (req, res) => {
      const indexPath = path.join(clientPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(500).send('Client files not found. Please check your setup.');
      }
    });
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  const host = '0.0.0.0';
  
  server.listen(port, host, () => {
    console.log(`✅ New Age Fotografie CRM production server started on ${host}:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`Working directory: ${process.cwd()}`);
    console.log(`Static files served from: ${fs.existsSync(distPath) ? distPath : clientPath}`);
  });
})().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});