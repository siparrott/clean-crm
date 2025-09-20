// PRODUCTION SERVER WITH NEON DATABASE INTEGRATION
// Load environment variables
require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');

// Import database functions - with error handling
let database = null;
try {
  database = require('./database.js');
} catch (error) {
  console.log('⚠️ Database module not available, API will use fallback responses');
}

// Initialize global Neon SQL client (used across handlers)
let sql = null;
try {
  const neonModule = require('@neondatabase/serverless');
  const neon = neonModule.neon;
  if (process.env.DATABASE_URL) {
    sql = neon(process.env.DATABASE_URL);
    console.log('✅ Neon SQL client initialized');
  } else {
    console.log('⚠️ DATABASE_URL not set; SQL client not initialized');
  }
} catch (err) {
  console.warn('⚠️ Could not initialize Neon SQL client:', err.message);
  sql = null;
}

// Initialize Stripe
let stripe = null;

async function initializeStripe() {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    console.log('🔍 Checking Stripe configuration...');
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    if (stripeKey) {
      console.log(`🔑 Stripe key found: ${stripeKey.substring(0, 20)}...${stripeKey.slice(-4)}`);
      
      // Validate key format
      if (!stripeKey.startsWith('sk_live_') && !stripeKey.startsWith('sk_test_')) {
        console.error('❌ Invalid Stripe key format. Key should start with sk_live_ or sk_test_');
        console.error('💡 Check your Heroku Config Vars or local .env file');
        stripe = null;
        return;
      }
      
      const Stripe = require('stripe');
      stripe = Stripe(stripeKey, {
        apiVersion: '2023-10-16',
      });
      
      const keyType = stripeKey.startsWith('sk_live_') ? 'LIVE' : 'TEST';
      console.log(`✅ Stripe initialized with ${keyType} key`);
      
      // Test the key asynchronously
      try {
        await stripe.balance.retrieve();
        console.log('✅ Stripe key authentication verified');
        console.log(`💳 Stripe is ready for ${keyType} payments`);
      } catch (testError) {
        console.error('❌ Stripe key authentication failed:', testError.message);
        console.error('💡 Checkout will fall back to demo mode');
        console.error('🔧 Please verify your Stripe key in Heroku Config Vars');
        // Don't set stripe to null here - let it try to work anyway
      }
    } else {
      console.log('⚠️ STRIPE_SECRET_KEY not set; payments will be in demo mode');
      console.log('💡 Set STRIPE_SECRET_KEY in your Heroku Config Vars for live payments');
    }
  } catch (err) {
    console.warn('⚠️ Could not initialize Stripe:', err.message);
    stripe = null;
  }
}

// Initialize Stripe asynchronously
initializeStripe();

console.log('🚀 Starting PRODUCTION server with Neon database...');

// ===== Coupon Engine (env-driven with VCWIEN fallback) =====
const COUPON_TTL_SECONDS = parseInt(process.env.COUPON_RELOAD_SECONDS || '60', 10);
let __couponCache = { coupons: null, expiresAt: 0 };

const DEFAULT_FALLBACK_COUPONS = [
  {
    code: 'VCWIEN',
    type: 'percentage',
    percent: 50,
    allowedSkus: [
      'maternity-basic', 'family-basic', 'newborn-basic'
    ]
  }
];

function parseCouponsFromEnv() {
  const raw = process.env.COUPONS_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.coupons)) return parsed.coupons;
    return null;
  } catch (e) {
    console.warn('⚠️ Failed to parse COUPONS_JSON:', e.message);
    return null;
  }
}

function getCoupons() {
  const now = Date.now();
  if (__couponCache.coupons && now < __couponCache.expiresAt) return __couponCache.coupons;
  const fromEnv = parseCouponsFromEnv();
  const coupons = fromEnv && fromEnv.length ? fromEnv : DEFAULT_FALLBACK_COUPONS;
  __couponCache = {
    coupons,
    expiresAt: now + COUPON_TTL_SECONDS * 1000,
  };
  return coupons;
}

function forceRefreshCoupons() {
  __couponCache.expiresAt = 0;
  const coupons = getCoupons();
  return Array.isArray(coupons) ? coupons.length : 0;
}

function findCouponByCode(code) {
  if (!code) return null;
  const target = String(code).trim().toUpperCase();
  const coupons = getCoupons();
  const match = coupons.find(c => String(c.code || '').trim().toUpperCase() === target);
  if (match) return match;
  // Also search in fallback if env was present but missing this code
  const fb = DEFAULT_FALLBACK_COUPONS.find(c => String(c.code || '').trim().toUpperCase() === target);
  return fb || null;
}

function isCouponActive(coupon) {
  if (!coupon) return false;
  const now = Date.now();
  if (coupon.startDate) {
    const start = new Date(coupon.startDate).getTime();
    if (!isNaN(start) && now < start) return false;
  }
  if (coupon.endDate) {
    const end = new Date(coupon.endDate).getTime();
    if (!isNaN(end) && now > end) return false;
  }
  return true;
}

function allowsSku(coupon, skuOrSlug) {
  if (!coupon) return false;
  const sku = String(skuOrSlug || '').toLowerCase();
  const list = Array.isArray(coupon.allowedSkus) ? coupon.allowedSkus.map(s => String(s).toLowerCase()) : [];
  if (list.includes('*') || list.includes('all')) return true;
  if (!list.length) return true; // if not specified, allow all
  return list.includes(sku);
}

// ===== Utilities for questionnaire routes =====
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

function formatDeDateTime(d) {
  try {
    return new Date(d).toLocaleString('de-AT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).replace(',', '');
  } catch {
    const iso = new Date().toISOString();
    return iso.slice(0, 16).replace('T', ' ');
  }
}

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
      res.end(JSON.stringify({ error: 'Files API error' }));
      return;
}
  }

  // If no matching endpoint found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Files API endpoint not found' }));
}

// Gallery API handler function
async function handleGalleryAPI(req, res, pathname, query) {
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
  const pathParts = pathname.split('/').filter(p => p);
  const gallerySlug = pathParts[2]; // galleries/[slug]
  const action = pathParts[3]; // auth, images, download, etc.
  const imageId = pathParts[4]; // for image-specific operations

  // Parse request body for POST/PUT requests
  const getRequestBody = () => {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (error) {
          reject(error);
        }
      });
    });
  };

  // Helper function to generate gallery tokens
  const generateGalleryToken = (galleryId, email) => {
    return Buffer.from(`${galleryId}:${email}:${Date.now()}`).toString('base64');
  };

  // Helper function to verify gallery tokens
  const verifyGalleryToken = (token) => {
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const [galleryId, email, timestamp] = decoded.split(':');
      return { galleryId, email, timestamp: parseInt(timestamp) };
    } catch (error) {
      return null;
    }
  };

  try {
    // GET /api/galleries - Get all galleries
    if (req.method === 'GET' && !gallerySlug) {
      const galleries = await sql`
        SELECT id, title, slug, description, cover_image, is_public, 
               is_password_protected, client_id, created_by, sort_order, 
               created_at, updated_at
        FROM galleries
        ORDER BY created_at DESC
      `;
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(galleries));
      return;
    }

    // GET /api/galleries/[slug] - Get gallery by slug
    if (req.method === 'GET' && gallerySlug && !action) {
      const gallery = await sql`
        SELECT id, title, slug, description, cover_image, is_public, 
               is_password_protected, password, client_id, created_by, 
               sort_order, created_at, updated_at
        FROM galleries
        WHERE slug = ${gallerySlug}
      `;
      
      if (gallery.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Gallery not found' }));
        return;
      }
      
      // Don't expose password in response
      const galleryData = { ...gallery[0] };
      delete galleryData.password;
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(galleryData));
      return;
    }

    // POST /api/galleries - Create new gallery (admin only)
    if (req.method === 'POST' && !gallerySlug) {
      const body = await getRequestBody();
      const { 
        title, 
        description, 
        slug, 
        coverImage, 
        client_id, 
        is_public = true, 
        is_password_protected = false, 
        password 
      } = body;

      if (!title) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Title is required' }));
        return;
      }

      // Generate slug if not provided
      const finalSlug = slug || title.toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);

      const gallery = await sql`
        INSERT INTO galleries (title, description, slug, cover_image, client_id, 
                             is_public, is_password_protected, password, created_by)
        VALUES (${title}, ${description}, ${finalSlug}, ${coverImage}, ${client_id}, 
                ${is_public}, ${is_password_protected}, ${password}, 'admin')
        RETURNING *
      `;
      
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(gallery[0]));
      return;
    }

    // PUT /api/galleries/[id] - Update gallery (admin only)
    if (req.method === 'PUT' && gallerySlug) {
      const body = await getRequestBody();
      const { 
        title, 
        description, 
        coverImage, 
        is_public, 
        is_password_protected, 
        password 
      } = body;

      const gallery = await sql`
        UPDATE galleries 
        SET title = COALESCE(${title}, title),
            description = COALESCE(${description}, description),
            cover_image = COALESCE(${coverImage}, cover_image),
            is_public = COALESCE(${is_public}, is_public),
            is_password_protected = COALESCE(${is_password_protected}, is_password_protected),
            password = COALESCE(${password}, password),
            updated_at = NOW()
        WHERE id = ${gallerySlug}
        RETURNING *
      `;
      
      if (gallery.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Gallery not found' }));
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(gallery[0]));
      return;
    }

    // DELETE /api/galleries/[id] - Delete gallery (admin only)
    if (req.method === 'DELETE' && gallerySlug) {
      await sql`DELETE FROM galleries WHERE id = ${gallerySlug}`;
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // POST /api/galleries/[slug]/auth - Authenticate gallery access
    if (req.method === 'POST' && action === 'auth') {
      const body = await getRequestBody();
      const { email, firstName, lastName, password } = body;

      if (!email) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Email is required' }));
        return;
      }

      // Get the gallery
      const gallery = await sql`
        SELECT id, is_password_protected, password
        FROM galleries
        WHERE slug = ${gallerySlug}
      `;

      if (gallery.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Gallery not found' }));
        return;
      }

      const galleryData = gallery[0];

      // Check password if gallery is password protected
      if (galleryData.is_password_protected && galleryData.password) {
        if (!password) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Password is required' }));
          return;
        }

        if (password !== galleryData.password) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid password' }));
          return;
        }
      }

      // Log the access attempt
      await sql`
        INSERT INTO gallery_access_logs (gallery_id, visitor_email, visitor_name, accessed_at)
        VALUES (${galleryData.id}, ${email}, ${firstName ? `${firstName} ${lastName || ''}`.trim() : ''}, NOW())
      `.catch(() => {
        // Ignore error if table doesn't exist
      });

      const token = generateGalleryToken(galleryData.id, email);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ token }));
      return;
    }

    // GET /api/galleries/[slug]/images - Get gallery images (requires auth)
    if (req.method === 'GET' && action === 'images') {
      const authToken = req.headers.authorization?.replace('Bearer ', '');

      if (!authToken) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Authentication token required' }));
        return;
      }

      const tokenData = verifyGalleryToken(authToken);
      if (!tokenData) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid token' }));
        return;
      }

      // Get the gallery
      const gallery = await sql`
        SELECT id FROM galleries WHERE slug = ${gallerySlug}
      `;

      if (gallery.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Gallery not found' }));
        return;
      }

      const galleryId = gallery[0].id;

      // Get gallery images from database
      let galleryImages = await sql`
        SELECT id, gallery_id, filename, url, title, description, 
               sort_order, metadata, created_at
        FROM gallery_images
        WHERE gallery_id = ${galleryId}
        ORDER BY sort_order ASC, created_at DESC
      `;

      // If no database records found, provide sample images
      if (galleryImages.length === 0) {
        console.log('No database records found, providing sample images...');
        
        galleryImages = [
          {
            id: 'sample-1',
            gallery_id: galleryId,
            filename: 'mountain_landscape.jpg',
            url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
            title: 'Mountain Vista',
            description: 'Beautiful mountain landscape captured during golden hour',
            sort_order: 0,
            created_at: new Date().toISOString()
          },
          {
            id: 'sample-2',
            gallery_id: galleryId,
            filename: 'forest_path.jpg',
            url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
            title: 'Forest Trail',
            description: 'Peaceful forest path through autumn trees',
            sort_order: 1,
            created_at: new Date().toISOString()
          },
          {
            id: 'sample-3',
            gallery_id: galleryId,
            filename: 'lake_reflection.jpg',
            url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
            title: 'Lake Reflection',
            description: 'Perfect mirror reflection on a calm mountain lake',
            sort_order: 2,
            created_at: new Date().toISOString()
          },
          {
            id: 'sample-4',
            gallery_id: galleryId,
            filename: 'city_skyline.jpg',
            url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
            title: 'Urban Evening',
            description: 'City skyline illuminated at twilight',
            sort_order: 3,
            created_at: new Date().toISOString()
          },
          {
            id: 'sample-5',
            gallery_id: galleryId,
            filename: 'coastal_sunset.jpg',
            url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2156&q=80',
            title: 'Coastal Sunset',
            description: 'Golden hour over the ocean coastline',
            sort_order: 4,
            created_at: new Date().toISOString()
          }
        ];
      }

      // Format images for frontend
      const formattedImages = galleryImages.map(image => ({
        id: image.id,
        galleryId: image.gallery_id,
        filename: image.filename,
        originalUrl: image.url,
        displayUrl: image.url,
        thumbUrl: image.url,
        title: image.title,
        description: image.description,
        orderIndex: image.sort_order,
        createdAt: image.created_at,
        sizeBytes: 2500000,
        contentType: 'image/jpeg',
        capturedAt: null,
        isFavorite: false
      }));
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(formattedImages));
      return;
    }

    // POST /api/galleries/[galleryId]/upload - Upload images to gallery (admin only)
    if (req.method === 'POST' && action === 'upload') {
      // For now, return success response - image upload requires multipart/form-data handling
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Image upload endpoint ready - requires multipart implementation' 
      }));
      return;
    }

    // GET /api/galleries/[slug]/download - Download gallery as ZIP (requires auth)
    if (req.method === 'GET' && action === 'download') {
      const authToken = req.headers.authorization?.replace('Bearer ', '');

      if (!authToken) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Authentication token required' }));
        return;
      }

      const tokenData = verifyGalleryToken(authToken);
      if (!tokenData) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid token' }));
        return;
      }

      // For now, return a message - ZIP creation requires additional libraries
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Gallery download endpoint ready - requires ZIP implementation',
        downloadUrl: `/api/galleries/${gallerySlug}/download-zip`
      }));
      return;
    }

    // POST /api/galleries/images/[imageId]/favorite - Toggle image favorite
    if (req.method === 'POST' && pathParts[2] === 'images' && pathParts[4] === 'favorite') {
      const authToken = req.headers.authorization?.replace('Bearer ', '');

      if (!authToken) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Authentication token required' }));
        return;
      }

      const tokenData = verifyGalleryToken(authToken);
      if (!tokenData) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid token' }));
        return;
      }

      // For now, return success - favorites require user session management
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Image favorite toggle endpoint ready',
        isFavorite: Math.random() > 0.5 // Random for demo
      }));
      return;
    }

    // PUT /api/galleries/[galleryId]/images/reorder - Reorder images (admin only)
    if (req.method === 'PUT' && action === 'images' && pathParts[4] === 'reorder') {
      const body = await getRequestBody();
      const { imageIds } = body;

      if (!Array.isArray(imageIds)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'imageIds array is required' }));
        return;
      }

      // Update image order in database
      for (let i = 0; i < imageIds.length; i++) {
        await sql`
          UPDATE gallery_images 
          SET sort_order = ${i}
          WHERE id = ${imageIds[i]}
        `.catch(() => {
          // Ignore errors for non-existent images
        });
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // DELETE /api/galleries/images/[imageId] - Delete image (admin only)
    if (req.method === 'DELETE' && pathParts[2] === 'images' && pathParts[3]) {
      await sql`DELETE FROM gallery_images WHERE id = ${pathParts[3]}`.catch(() => {});
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // PUT /api/galleries/[galleryId]/cover-image - Set gallery cover image (admin only)
    if (req.method === 'PUT' && action === 'cover-image') {
      const body = await getRequestBody();
      const { imageId } = body;

      if (!imageId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'imageId is required' }));
        return;
      }

      // Get image URL
      const image = await sql`
        SELECT url FROM gallery_images WHERE id = ${imageId}
      `;

      if (image.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Image not found' }));
        return;
      }

      // Update gallery cover image
      await sql`
        UPDATE galleries 
        SET cover_image = ${image[0].url}
        WHERE id = ${gallerySlug}
      `;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // GET /api/galleries/[galleryId]/stats - Get gallery statistics (admin only)
    if (req.method === 'GET' && action === 'stats') {
      const stats = await sql`
        SELECT 
          COUNT(*) as total_images,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_images
        FROM gallery_images
        WHERE gallery_id = ${gallerySlug}
      `.catch(() => [{ total_images: 0, recent_images: 0 }]);

      const accessLogs = await sql`
        SELECT COUNT(*) as total_views,
               COUNT(DISTINCT visitor_email) as unique_visitors,
               COUNT(CASE WHEN accessed_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_views
        FROM gallery_access_logs
        WHERE gallery_id = ${gallerySlug}
      `.catch(() => [{ total_views: 0, unique_visitors: 0, recent_views: 0 }]);

      const galleryStats = {
        totalImages: parseInt(stats[0]?.total_images || 0),
        recentImages: parseInt(stats[0]?.recent_images || 0),
        totalViews: parseInt(accessLogs[0]?.total_views || 0),
        uniqueVisitors: parseInt(accessLogs[0]?.unique_visitors || 0),
        recentViews: parseInt(accessLogs[0]?.recent_views || 0)
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(galleryStats));
      return;
    }

    // GET /api/galleries/[galleryId]/visitors - Get gallery visitors (admin only)
    if (req.method === 'GET' && action === 'visitors') {
      const visitors = await sql`
        SELECT visitor_email, visitor_name, accessed_at,
               COUNT(*) as visit_count,
               MAX(accessed_at) as last_visit
        FROM gallery_access_logs
        WHERE gallery_id = ${gallerySlug}
        GROUP BY visitor_email, visitor_name
        ORDER BY last_visit DESC
      `.catch(() => []);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(visitors));
      return;
    }

    // GET /api/galleries/[galleryId]/access-logs - Get gallery access logs (admin only)
    if (req.method === 'GET' && action === 'access-logs') {
      const logs = await sql`
        SELECT visitor_email, visitor_name, accessed_at, ip_address, user_agent
        FROM gallery_access_logs
        WHERE gallery_id = ${gallerySlug}
        ORDER BY accessed_at DESC
        LIMIT 100
      `.catch(() => []);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(logs));
      return;
    }

  } catch (error) {
    console.error('Gallery API error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
    return;
  }

  // If no matching endpoint found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Gallery API endpoint not found' }));
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
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
  
  // Voucher PDF endpoints (public, before /api routing)
  if (pathname === '/voucher/pdf' && req.method === 'GET') {
    try {
      const sessionId = String(parsedUrl.query?.session_id || '').trim();
      if (!sessionId) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing session_id');
        return;
      }

      if (!stripe) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Stripe not configured');
        return;
      }

      let session = await stripe.checkout.sessions.retrieve(sessionId);
      let isPaid = session?.payment_status === 'paid';
      if (!isPaid) {
        session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
        isPaid = session?.payment_status === 'paid';
      }

      if (!isPaid) {
        res.writeHead(402, { 'Content-Type': 'text/plain' });
        res.end('Payment not completed yet');
        return;
      }

      const m = session.metadata || {};
      const sku = m.sku || 'Voucher';
      const name = m.recipient_name || 'Beschenkte/r';
      const from = m.from_name || '—';
      const note = m.message || m.personal_message || '';
      const vId = m.voucher_id || session.id;
      const exp = m.expiry_date || '12 Monate ab Kaufdatum';
      const titleMap = {
        'Maternity-Basic': 'Schwangerschafts Fotoshooting - Basic',
        'Family-Basic': 'Family Fotoshooting - Basic',
        'Newborn-Basic': 'Newborn Fotoshooting - Basic',
        'Maternity-Premium': 'Schwangerschafts Fotoshooting - Premium',
        'Family-Premium': 'Family Fotoshooting - Premium',
        'Newborn-Premium': 'Newborn Fotoshooting - Premium',
        'Maternity-Deluxe': 'Schwangerschafts Fotoshooting - Deluxe',
        'Family-Deluxe': 'Family Fotoshooting - Deluxe',
        'Newborn-Deluxe': 'Newborn Fotoshooting - Deluxe',
      };
      const title = titleMap[String(sku)] || 'Gutschein';

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${vId}.pdf"`);

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      doc.pipe(res);

      try {
        const logoUrl = process.env.VOUCHER_LOGO_URL || 'https://i.postimg.cc/j55DNmbh/frontend-logo.jpg';
        const resp = await fetch(logoUrl);
        if (resp && resp.ok) {
          const arr = await resp.arrayBuffer();
          const imgBuf = Buffer.from(arr);
          doc.image(imgBuf, 50, 50, { fit: [160, 60] });
        }
      } catch {}
      doc.moveDown(2);

      doc.fontSize(22).text('New Age Fotografie', { align: 'right' });
      doc.moveDown(0.5);
      doc.fontSize(12).text('www.newagefotografie.com', { align: 'right' });
      doc.moveDown(1.5);

      doc.fontSize(26).text('PERSONALISIERTER GUTSCHEIN', { align: 'left' });
      doc.moveDown(0.5);

      doc.fontSize(18).text(title);
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Gutschein-ID: ${vId}`);
      doc.text(`SKU: ${sku}`);
      doc.text(`Empfänger/in: ${name}`);
      doc.text(`Von: ${from}`);
      doc.text(`Gültig bis: ${exp}`);
      doc.moveDown(0.5);

      if (note) {
        doc.fontSize(12).text('Nachricht:', { underline: true });
        doc.moveDown(0.2);
        doc.fontSize(12).text(note, { align: 'left' });
        doc.moveDown(0.8);
      }

      doc.moveDown(1);
      doc.fontSize(10).text(
        'Einlösbar für die oben genannte Leistung in unserem Studio. ' +
        'Nicht bar auszahlbar. Termin nach Verfügbarkeit. Bitte zur Einlösung Gutschein-ID angeben.',
        { align: 'justify' }
      );

      doc.moveDown(2);
      const paid = ((session.amount_total || 0) / 100).toFixed(2) + ' ' + String(session.currency || 'EUR').toUpperCase();
      const createdMs = (session.created ? Number(session.created) * 1000 : Date.now());
      doc.fontSize(10).text(`Belegt durch Zahlung: ${paid} | Datum: ${new Date(createdMs).toLocaleDateString('de-AT')}`);
      doc.end();
    } catch (e) {
      console.error('Voucher PDF generation failed', e);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Failed to generate PDF');
    }
    return;
  }

  if (pathname === '/voucher/pdf/preview' && req.method === 'GET') {
    try {
      const qp = parsedUrl.query || {};
      const sku = String(qp.sku || 'Family-Basic');
      const name = String(qp.name || qp.recipient_name || 'Anna Muster');
      const from = String(qp.from || qp.from_name || 'Max Beispiel');
      const note = String(qp.message || 'Alles Gute zum besonderen Anlass!');
      const vId = String(qp.voucher_id || 'VCHR-PREVIEW-1234');
      const exp = String(qp.expiry_date || '12 Monate ab Kaufdatum');
      const amount = parseFloat(String(qp.amount || '95.00'));
      const currency = String(qp.currency || 'EUR');

      const titleMap = {
        'Maternity-Basic': 'Schwangerschafts Fotoshooting - Basic',
        'Family-Basic': 'Family Fotoshooting - Basic',
        'Newborn-Basic': 'Newborn Fotoshooting - Basic',
        'Maternity-Premium': 'Schwangerschafts Fotoshooting - Premium',
        'Family-Premium': 'Family Fotoshooting - Premium',
        'Newborn-Premium': 'Newborn Fotoshooting - Premium',
        'Maternity-Deluxe': 'Schwangerschafts Fotoshooting - Deluxe',
        'Family-Deluxe': 'Family Fotoshooting - Deluxe',
        'Newborn-Deluxe': 'Newborn Fotoshooting - Deluxe',
      };
      const title = titleMap[sku] || 'Gutschein';

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${vId}.pdf"`);

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      doc.pipe(res);

      try {
        const logoUrl = process.env.VOUCHER_LOGO_URL || 'https://i.postimg.cc/j55DNmbh/frontend-logo.jpg';
        const resp = await fetch(logoUrl);
        if (resp && resp.ok) {
          const arr = await resp.arrayBuffer();
          const imgBuf = Buffer.from(arr);
          doc.image(imgBuf, 50, 50, { fit: [160, 60] });
        }
      } catch {}
      doc.moveDown(2);

      doc.fontSize(22).text('New Age Fotografie', { align: 'right' });
      doc.moveDown(0.5);
      doc.fontSize(12).text('www.newagefotografie.com', { align: 'right' });
      doc.moveDown(1.5);

      doc.fontSize(26).text('PERSONALISIERTER GUTSCHEIN', { align: 'left' });
      doc.moveDown(0.5);

      doc.fontSize(18).text(title);
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Gutschein-ID: ${vId}`);
      doc.text(`SKU: ${sku}`);
      doc.text(`Empfänger/in: ${name}`);
      doc.text(`Von: ${from}`);
      doc.text(`Gültig bis: ${exp}`);
      doc.moveDown(0.5);

      if (note) {
        doc.fontSize(12).text('Nachricht:', { underline: true });
        doc.moveDown(0.2);
        doc.fontSize(12).text(note, { align: 'left' });
        doc.moveDown(0.8);
      }

      doc.moveDown(1);
      doc.fontSize(10).text(
        'Einlösbar für die oben genannte Leistung in unserem Studio. ' +
        'Nicht bar auszahlbar. Termin nach Verfügbarkeit. Bitte zur Einlösung Gutschein-ID angeben.',
        { align: 'justify' }
      );

      doc.moveDown(2);
      const paid = amount.toFixed(2) + ' ' + currency.toUpperCase();
      doc.fontSize(10).text(`Vorschau der Zahlung: ${paid} | Datum: ${new Date().toLocaleDateString('de-AT')}`);
      doc.end();
    } catch (e) {
      console.error('Voucher PDF preview failed', e);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Failed to generate preview PDF');
    }
    return;
  }

  // Public server-rendered questionnaire page
  if (pathname.startsWith('/q/') && req.method === 'GET') {
    try {
      const slug = pathname.split('/')[2];
      if (!slug) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Questionnaire not found');
        return;
      }
      if (!sql) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Database not available');
        return;
      }
      const rows = await sql`SELECT * FROM questionnaires WHERE slug = ${slug} AND is_active = true`;
      if (!rows || rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Questionnaire not found');
        return;
      }
      const qn = rows[0];
      const fields = qn.fields || [];
      const css = `body{font-family:ui-sans-serif,system-ui,Arial;margin:2rem;line-height:1.5}.card{max-width:760px;margin:auto;padding:24px;border:1px solid #eee;border-radius:14px;box-shadow:0 8px 26px rgba(0,0,0,.06)}label{display:block;margin:.5rem 0 .25rem;font-weight:600}input,select,textarea{width:100%;padding:.6rem;border:1px solid #ddd;border-radius:8px}.row{margin:1rem 0}button{background:#6C2BD9;color:#fff;padding:.8rem 1.2rem;border:0;border-radius:10px;cursor:pointer}.muted{color:#666;font-size:.9rem}`;
      const inputs = (fields || []).map((f) => {
        const reqAttr = f.required ? 'required' : '';
        if (f.type === 'textarea') {
          return `<div class="row"><label>${escapeHtml(f.label)}${f.required ? ' *' : ''}</label><textarea name="${escapeHtml(f.key)}" rows="4" ${reqAttr}></textarea></div>`;
        }
        if (f.type === 'select') {
          const opts = (f.options || []).map((o) => `<option value="${escapeHtml(String(o))}">${escapeHtml(String(o))}</option>`).join('');
          return `<div class="row"><label>${escapeHtml(f.label)}${f.required ? ' *' : ''}</label><select name="${escapeHtml(f.key)}" ${reqAttr}>${opts}</select></div>`;
        }
        if (f.type === 'radio') {
          const radios = (f.options || []).map((o) => `<label style="font-weight:400"><input type="radio" name="${escapeHtml(f.key)}" value="${escapeHtml(String(o))}" ${reqAttr}/> ${escapeHtml(String(o))}</label>`).join('<br/>' );
          return `<div class="row"><div><strong>${escapeHtml(f.label)}${f.required ? ' *' : ''}</strong></div>${radios}</div>`;
        }
        if (f.type === 'checkbox') {
          return `<div class="row"><label style="font-weight:400"><input type="checkbox" name="${escapeHtml(f.key)}" /> ${escapeHtml(f.label)}</label></div>`;
        }
        const type = f.type === 'email' ? 'email' : 'text';
        return `<div class="row"><label>${escapeHtml(f.label)}${f.required ? ' *' : ''}</label><input type="${type}" name="${escapeHtml(f.key)}" ${reqAttr}/></div>`;
      }).join('');
      const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(qn.title)} – New Age Fotografie</title><style>${css}</style></head><body><div class="card"><h2>${escapeHtml(qn.title)}</h2>${qn.description ? `<p class=\"muted\">${escapeHtml(qn.description)}</p>` : ''}<form id="f"><div class="row"><label>Dein Name *</label><input type="text" name="client_name" required /></div><div class="row"><label>Deine E-Mail *</label><input type="email" name="client_email" required /></div>${inputs}<div class="row"><button type="submit">Antwort senden</button></div><p id="msg" class="muted"></p></form></div><script>const el=document.getElementById('f');el.addEventListener('submit',async(e)=>{e.preventDefault();const fd=new FormData(el);const payload={};fd.forEach((v,k)=>payload[k]=v);const r=await fetch('/api/questionnaires/${slug}/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const j=await r.json();const msg=document.getElementById('msg');if(j.ok){msg.textContent='Danke! Deine Antworten wurden gesendet.';el.reset();}else{msg.textContent='Fehler: '+(j.error||'Bitte versuch es noch einmal.');}});</script></body></html>`;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    } catch (err) {
      console.error('❌ Error rendering questionnaire page:', err.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server error');
      return;
    }
  }

  
  // API endpoints
  if (pathname.startsWith('/api/')) {
    // Handle login specifically
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      handleLogin(req, res);
      return;
    }
    // Auth verify (stateless demo) and logout endpoints used by frontend
    if (pathname === '/api/auth/verify' && req.method === 'GET') {
      // No server session tracking here; return not authenticated
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false }));
      return;
    }
    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      // Clear cookies if any existed; currently stateless
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }
    
    // Questionnaire: create
    if (pathname === '/api/questionnaires' && req.method === 'POST') {
      try {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const title = String(data.title || '').trim();
            const description = String(data.description || '');
            const fields = Array.isArray(data.fields) ? data.fields : [];
            const notifyEmail = (data.notifyEmail || process.env.NOTIFY_EMAIL || '').trim() || null;
            if (!title || !fields.length) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'Title and at least one field are required' }));
              return;
            }
            if (!sql) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'Database not available' }));
              return;
            }
            const slug = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)).replace(/-/g,'').slice(0,10);
            const inserted = await sql`
              INSERT INTO questionnaires (slug, title, description, fields, notify_email)
              VALUES (${slug}, ${title}, ${description}, ${JSON.stringify(fields)}, ${notifyEmail})
              RETURNING id, slug, title, description, fields, notify_email, created_at
            `;
            const base = String(process.env.APP_BASE_URL || process.env.APP_URL || '').replace(/\/$/, '');
            const link = `${base}/q/${inserted[0].slug}`;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, questionnaire: inserted[0], link }));
          } catch (err) {
            console.error('❌ Create questionnaire error:', err.message);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'Invalid payload' }));
          }
        });
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Server error' }));
      }
      return;
    }

    // Questionnaire: submit answers
  if (pathname.match(/^\/api\/questionnaires\/[^\/]+\/submit$/) && req.method === 'POST') {
      try {
        const slug = pathname.split('/')[3];
        if (!sql) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Database not available' }));
          return;
        }
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const payload = JSON.parse(body || '{}');
            const client_name = String(payload.client_name || '').trim();
            const client_email = String(payload.client_email || '').trim();
            if (!client_name || !client_email) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'Please provide your name and email' }));
              return;
            }
            const rows = await sql`SELECT * FROM questionnaires WHERE slug = ${slug} AND is_active = true`;
            if (!rows || rows.length === 0) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'Questionnaire not found' }));
              return;
            }
            const qn = rows[0];
            const answers = {};
            const missing = [];
            for (const f of (qn.fields || [])) {
              let val = payload[f.key];
              if (f.type === 'checkbox') val = !!val;
              if (f.required && (val === undefined || val === '')) missing.push(f.label);
              answers[f.key] = (val === undefined ? null : val);
            }
            if (missing.length) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: `Please answer: ${missing.join(', ')}` }));
              return;
            }
            const rawIp = Array.isArray(req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'][0] : (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '');
            const ip = String(rawIp).split(',')[0].trim();
            const ua = req.headers['user-agent'] || '';
            const saved = await sql`
              INSERT INTO questionnaire_responses (questionnaire_id, client_email, client_name, answers, ip, user_agent)
              VALUES (${qn.id}, ${client_email}, ${client_name}, ${JSON.stringify(answers)}, ${ip}, ${ua})
              RETURNING id, created_at
            `;
            const to = qn.notify_email || process.env.NOTIFY_EMAIL;
            if (to) {
              try {
                if (database && typeof database.sendEmail === 'function') {
                  await database.sendEmail({
                    to,
                    subject: `Neue Fragebogen-Antwort: ${qn.title}`,
                    html: `<p><strong>Neue Fragebogen-Antwort</strong></p><p><b>Fragebogen:</b> ${escapeHtml(qn.title)}<br/><b>Datum:</b> ${formatDeDateTime(saved[0].created_at)}<br/><b>Name:</b> ${escapeHtml(client_name)}<br/><b>E-Mail:</b> ${escapeHtml(client_email)}</p><p><b>Antworten:</b></p><pre style="background:#f8f8f8;padding:12px;border-radius:8px">${escapeHtml(JSON.stringify(answers, null, 2))}</pre>`
                  });
                } else {
                  const nodemailer = require('nodemailer');
                  const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: parseInt(process.env.SMTP_PORT || '587'),
                    secure: (process.env.SMTP_SECURE || 'false') === 'true',
                    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
                    tls: { rejectUnauthorized: false }
                  });
                  await transporter.sendMail({
                    from: process.env.FROM_EMAIL || process.env.SMTP_USER,
                    to,
                    subject: `Neue Fragebogen-Antwort: ${qn.title}`,
                    html: `<p><strong>Neue Fragebogen-Antwort</strong></p><p><b>Fragebogen:</b> ${escapeHtml(qn.title)}<br/><b>Datum:</b> ${formatDeDateTime(saved[0].created_at)}<br/><b>Name:</b> ${escapeHtml(client_name)}<br/><b>E-Mail:</b> ${escapeHtml(client_email)}</p><p><b>Antworten:</b></p><pre style="background:#f8f8f8;padding:12px;border-radius:8px">${escapeHtml(JSON.stringify(answers, null, 2))}</pre>`
                  });
                }
              } catch (emailErr) {
                console.warn('⚠️ Questionnaire email failed:', emailErr.message);
              }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, id: saved[0].id }));
          } catch (err) {
            console.error('❌ Questionnaire submit error:', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'Server error' }));
          }
        });
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Server error' }));
      }
      return;
    }

    // Questionnaire: list responses
    if (pathname.match(/^\/api\/questionnaires\/[^\/]+\/responses$/) && req.method === 'GET') {
      try {
        if (!sql) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Database not available' }));
          return;
        }
        const slug = pathname.split('/')[3];
        const qrows = await sql`SELECT id, title FROM questionnaires WHERE slug = ${slug}`;
        if (!qrows || qrows.length === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Not found' }));
          return;
        }
        const qid = qrows[0].id;
        const rows = await sql`
          SELECT id, client_name, client_email, answers, created_at
          FROM questionnaire_responses
          WHERE questionnaire_id = ${qid}
          ORDER BY created_at DESC
        `;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, questionnaire: qrows[0], count: rows.length, responses: rows }));
      } catch (err) {
        console.error('❌ Questionnaire responses error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Server error' }));
      }
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
      
      // POST /api/crm/leads - Create new lead
      if (pathname === '/api/crm/leads' && req.method === 'POST') {
        try {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const { name, email, phone, message, source, status } = JSON.parse(body);
              
              console.log('📝 Creating new lead via CRM API:', { name, email, source });
              
              // Create lead in database
              const leadData = {
                name: name,
                email: email,
                phone: phone,
                source: source || 'manual',
                status: status || 'new',
                notes: message || '',
                created_at: new Date().toISOString()
              };
              
              // Store lead in database
              await sql`
                INSERT INTO leads (name, email, phone, source, status, notes, created_at)
                VALUES (${leadData.name}, ${leadData.email}, ${leadData.phone}, ${leadData.source}, ${leadData.status}, ${leadData.notes}, ${leadData.created_at})
              `;
              
              console.log('✅ Lead created successfully via CRM API');
              
              res.writeHead(201, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: true, 
                message: 'Lead created successfully',
                data: leadData
              }));
            } catch (error) {
              console.error('❌ CRM Lead creation error:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Failed to create lead' }));
            }
          });
        } catch (error) {
          console.error('❌ CRM Leads API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'API error' }));
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
            // Compute expiry for the link (30 days)
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            
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
              const tpl = template_id || 'default-questionnaire';
              await sql`
                INSERT INTO questionnaire_links (
                  token, client_id, template_id, expires_at, created_at
                ) VALUES (
                  ${token}, ${client_id}, ${tpl},
                  ${expiresAt}, NOW()
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
              expires_at: expiresAt
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
                    ${Object.entries(answers).map(([questionId, answer]) => {
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
              console.log('💾 Storing questionnaire response:', {
                token,
                clientName,
                clientEmail,
                answersCount: Object.keys(answers).length
              });
              
              await sql`
                INSERT INTO questionnaire_responses (
                  client_id, token, template_slug, answers, submitted_at
                ) VALUES (
                  (SELECT client_id FROM questionnaire_links WHERE token = ${token}),
                  ${token},
                  'default-questionnaire',
                  ${JSON.stringify(answers)},
                  NOW()
                )
              `;
              
              // Mark the questionnaire link as used
              await sql`
                UPDATE questionnaire_links 
                SET is_used = true
                WHERE token = ${token}
              `;
              
              console.log('✅ Questionnaire response stored successfully for client:', clientName);
              console.log('🔔 New questionnaire notification available for admin dashboard');
            } catch (dbError) {
              console.error('❌ Database storage error:', dbError.message);
              console.error('❌ Full error details:', dbError);
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
      
      // === LEAD CAPTURE ENDPOINTS ===
      
      // Contact form submission endpoint
      if (pathname === '/api/contact' && req.method === 'POST') {
        try {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const { fullName, email, phone, message } = JSON.parse(body);
              
              console.log('📞 New contact form submission:', { fullName, email, phone });
              
              // Create lead in database
              const leadData = {
                name: fullName,
                email: email,
                phone: phone,
                source: 'contact_form',
                status: 'new',
                notes: message,
                created_at: new Date().toISOString()
              };
              
              // Store lead in database
              await sql`
                INSERT INTO leads (name, email, phone, source, status, notes, created_at)
                VALUES (${leadData.name}, ${leadData.email}, ${leadData.phone}, ${leadData.source}, ${leadData.status}, ${leadData.notes}, ${leadData.created_at})
              `;
              
              console.log('✅ Lead created successfully for contact form submission');
              
              // Send notification email to hallo@newagefotografie.com
              const notificationEmailData = {
                to: 'hallo@newagefotografie.com',
                subject: `Neue Kontaktanfrage von ${fullName}`,
                html: `
                  <h2>Neue Kontaktanfrage</h2>
                  <p><strong>Name:</strong> ${fullName}</p>
                  <p><strong>E-Mail:</strong> ${email}</p>
                  <p><strong>Telefon:</strong> ${phone}</p>
                  <p><strong>Nachricht:</strong></p>
                  <p>${message}</p>
                  <p><em>Eingegangen am: ${new Date().toLocaleString('de-DE')}</em></p>
                `,
                text: `Neue Kontaktanfrage von ${fullName}\n\nE-Mail: ${email}\nTelefon: ${phone}\n\nNachricht:\n${message}\n\nEingegangen am: ${new Date().toLocaleString('de-DE')}`
              };
              
              await database.sendEmail(notificationEmailData);
              console.log('📧 Contact form notification email sent to hallo@newagefotografie.com');
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: true, 
                message: 'Kontaktformular erfolgreich übermittelt' 
              }));
            } catch (error) {
              console.error('❌ Contact form submission error:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Fehler beim Übermitteln des Kontaktformulars' }));
            }
          });
        } catch (error) {
          console.error('❌ Contact form API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'API-Fehler' }));
        }
        return;
      }
      
      // Waitlist (Warteliste) form submission endpoint  
      if (pathname === '/api/waitlist' && req.method === 'POST') {
        try {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const { fullName, email, phone, preferredDate, message } = JSON.parse(body);
              
              console.log('📅 New waitlist submission:', { fullName, email, phone, preferredDate });
              
              // Create lead in database
              const leadData = {
                name: fullName,
                email: email,
                phone: phone,
                source: 'warteliste',
                status: 'new',
                notes: `Bevorzugtes Datum: ${preferredDate}${message ? '\n\nNachricht: ' + message : ''}`,
                created_at: new Date().toISOString()
              };
              
              // Store lead in database
              await sql`
                INSERT INTO leads (name, email, phone, source, status, notes, created_at)
                VALUES (${leadData.name}, ${leadData.email}, ${leadData.phone}, ${leadData.source}, ${leadData.status}, ${leadData.notes}, ${leadData.created_at})
              `;
              
              console.log('✅ Lead created successfully for waitlist submission');
              
              // Send notification email to hallo@newagefotografie.com
              const notificationEmailData = {
                to: 'hallo@newagefotografie.com',
                subject: `Neue Warteliste-Anfrage von ${fullName}`,
                html: `
                  <h2>Neue Warteliste-Anfrage</h2>
                  <p><strong>Name:</strong> ${fullName}</p>
                  <p><strong>E-Mail:</strong> ${email}</p>
                  <p><strong>Telefon:</strong> ${phone}</p>
                  <p><strong>Bevorzugtes Datum:</strong> ${preferredDate}</p>
                  ${message ? `<p><strong>Nachricht:</strong></p><p>${message}</p>` : ''}
                  <p><em>Eingegangen am: ${new Date().toLocaleString('de-DE')}</em></p>
                `,
                text: `Neue Warteliste-Anfrage von ${fullName}\n\nE-Mail: ${email}\nTelefon: ${phone}\nBevorzugtes Datum: ${preferredDate}${message ? '\n\nNachricht:\n' + message : ''}\n\nEingegangen am: ${new Date().toLocaleString('de-DE')}`
              };
              
              await database.sendEmail(notificationEmailData);
              console.log('📧 Waitlist notification email sent to hallo@newagefotografie.com');
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: true, 
                message: 'Warteliste-Anfrage erfolgreich übermittelt' 
              }));
            } catch (error) {
              console.error('❌ Waitlist submission error:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Fehler beim Übermitteln der Warteliste-Anfrage' }));
            }
          });
        } catch (error) {
          console.error('❌ Waitlist API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'API-Fehler' }));
        }
        return;
      }
      
      // Newsletter signup endpoint
      if (pathname === '/api/newsletter/signup' && req.method === 'POST') {
        try {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const { email } = JSON.parse(body);
              
              console.log('📧 New newsletter signup:', { email });
              
              // Create lead in database
              const leadData = {
                name: 'Newsletter Subscriber',
                email: email,
                phone: '',
                source: 'newsletter',
                status: 'new',
                notes: 'Newsletter subscription',
                created_at: new Date().toISOString()
              };
              
              // Store lead in database
              await sql`
                INSERT INTO leads (name, email, phone, source, status, notes, created_at)
                VALUES (${leadData.name}, ${leadData.email}, ${leadData.phone}, ${leadData.source}, ${leadData.status}, ${leadData.notes}, ${leadData.created_at})
              `;
              
              console.log('✅ Lead created successfully for newsletter signup');
              
              // Send notification email to hallo@newagefotografie.com
              const notificationEmailData = {
                to: 'hallo@newagefotografie.com',
                subject: `Neue Newsletter-Anmeldung: ${email}`,
                html: `
                  <h2>Neue Newsletter-Anmeldung</h2>
                  <p><strong>E-Mail:</strong> ${email}</p>
                  <p><em>Angemeldet am: ${new Date().toLocaleString('de-DE')}</em></p>
                `,
                text: `Neue Newsletter-Anmeldung\n\nE-Mail: ${email}\n\nAngemeldet am: ${new Date().toLocaleString('de-DE')}`
              };
              
              await database.sendEmail(notificationEmailData);
              console.log('📧 Newsletter signup notification email sent to hallo@newagefotografie.com');
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: true, 
                message: 'Newsletter-Anmeldung erfolgreich' 
              }));
            } catch (error) {
              console.error('❌ Newsletter signup error:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Fehler bei der Newsletter-Anmeldung' }));
            }
          });
        } catch (error) {
          console.error('❌ Newsletter API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'API-Fehler' }));
        }
        return;
      }
      
      // Get client questionnaire responses endpoint
      if (pathname.startsWith('/api/admin/client-questionnaires/') && req.method === 'GET') {
        try {
          const clientId = pathname.split('/').pop();
          const clientIdParam = String(clientId);
          console.log('📊 Fetching questionnaire responses for client:', clientIdParam);

          // Get questionnaire links and responses for this client using existing schema
          let questionnaires = [];
          try {
            questionnaires = await sql`
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
                COALESCE(c.first_name, 'Demo') as first_name,
                COALESCE(c.last_name, 'Client') as last_name,
                COALESCE(c.email, 'demo@example.com') as email
              FROM questionnaire_links ql
              LEFT JOIN questionnaire_responses qr ON ql.token = qr.token
              LEFT JOIN crm_clients c ON ql.client_id = c.client_id
              WHERE ql.client_id::text = ${clientIdParam}::text
              ORDER BY ql.created_at DESC
            `;
            console.log('✅ Primary query successful, found questionnaires:', questionnaires.length);
            questionnaires.forEach((q, i) => {
              console.log(`📝 Questionnaire ${i + 1}:`, {
                token: q.token,
                client_id: q.client_id,
                is_used: q.is_used,
                has_response: !!q.response_id,
                submitted_at: q.submitted_at,
                answers: q.answers ? Object.keys(JSON.parse(q.answers || '{}')).length + ' answers' : 'no answers'
              });
            });
          } catch (sqlErr) {
            console.error('❌ Client questionnaires SQL error:', sqlErr.message || sqlErr);
            
            // Fallback: Try to get responses directly from questionnaire_responses table
            try {
              console.log('🔄 Trying fallback query...');
              const responseResults = await sql`
                SELECT 
                  token,
                  client_id,
                  template_slug,
                  answers,
                  submitted_at,
                  created_at
                FROM questionnaire_responses 
                WHERE client_id = ${clientIdParam}
                ORDER BY submitted_at DESC
              `;
              
              console.log('✅ Fallback query found responses:', responseResults.length);
              
              questionnaires = responseResults.map(r => ({
                token: r.token,
                client_id: r.client_id,
                template_id: r.template_slug,
                is_used: true,
                sent_at: r.created_at,
                expires_at: null,
                response_id: r.token,
                answers: r.answers,
                submitted_at: r.submitted_at,
                first_name: 'Client',
                last_name: '',
                email: 'client@example.com'
              }));
              
              console.log('✅ Fallback query successful, found responses:', questionnaires.length);
            } catch (fallbackErr) {
              console.error('❌ Fallback query also failed:', fallbackErr.message);
              questionnaires = [];
            }
          }

          // Transform the data for the frontend
          const formattedQuestionnaires = questionnaires.map(q => ({
            id: q.response_id || q.token,
            questionnaireName: 'Photography Preferences Survey',
            sentDate: q.sent_at,
            responseDate: q.submitted_at,
            submitted_at: q.submitted_at, // Add this field for frontend compatibility
            status: q.is_used ? 'responded' : (new Date() > new Date(q.expires_at) ? 'expired' : 'sent'),
            responses: q.answers,
            link: q.is_used ? null : `${req.headers.host}/questionnaire/${q.token}`
          }));
          
          console.log('📤 Returning formatted questionnaire data:', {
            total: formattedQuestionnaires.length,
            responded: formattedQuestionnaires.filter(q => q.status === 'responded').length,
            samples: formattedQuestionnaires.slice(0, 2).map(q => ({
              id: q.id,
              status: q.status,
              has_responses: !!q.responses,
              submitted_at: q.submitted_at
            }))
          });
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(formattedQuestionnaires));
        } catch (error) {
          console.error('❌ Get client questionnaires error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }
      
      // Get notifications endpoint
      if (pathname === '/api/admin/notifications' && req.method === 'GET') {
        try {
          // For now, return notifications based on recent questionnaire responses
          const recentResponses = await sql`
            SELECT 
              qr.id,
              qr.client_id,
              qr.submitted_at,
              qr.token
            FROM questionnaire_responses qr
            WHERE qr.submitted_at > NOW() - INTERVAL '7 days'
            ORDER BY qr.submitted_at DESC
            LIMIT 10
          `;
          
          const notifications = recentResponses.map(response => ({
            id: `questionnaire-${response.id}`,
            type: 'questionnaire',
            title: 'New Questionnaire Response',
            message: `Client ${response.client_id} submitted a questionnaire response`,
            timestamp: response.submitted_at,
            read: false
          }));
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(notifications));
        } catch (error) {
          console.error('❌ Get notifications error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }
      
      // Mark notification as read endpoint
      if (pathname.startsWith('/api/admin/notifications/') && pathname.endsWith('/read') && req.method === 'POST') {
        try {
          // For now, just return success since we're not persisting read status
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          console.error('❌ Mark notification read error:', error.message);
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

      // Legacy-compatible CRM Inbox endpoints used by frontend
      if (pathname === '/api/crm/messages' && req.method === 'GET') {
        try {
          if (database && typeof database.getCrmMessages === 'function') {
            const messages = await database.getCrmMessages();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(messages));
            return;
          }
          if (!sql) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify([]));
            return;
          }
          const rows = await sql`
            SELECT 
              id,
              COALESCE(sender_name, '') AS "senderName",
              COALESCE(sender_email, '') AS "senderEmail",
              COALESCE(subject, '') AS subject,
              COALESCE(content, '') AS content,
              COALESCE(status, 'unread') AS status,
              client_id AS "clientId",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
            FROM crm_messages
            ORDER BY created_at DESC
          `;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(rows));
        } catch (error) {
          console.error('❌ GET /api/crm/messages error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to load messages' }));
        }
        return;
      }

      // Update message status
      if (pathname.match(/^\/api\/crm\/messages\/[A-Za-z0-9\-]+$/) && req.method === 'PUT') {
        try {
          const id = pathname.split('/').pop();
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const data = body ? JSON.parse(body) : {};
              const updates = {
                status: data.status,
                replied_at: data.repliedAt || null,
              };
              if (database && typeof database.updateCrmMessage === 'function') {
                await database.updateCrmMessage(id, { status: updates.status, repliedAt: data.repliedAt });
              } else if (sql) {
                await sql`
                  UPDATE crm_messages
                  SET status = ${updates.status}, replied_at = ${updates.replied_at}, updated_at = NOW()
                  WHERE id = ${id}
                `;
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              console.error('❌ PUT /api/crm/messages/:id error:', err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Failed to update message' }));
            }
          });
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to update message' }));
        }
        return;
      }

      // Delete message
      if (pathname.match(/^\/api\/crm\/messages\/[A-Za-z0-9\-]+$/) && req.method === 'DELETE') {
        try {
          const id = pathname.split('/').pop();
          if (database && typeof database.deleteCrmMessage === 'function') {
            await database.deleteCrmMessage(id);
          } else if (sql) {
            await sql`DELETE FROM crm_messages WHERE id = ${id}`;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          console.error('❌ DELETE /api/crm/messages/:id error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to delete message' }));
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

      // CRM Price List API endpoint (returns photography price guide for invoice creation)
      if (pathname === '/api/crm/price-list' && req.method === 'GET') {
        try {
          console.log('📋 Fetching price list from database for invoice creation...');
          
          if (!sql) {
            console.log('⚠️ Database not connected, returning empty price list');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify([]));
            return;
          }
          
          // Query active price list items from database
          const priceListQuery = `
            SELECT 
              id,
              name,
              description,
              category,
              price,
              currency,
              tax_rate as "taxRate",
              unit,
              notes,
              is_active as "isActive"
            FROM price_list_items 
            WHERE is_active = true 
            ORDER BY category, name
          `;
          
          const priceListItems = await sql(priceListQuery);
          
          // Format for frontend (convert price to number, add type field)
          const formattedPriceList = priceListItems.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description || '',
            price: parseFloat(item.price) || 0,
            category: item.category,
            currency: item.currency || 'EUR',
            taxRate: parseFloat(item.taxRate) || 19,
            unit: item.unit || 'piece',
            notes: item.notes || '',
            isActive: item.isActive,
            type: 'service' // Default type for compatibility
          }));
          
          console.log(`📋 Found ${formattedPriceList.length} active price list items`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(formattedPriceList));
        } catch (error) {
          console.error('❌ Price list API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Price List Import API endpoint
      if (pathname === '/api/crm/price-list/import' && req.method === 'POST') {
        try {
          console.log('📤 Importing price list items...');
          const body = await parseBody(req);
          const { items } = JSON.parse(body);
          
          if (!sql) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Database not connected' }));
            return;
          }
          
          if (!Array.isArray(items) || items.length === 0) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Items array is required' }));
            return;
          }
          
          const insertedItems = [];
          
          for (const item of items) {
            try {
              // Check if item already exists (by name and category to avoid duplicates)
              const existing = await sql`
                SELECT id FROM price_list_items 
                WHERE name = ${item.name} AND category = ${item.category}
              `;
              
              if (existing.length > 0) {
                console.log(`⏭️ Skipping existing item: ${item.name}`);
                continue;
              }
              
              // Insert new item
              const insertResult = await sql`
                INSERT INTO price_list_items (
                  name, description, category, price, currency, tax_rate, 
                  unit, notes, is_active, created_at, updated_at
                ) VALUES (
                  ${item.name}, 
                  ${item.description || ''}, 
                  ${item.category}, 
                  ${parseFloat(item.price) || 0}, 
                  ${item.currency || 'EUR'}, 
                  ${parseFloat(item.taxRate || '19.00')}, 
                  ${item.unit || 'piece'}, 
                  ${item.notes || ''}, 
                  ${item.isActive !== false}, 
                  NOW(), 
                  NOW()
                )
                RETURNING *
              `;
              
              if (insertResult.length > 0) {
                insertedItems.push(insertResult[0]);
              }
            } catch (itemError) {
              console.error(`❌ Failed to insert item ${item.name}:`, itemError.message);
            }
          }
          
          console.log(`✅ Successfully imported ${insertedItems.length} price list items`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            imported: insertedItems.length,
            items: insertedItems 
          }));
        } catch (error) {
          console.error('❌ Price list import error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Price List Create API endpoint
      if (pathname === '/api/crm/price-list' && req.method === 'POST') {
        try {
          console.log('➕ Creating new price list item...');
          const body = await parseBody(req);
          const itemData = JSON.parse(body);
          
          if (!sql) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Database not connected' }));
            return;
          }
          
          const insertResult = await sql`
            INSERT INTO price_list_items (
              name, description, category, price, currency, tax_rate, 
              unit, notes, is_active, created_at, updated_at
            ) VALUES (
              ${itemData.name}, 
              ${itemData.description || ''}, 
              ${itemData.category}, 
              ${parseFloat(itemData.price) || 0}, 
              ${itemData.currency || 'EUR'}, 
              ${parseFloat(itemData.taxRate || '19.00')}, 
              ${itemData.unit || 'piece'}, 
              ${itemData.notes || ''}, 
              ${itemData.isActive !== false}, 
              NOW(), 
              NOW()
            )
            RETURNING *
          `;
          
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(insertResult[0]));
        } catch (error) {
          console.error('❌ Price list create error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Price List Update API endpoint
      if (pathname.startsWith('/api/crm/price-list/') && req.method === 'PUT') {
        try {
          const itemId = pathname.split('/').pop();
          console.log(`✏️ Updating price list item ${itemId}...`);
          
          const body = await parseBody(req);
          const updates = JSON.parse(body);
          
          if (!sql) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Database not connected' }));
            return;
          }
          
          const updateResult = await sql`
            UPDATE price_list_items 
            SET 
              name = ${updates.name},
              description = ${updates.description || ''},
              category = ${updates.category},
              price = ${parseFloat(updates.price) || 0},
              currency = ${updates.currency || 'EUR'},
              tax_rate = ${parseFloat(updates.taxRate || '19.00')},
              unit = ${updates.unit || 'piece'},
              notes = ${updates.notes || ''},
              is_active = ${updates.isActive !== false},
              updated_at = NOW()
            WHERE id = ${itemId}
            RETURNING *
          `;
          
          if (updateResult.length === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Item not found' }));
            return;
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(updateResult[0]));
        } catch (error) {
          console.error('❌ Price list update error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Price List Delete API endpoint
      if (pathname.startsWith('/api/crm/price-list/') && req.method === 'DELETE') {
        try {
          const itemId = pathname.split('/').pop();
          console.log(`🗑️ Deleting price list item ${itemId}...`);
          
          if (!sql) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Database not connected' }));
            return;
          }
          
          const deleteResult = await sql`
            DELETE FROM price_list_items 
            WHERE id = ${itemId}
            RETURNING id
          `;
          
          if (deleteResult.length === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Item not found' }));
            return;
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, deleted: itemId }));
        } catch (error) {
          console.error('❌ Price list delete error:', error.message);
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

      // Invoice API endpoints
      if (pathname === '/api/invoices' && req.method === 'GET') {
        try {
          console.log('📄 Fetching invoices...');
          const invoices = await sql`
            SELECT 
              i.*,
              c.name as client_name,
              c.email as client_email,
              c.address1 as client_address1,
              c.city as client_city,
              c.country as client_country
            FROM crm_invoices i
            LEFT JOIN crm_clients c ON i.client_id = c.id
            ORDER BY i.created_at DESC
          `;
          
          // Format invoices to match frontend expectations
          const formattedInvoices = invoices.map(invoice => ({
            ...invoice,
            total_amount: parseFloat(invoice.total) || 0,
            subtotal_amount: parseFloat(invoice.subtotal) || 0,
            client: {
              name: invoice.client_name,
              email: invoice.client_email,
              address1: invoice.client_address1,
              city: invoice.client_city,
              country: invoice.client_country
            }
          }));
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(formattedInvoices));
        } catch (error) {
          console.error('❌ Invoices API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Get single invoice by ID
      if (pathname.match(/^\/api\/invoices\/[^\/]+$/) && req.method === 'GET') {
        try {
          const invoiceId = pathname.split('/').pop();
          console.log('📄 Fetching single invoice:', invoiceId);
          
          const invoices = await sql`
            SELECT 
              i.*,
              c.name as client_name,
              c.email as client_email,
              c.address1 as client_address1,
              c.city as client_city,
              c.country as client_country
            FROM crm_invoices i
            LEFT JOIN crm_clients c ON i.client_id = c.id
            WHERE i.id = ${invoiceId}
          `;
          
          if (invoices.length === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invoice not found' }));
            return;
          }
          
          const invoice = invoices[0];
          
          // Get invoice items
          const items = await sql`
            SELECT * FROM crm_invoice_items 
            WHERE invoice_id = ${invoiceId}
            ORDER BY sort_order
          `;
          
          // Format the response to match frontend expectations
          const formattedInvoice = {
            ...invoice,
            total_amount: parseFloat(invoice.total) || 0,
            subtotal_amount: parseFloat(invoice.subtotal) || 0,
            client: {
              name: invoice.client_name,
              email: invoice.client_email,
              address1: invoice.client_address1,
              city: invoice.client_city,
              country: invoice.client_country
            },
            items: items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unit_price: parseFloat(item.unit_price),
              tax_rate: parseFloat(item.tax_rate),
              line_total: parseFloat(item.quantity) * parseFloat(item.unit_price)
            }))
          };
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(formattedInvoice));
        } catch (error) {
          console.error('❌ Single invoice API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Download invoice as PDF
      if (pathname.match(/^\/api\/invoices\/[^\/]+\/download$/) && req.method === 'GET') {
        try {
          const invoiceId = pathname.split('/')[3]; // Extract invoice ID from /api/invoices/:id/download
          console.log('📄 Generating PDF for invoice:', invoiceId);
          
          const invoices = await sql`
            SELECT 
              i.*,
              c.name as client_name,
              c.email as client_email,
              c.address1 as client_address1,
              c.city as client_city,
              c.country as client_country
            FROM crm_invoices i
            LEFT JOIN crm_clients c ON i.client_id = c.id
            WHERE i.id = ${invoiceId}
          `;
          
          if (invoices.length === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invoice not found' }));
            return;
          }
          
          const invoice = invoices[0];
          
          // Get invoice items
          const items = await sql`
            SELECT * FROM crm_invoice_items 
            WHERE invoice_id = ${invoiceId}
            ORDER BY sort_order
          `;
          
          // Generate PDF content (HTML that can be converted to PDF)
          const pdfContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice ${invoice.invoice_number}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .invoice-details { margin-bottom: 30px; }
        .client-details { margin-bottom: 30px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .items-table th { background-color: #f2f2f2; }
        .total-section { text-align: right; }
        .total-line { margin: 5px 0; }
        .final-total { font-weight: bold; font-size: 18px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>RECHNUNG</h1>
        <h2>Invoice ${invoice.invoice_number}</h2>
    </div>
    
    <div class="invoice-details">
        <p><strong>Rechnungsdatum:</strong> ${new Date(invoice.issue_date).toLocaleDateString('de-DE')}</p>
        <p><strong>Fälligkeitsdatum:</strong> ${new Date(invoice.due_date).toLocaleDateString('de-DE')}</p>
        <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
    </div>
    
    <div class="client-details">
        <h3>Rechnungsempfänger:</h3>
        <p><strong>${invoice.client_name}</strong></p>
        <p>${invoice.client_email}</p>
        <p>${invoice.client_address1}</p>
        <p>${invoice.client_city}, ${invoice.client_country}</p>
    </div>
    
    <table class="items-table">
        <thead>
            <tr>
                <th>Beschreibung</th>
                <th>Menge</th>
                <th>Einzelpreis</th>
                <th>MwSt. %</th>
                <th>Gesamt</th>
            </tr>
        </thead>
        <tbody>
            ${items.map(item => `
                <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>€${parseFloat(item.unit_price).toFixed(2)}</td>
                    <td>${item.tax_rate}%</td>
                    <td>€${(parseFloat(item.quantity) * parseFloat(item.unit_price)).toFixed(2)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="total-section">
        <div class="total-line">Zwischensumme: €${parseFloat(invoice.subtotal).toFixed(2)}</div>
        <div class="total-line">MwSt. (19%): €${parseFloat(invoice.tax_amount).toFixed(2)}</div>
        <div class="total-line final-total">Gesamtbetrag: €${parseFloat(invoice.total).toFixed(2)}</div>
    </div>
    
    ${invoice.notes ? `<div style="margin-top: 30px;"><h3>Notizen:</h3><p>${invoice.notes}</p></div>` : ''}
</body>
</html>`;

          res.writeHead(200, { 
            'Content-Type': 'text/html',
            'Content-Disposition': `attachment; filename="Invoice-${invoice.invoice_number}.html"`
          });
          res.end(pdfContent);
        } catch (error) {
          console.error('❌ PDF generation error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      if (pathname.startsWith('/api/invoices/public/') && req.method === 'GET') {
        try {
          const invoiceId = pathname.split('/').pop();
          console.log('📄 Fetching public invoice:', invoiceId);
          
          const invoices = await sql`
            SELECT 
              i.*,
              c.name as client_name,
              c.email as client_email,
              c.address1 as client_address1,
              c.city as client_city,
              c.country as client_country
            FROM crm_invoices i
            LEFT JOIN crm_clients c ON i.client_id = c.id
            WHERE i.id = ${invoiceId}
          `;
          
          if (invoices.length === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invoice not found' }));
            return;
          }
          
          const invoice = invoices[0];
          
          // Get invoice items
          const items = await sql`
            SELECT * FROM crm_invoice_items 
            WHERE invoice_id = ${invoiceId}
            ORDER BY sort_order
          `;
          
          // Format the response
          const formattedInvoice = {
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            client_id: invoice.client_id,
            amount: parseFloat(invoice.subtotal) || 0,
            tax_amount: parseFloat(invoice.tax_amount) || 0,
            total_amount: parseFloat(invoice.total) || 0,
            subtotal_amount: parseFloat(invoice.subtotal) || 0,
            discount_amount: parseFloat(invoice.discount_amount) || 0,
            currency: invoice.currency || 'EUR',
            status: invoice.status,
            due_date: invoice.due_date,
            payment_terms: invoice.payment_terms,
            notes: invoice.notes,
            created_at: invoice.created_at,
            client: {
              name: invoice.client_name,
              email: invoice.client_email,
              address1: invoice.client_address1,
              city: invoice.client_city,
              country: invoice.client_country
            },
            items: items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unit_price: parseFloat(item.unit_price),
              tax_rate: parseFloat(item.tax_rate),
              line_total: parseFloat(item.quantity) * parseFloat(item.unit_price)
            }))
          };
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(formattedInvoice));
        } catch (error) {
          console.error('❌ Public invoice API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      if (pathname === '/api/invoices' && req.method === 'POST') {
        try {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const invoiceData = JSON.parse(body);
              console.log('📄 Creating invoice for client:', invoiceData.client_id);
              
              // Generate invoice number
              const invoiceNumber = `INV-${Date.now()}`;
              
              // Calculate totals
              const subtotal = invoiceData.items.reduce((sum, item) => 
                sum + (item.quantity * item.unit_price), 0
              );
              const discountAmount = (subtotal * (invoiceData.discount_amount || 0)) / 100;
              const afterDiscount = subtotal - discountAmount;
              const taxAmount = afterDiscount * 0.19; // 19% VAT
              const total = afterDiscount + taxAmount;
              
              // Create invoice record
              const invoiceResult = await sql`
                INSERT INTO crm_invoices (
                  invoice_number, client_id, issue_date, due_date, subtotal, 
                  tax_amount, total, status, notes, created_at, updated_at
                ) VALUES (
                  ${invoiceNumber}, ${invoiceData.client_id}, ${new Date().toISOString().split('T')[0]}, ${invoiceData.due_date},
                  ${subtotal}, ${taxAmount}, ${total}, 'draft', ${invoiceData.notes || ''}, NOW(), NOW()
                ) RETURNING *
              `;
              
              const invoice = invoiceResult[0];
              
              // Create invoice items
              for (const [index, item] of invoiceData.items.entries()) {
                await sql`
                  INSERT INTO crm_invoice_items (
                    invoice_id, description, quantity, unit_price, tax_rate, sort_order, created_at
                  ) VALUES (
                    ${invoice.id}, ${item.description}, ${item.quantity}, ${item.unit_price}, ${item.tax_rate || 0}, ${index}, NOW()
                  )
                `;
              }
              
              // Log invoice creation in client record
              await sql`
                INSERT INTO crm_client_activity_log (
                  client_id, activity_type, description, metadata, created_at
                ) VALUES (
                  ${invoiceData.client_id}, 'invoice_created', 
                  ${`Invoice ${invoiceNumber} created for €${total.toFixed(2)}`},
                  ${JSON.stringify({ invoice_id: invoice.id, amount: total })},
                  NOW()
                )
              `;
              
              res.writeHead(201, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: true, 
                invoice: invoice,
                message: 'Invoice created successfully'
              }));
            } catch (error) {
              console.error('❌ Invoice creation error:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: error.message }));
            }
          });
        } catch (error) {
          console.error('❌ Invoice API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // WhatsApp Invoice Sharing API endpoint
      if (pathname === '/api/invoices/share-whatsapp' && req.method === 'POST') {
        try {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const { invoice_id, phone_number } = JSON.parse(body);
              console.log('📱 Creating WhatsApp share link for invoice:', invoice_id);
              
              // Get invoice details
              const invoices = await sql`
                SELECT 
                  i.*,
                  c.name as client_name,
                  c.email as client_email
                FROM crm_invoices i
                LEFT JOIN crm_clients c ON i.client_id = c.id
                WHERE i.id = ${invoice_id}
              `;
              
              if (invoices.length === 0) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invoice not found' }));
                return;
              }
              
              const invoice = invoices[0];
              const baseUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:3001';
              const invoiceUrl = `${baseUrl}/invoice/public/${invoice_id}`;
              
              // Create WhatsApp message
              const message = `Hallo ${invoice.client_name || 'Kunde'},

hier ist Ihre Rechnung von New Age Fotografie:

📄 Rechnungsnummer: ${invoice.invoice_number}
💰 Betrag: €${parseFloat(invoice.total_amount).toFixed(2)}
📅 Fälligkeitsdatum: ${new Date(invoice.due_date).toLocaleDateString('de-DE')}

🔗 Rechnung online ansehen: ${invoiceUrl}

Bei Fragen stehe ich Ihnen gerne zur Verfügung!

Mit freundlichen Grüßen,
New Age Fotografie Team`;

              // Create WhatsApp URL
              const encodedMessage = encodeURIComponent(message);
              const whatsappUrl = `https://wa.me/${phone_number}?text=${encodedMessage}`;
              
              // Log WhatsApp share activity
              await sql`
                INSERT INTO crm_client_activity_log (
                  client_id, activity_type, description, metadata, created_at
                ) VALUES (
                  ${invoice.client_id}, 'invoice_shared_whatsapp', 
                  ${`Invoice ${invoice.invoice_number} shared via WhatsApp to ${phone_number}`},
                  ${JSON.stringify({ 
                    invoice_id: invoice_id, 
                    phone_number: phone_number,
                    whatsapp_url: whatsappUrl,
                    invoice_url: invoiceUrl
                  })},
                  NOW()
                )
              `;
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                whatsapp_url: whatsappUrl,
                invoice_url: invoiceUrl,
                message: 'WhatsApp share link created successfully'
              }));
            } catch (error) {
              console.error('❌ WhatsApp share error:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: error.message }));
            }
          });
        } catch (error) {
          console.error('❌ WhatsApp API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Email Invoice Sending API endpoint
      if (pathname === '/api/invoices/send-email' && req.method === 'POST') {
        try {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const { invoice_id, email_address, subject, message } = JSON.parse(body);
              console.log('📧 Sending invoice via email:', invoice_id, 'to', email_address);
              
              // Get invoice details
              const invoices = await sql`
                SELECT 
                  i.*,
                  c.name as client_name,
                  c.email as client_email,
                  c.firstname,
                  c.lastname
                FROM crm_invoices i
                LEFT JOIN crm_clients c ON i.client_id = c.id
                WHERE i.id = ${invoice_id}
              `;
              
              if (invoices.length === 0) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invoice not found' }));
                return;
              }
              
              const invoice = invoices[0];
              const baseUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:3001';
              const invoiceUrl = `${baseUrl}/invoice/public/${invoice_id}`;
              
              // Get invoice items for email
              const items = await sql`
                SELECT * FROM crm_invoice_items 
                WHERE invoice_id = ${invoice_id}
                ORDER BY sort_order
              `;

              // Create email content
              const clientName = invoice.firstname && invoice.lastname 
                ? `${invoice.firstname} ${invoice.lastname}` 
                : invoice.client_name || 'Kunde';

              const emailSubject = subject || `Rechnung ${invoice.invoice_number} - New Age Fotografie`;
              
              const itemsHtml = items.map(item => `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">€${parseFloat(item.unit_price).toFixed(2)}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">€${parseFloat(item.line_total).toFixed(2)}</td>
                </tr>
              `).join('');

              const emailHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <title>Rechnung ${invoice.invoice_number}</title>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                      <img src="${baseUrl}/frontend-logo.jpg" alt="New Age Fotografie" style="max-height: 80px;">
                      <h1 style="color: #8B5CF6;">New Age Fotografie</h1>
                    </div>
                    
                    <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                      <h2 style="color: #8B5CF6; margin-top: 0;">Liebe(r) ${clientName},</h2>
                      <p>${message || 'vielen Dank für Ihr Vertrauen! Anbei finden Sie Ihre Rechnung für unsere Fotografie-Dienstleistungen.'}</p>
                    </div>

                    <div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
                      <div style="background: #8B5CF6; color: white; padding: 15px;">
                        <h3 style="margin: 0;">Rechnung ${invoice.invoice_number}</h3>
                      </div>
                      
                      <div style="padding: 20px;">
                        <div style="margin-bottom: 20px;">
                          <strong>Rechnungsdatum:</strong> ${new Date(invoice.created_at).toLocaleDateString('de-DE')}<br>
                          <strong>Fälligkeitsdatum:</strong> ${new Date(invoice.due_date).toLocaleDateString('de-DE')}<br>
                          <strong>Zahlungsbedingungen:</strong> ${invoice.payment_terms}
                        </div>

                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                          <thead>
                            <tr style="background: #f8f9fa;">
                              <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #dee2e6;">Beschreibung</th>
                              <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #dee2e6;">Menge</th>
                              <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #dee2e6;">Preis</th>
                              <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #dee2e6;">Gesamt</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${itemsHtml}
                          </tbody>
                        </table>

                        <div style="text-align: right; margin-top: 20px;">
                          <div style="margin-bottom: 5px;">
                            <strong>Zwischensumme: €${parseFloat(invoice.subtotal_amount || invoice.total_amount).toFixed(2)}</strong>
                          </div>
                          ${invoice.tax_amount ? `
                          <div style="margin-bottom: 5px;">
                            Steuer: €${parseFloat(invoice.tax_amount).toFixed(2)}
                          </div>
                          ` : ''}
                          <div style="font-size: 18px; font-weight: bold; color: #8B5CF6; border-top: 2px solid #8B5CF6; padding-top: 10px;">
                            Gesamtbetrag: €${parseFloat(invoice.total_amount).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                      <h4 style="color: #1e40af; margin-top: 0;">📄 Rechnung online ansehen</h4>
                      <p>Klicken Sie hier, um Ihre Rechnung online anzusehen oder herunterzuladen:</p>
                      <a href="${invoiceUrl}" style="display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Rechnung ansehen</a>
                    </div>

                    ${invoice.notes ? `
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                      <strong>Notizen:</strong><br>
                      ${invoice.notes}
                    </div>
                    ` : ''}

                    <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
                      <p><strong>New Age Fotografie</strong><br>
                      Wien, Österreich<br>
                      Telefon: +43 677 633 99210<br>
                      Email: hallo@newagefotografie.com</p>
                      
                      <p>Bei Fragen zu Ihrer Rechnung stehen wir Ihnen gerne zur Verfügung!</p>
                    </div>
                  </div>
                </body>
                </html>
              `;

              // Initialize nodemailer with EasyName SMTP
              const nodemailer = require('nodemailer');
              const transporter = nodemailer.createTransport({
                host: 'mail.easyname.com',
                port: 587,
                secure: false,
                auth: {
                  user: process.env.SMTP_USER || 'hallo@newagefotografie.com',
                  pass: process.env.SMTP_PASS || 'your-email-password'
                },
                tls: {
                  rejectUnauthorized: false
                }
              });

              // Send email
              const mailOptions = {
                from: '"New Age Fotografie" <hallo@newagefotografie.com>',
                to: email_address || invoice.client_email,
                subject: emailSubject,
                html: emailHtml,
                attachments: []
              };

              await transporter.sendMail(mailOptions);

              // Update invoice status to 'sent' and set sent_date
              await sql`
                UPDATE crm_invoices 
                SET 
                  status = 'sent',
                  sent_date = NOW(),
                  updated_at = NOW()
                WHERE id = ${invoice_id}
              `;

              // Log email activity
              await sql`
                INSERT INTO crm_client_activity_log (
                  client_id, activity_type, description, metadata, created_at
                ) VALUES (
                  ${invoice.client_id}, 'invoice_sent_email', 
                  ${`Invoice ${invoice.invoice_number} sent via email to ${email_address || invoice.client_email}`},
                  ${JSON.stringify({ 
                    invoice_id: invoice_id, 
                    email_address: email_address || invoice.client_email,
                    subject: emailSubject,
                    invoice_url: invoiceUrl
                  })},
                  NOW()
                )
              `;
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                message: 'Invoice sent successfully via email',
                email_sent_to: email_address || invoice.client_email,
                invoice_url: invoiceUrl
              }));
            } catch (error) {
              console.error('❌ Invoice email error:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: error.message }));
            }
          });
        } catch (error) {
          console.error('❌ Invoice email API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Update Invoice Status API endpoint
      if (pathname.match(/^\/api\/invoices\/[^\/]+\/status$/) && req.method === 'PUT') {
        try {
          const invoiceId = pathname.split('/')[3];
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const { status } = JSON.parse(body);
              console.log('📝 Updating invoice status:', invoiceId, 'to', status);

              const updateData = {
                status,
                updated_at: new Date().toISOString()
              };

              // Set dates based on status
              if (status === 'sent') {
                updateData.sent_date = new Date().toISOString();
              }
              if (status === 'paid') {
                updateData.paid_date = new Date().toISOString();
              }

              await sql`
                UPDATE crm_invoices 
                SET 
                  status = ${status},
                  sent_date = ${updateData.sent_date || null},
                  paid_date = ${updateData.paid_date || null},
                  updated_at = ${updateData.updated_at}
                WHERE id = ${invoiceId}
              `;

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Invoice status updated' }));
            } catch (error) {
              console.error('❌ Invoice status update error:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: error.message }));
            }
          });
        } catch (error) {
          console.error('❌ Invoice status API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Delete Invoice API endpoint
      if (pathname.match(/^\/api\/invoices\/[^\/]+$/) && req.method === 'DELETE') {
        try {
          const invoiceId = pathname.split('/')[3];
          console.log('🗑️ Deleting invoice:', invoiceId);

          await sql`DELETE FROM crm_invoices WHERE id = ${invoiceId}`;

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Invoice deleted' }));
        } catch (error) {
          console.error('❌ Invoice deletion error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Add Invoice Payment API endpoint
      if (pathname.match(/^\/api\/invoices\/[^\/]+\/payments$/) && req.method === 'POST') {
        try {
          const invoiceId = pathname.split('/')[3];
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const paymentData = JSON.parse(body);
              console.log('💰 Adding invoice payment:', invoiceId, paymentData);

              await sql`
                INSERT INTO crm_invoice_payments (
                  invoice_id, amount, payment_method, payment_reference, 
                  payment_date, notes, created_at
                ) VALUES (
                  ${invoiceId}, ${paymentData.amount}, ${paymentData.payment_method},
                  ${paymentData.payment_reference || null}, ${paymentData.payment_date},
                  ${paymentData.notes || null}, NOW()
                )
              `;

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Payment added' }));
            } catch (error) {
              console.error('❌ Invoice payment error:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: error.message }));
            }
          });
        } catch (error) {
          console.error('❌ Invoice payment API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // List Invoice Payments API endpoint
      if (pathname.match(/^\/api\/invoices\/[^\/]+\/payments$/) && req.method === 'GET') {
        try {
          const invoiceId = pathname.split('/')[3];
          const rows = await sql`
            SELECT id, invoice_id, amount, payment_method, payment_reference,
                   payment_date, notes, created_at
            FROM crm_invoice_payments
            WHERE invoice_id = ${invoiceId}
            ORDER BY payment_date DESC, created_at DESC
          `;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(rows));
        } catch (error) {
          console.error('❌ List invoice payments error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Delete Invoice Payment API endpoint
      if (pathname.match(/^\/api\/invoices\/[^\/]+\/payments\/[^\/]+$/) && req.method === 'DELETE') {
        try {
          const parts = pathname.split('/');
          const invoiceId = parts[3];
          const paymentId = parts[5];
          const result = await sql`
            DELETE FROM crm_invoice_payments
            WHERE id = ${paymentId} AND invoice_id = ${invoiceId}
            RETURNING id
          `;
          if (result.length === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Payment not found' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, deleted: paymentId }));
        } catch (error) {
          console.error('❌ Delete invoice payment error:', error.message);
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
              
              // Handle different data formats (items array or direct data)
              let lineItems = [];
              const itemsArray = Array.isArray(checkoutData.items) ? checkoutData.items : [];
              const looksLikeDelivery = (it) => (((it?.sku || '') + ' ' + (it?.description || '')).toLowerCase().includes('delivery') || (it?.sku || '').toLowerCase().startsWith('delivery-') || (it?.description || '').toLowerCase().includes('liefer'));
              const hasDelivery = itemsArray.some(looksLikeDelivery);
              if (hasDelivery) {
                const addr = (checkoutData?.voucherData?.shippingAddress) || {};
                const missing = !addr.address1 || !addr.city || !addr.zip || !addr.country;
                if (missing) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, error: 'Shipping address required for postal delivery' }));
                  return;
                }
              }
              if (itemsArray.length) {
                // Always use dynamic price_data and apply client-provided discount (in cents) to eligible items
                const totalClientDiscount = Math.max(0, Math.round(Number(checkoutData.discount || 0)));
                let remainingDiscount = totalClientDiscount;
                
                lineItems = itemsArray.map(item => {
                  const name = item.name || 'Photography Service';
                  const qty = Math.max(1, Number(item.quantity || 1));
                  const baseCents = Math.max(0, Math.round(Number(item.price || 0)));
                  let unitCents = baseCents;

                  // Apply discount only to non-delivery items
                  if (remainingDiscount > 0 && !looksLikeDelivery(item)) {
                    // For VCWIEN, enforce that item unit price is exactly 9500 cents
                    const isVCWIEN = String(checkoutData.appliedVoucherCode || '').toUpperCase() === 'VCWIEN';
                    const vcwienEligible = baseCents === 9500;
                    if (isVCWIEN && !vcwienEligible) {
                      // Skip discount for this item
                    } else {
                      const reduceBy = Math.min(unitCents, remainingDiscount);
                      unitCents = Math.max(0, unitCents - reduceBy);
                      remainingDiscount -= reduceBy;
                    }
                  }

                  return ({
                    price_data: {
                      currency: 'eur',
                      product_data: {
                        name,
                        description: item.description || 'Professional photography service',
                      },
                      unit_amount: unitCents,
                    },
                    quantity: qty,
                  });
                });
              } else {
                // Legacy format
                lineItems = [{
                  price_data: {
                    currency: checkoutData.currency || 'eur',
                    product_data: {
                      name: checkoutData.product_name || 'Photography Service',
                      description: checkoutData.description || 'Professional photography service',
                    },
                    unit_amount: Math.max(0, Math.round((checkoutData.amount || 0) * 100) - Math.max(0, Math.round(Number(checkoutData.discount || 0)))),
                  },
                  quantity: 1,
                }];
              }
              
              // Check if we have Stripe configured
              if (!stripe) {
                console.log('⚠️ Stripe not configured, redirecting to demo mode');
                console.log('💡 To enable live payments, set STRIPE_SECRET_KEY in Heroku Config Vars');
                
                const mockSessionId = `mock_session_${Date.now()}`;
                const baseUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:3001';
                const mockSuccessUrl = `${baseUrl}/checkout/mock-success?session_id=${mockSessionId}`;
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  success: true,
                  sessionId: mockSessionId,
                  url: mockSuccessUrl,
                  message: 'Demo checkout - Configure Stripe for live payments',
                  isDemo: true
                }));
                return;
              }

              // Create real Stripe checkout session
              console.log('💳 Creating LIVE Stripe checkout session...');
              const baseUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:3001';
              
              const isVoucherMode = !!(checkoutData?.voucherData || String(checkoutData?.mode || '').toLowerCase() === 'voucher' || String(checkoutData?.order_type || '').toLowerCase() === 'voucher');
              const successPath = isVoucherMode ? '/voucher/thank-you' : '/checkout/success';
              const sessionParams = {
                payment_method_types: ['card'],
                line_items: lineItems,
                mode: 'payment',
                success_url: `${baseUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${baseUrl}/checkout/cancel`,
                allow_promotion_codes: false,
                metadata: {
                  client_id: checkoutData.client_id || '',
                  invoice_id: checkoutData.invoice_id || '',
                  order_type: checkoutData.order_type || checkoutData.mode || 'photography_service'
                }
              };

              // Add customer email if provided
              if (checkoutData.customerEmail) {
                sessionParams.customer_email = checkoutData.customerEmail;
              }

              // Add voucher-specific metadata if present
              if (checkoutData.voucherData) {
                sessionParams.metadata.voucher_mode = 'true';
                sessionParams.metadata.voucher_design = checkoutData.voucherData.selectedDesign?.name || 'custom';
                sessionParams.metadata.delivery_option = checkoutData.voucherData.deliveryOption?.name || 'email';
                if (checkoutData.voucherData.personalMessage) {
                  sessionParams.metadata.personal_message = checkoutData.voucherData.personalMessage.substring(0, 500); // Stripe metadata limit
                }
                if (checkoutData.voucherData.shippingAddress) {
                  try {
                    sessionParams.metadata.shipping_address = JSON.stringify(checkoutData.voucherData.shippingAddress).substring(0, 500);
                  } catch (e) {}
                }
                // Extra metadata to support post-payment voucher PDF
                try {
                  const firstItem = (Array.isArray(itemsArray) && itemsArray[0]) ? itemsArray[0] : null;
                  const deriveSku = (name) => {
                    const n = String(name || '').toLowerCase();
                    if (n.includes('schwangerschaft') && n.includes('basic')) return 'Maternity-Basic';
                    if (n.includes('family') && n.includes('basic')) return 'Family-Basic';
                    if (n.includes('newborn') && n.includes('basic')) return 'Newborn-Basic';
                    if (n.includes('schwangerschaft') && n.includes('premium')) return 'Maternity-Premium';
                    if (n.includes('family') && n.includes('premium')) return 'Family-Premium';
                    if (n.includes('newborn') && n.includes('premium')) return 'Newborn-Premium';
                    if (n.includes('schwangerschaft') && n.includes('deluxe')) return 'Maternity-Deluxe';
                    if (n.includes('family') && n.includes('deluxe')) return 'Family-Deluxe';
                    if (n.includes('newborn') && n.includes('deluxe')) return 'Newborn-Deluxe';
                    return undefined;
                  };
                  const sku = firstItem?.sku || deriveSku(firstItem?.name || firstItem?.title);
                  if (sku) sessionParams.metadata.sku = String(sku);
                  // Generate a simple voucher id when not provided
                  const vid = checkoutData.voucherData.voucherId || `V-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
                  sessionParams.metadata.voucher_id = String(vid);
                  const recipientName = checkoutData.voucherData.recipientName || checkoutData.voucherData.name;
                  const fromName = checkoutData.voucherData.fromName || checkoutData.voucherData.sender;
                  const message = checkoutData.voucherData.message || checkoutData.voucherData.personalMessage;
                  if (recipientName) sessionParams.metadata.recipient_name = String(recipientName).substring(0, 120);
                  if (fromName) sessionParams.metadata.from_name = String(fromName).substring(0, 120);
                  if (message) sessionParams.metadata.message = String(message).substring(0, 500);
                  if (checkoutData.voucherData.expiryDate) sessionParams.metadata.expiry_date = String(checkoutData.voucherData.expiryDate);
                } catch {}
              }

              // Collect shipping address in Stripe Checkout when a delivery line is present
              if (hasDelivery) {
                sessionParams.shipping_address_collection = {
                  allowed_countries: ['AT', 'DE', 'CH', 'IT', 'FR', 'NL']
                };
              }

              const session = await stripe.checkout.sessions.create(sessionParams);

              console.log('✅ Stripe session created:', session.id);
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                sessionId: session.id,
                url: session.url,
                message: 'Stripe checkout session created successfully'
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

      // ========= Voucher PDF Generation (no webhook required) =========
      if (pathname === '/voucher/pdf' && req.method === 'GET') {
        try {
          const sessionId = String(parsedUrl.query?.session_id || '').trim();
          if (!sessionId) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing session_id');
            return;
          }

          if (!stripe) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Stripe not configured');
            return;
          }

          let session = await stripe.checkout.sessions.retrieve(sessionId);
          let isPaid = session?.payment_status === 'paid';
          if (!isPaid) {
            session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
            isPaid = session?.payment_status === 'paid';
          }

          if (!isPaid) {
            res.writeHead(402, { 'Content-Type': 'text/plain' });
            res.end('Payment not completed yet');
            return;
          }

          const m = session.metadata || {};
          const sku = m.sku || 'Voucher';
          const name = m.recipient_name || 'Beschenkte/r';
          const from = m.from_name || '—';
          const note = m.message || m.personal_message || '';
          const vId = m.voucher_id || session.id;
          const exp = m.expiry_date || '12 Monate ab Kaufdatum';
          const titleMap = {
            'Maternity-Basic': 'Schwangerschafts Fotoshooting - Basic',
            'Family-Basic': 'Family Fotoshooting - Basic',
            'Newborn-Basic': 'Newborn Fotoshooting - Basic',
            'Maternity-Premium': 'Schwangerschafts Fotoshooting - Premium',
            'Family-Premium': 'Family Fotoshooting - Premium',
            'Newborn-Premium': 'Newborn Fotoshooting - Premium',
            'Maternity-Deluxe': 'Schwangerschafts Fotoshooting - Deluxe',
            'Family-Deluxe': 'Family Fotoshooting - Deluxe',
            'Newborn-Deluxe': 'Newborn Fotoshooting - Deluxe',
          };
          const title = titleMap[String(sku)] || 'Gutschein';

          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${vId}.pdf"`);

          const doc = new PDFDocument({ size: 'A4', margin: 50 });
          doc.pipe(res);

          try {
            const logoUrl = process.env.VOUCHER_LOGO_URL || 'https://i.postimg.cc/j55DNmbh/frontend-logo.jpg';
            const resp = await fetch(logoUrl);
            if (resp && resp.ok) {
              const arr = await resp.arrayBuffer();
              const imgBuf = Buffer.from(arr);
              doc.image(imgBuf, 50, 50, { fit: [160, 60] });
            }
          } catch {}
          doc.moveDown(2);

          doc.fontSize(22).text('New Age Fotografie', { align: 'right' });
          doc.moveDown(0.5);
          doc.fontSize(12).text('www.newagefotografie.com', { align: 'right' });
          doc.moveDown(1.5);

          doc.fontSize(26).text('PERSONALISIERTER GUTSCHEIN', { align: 'left' });
          doc.moveDown(0.5);

          doc.fontSize(18).text(title);
          doc.moveDown(0.5);
          doc.fontSize(12).text(`Gutschein-ID: ${vId}`);
          doc.text(`SKU: ${sku}`);
          doc.text(`Empfänger/in: ${name}`);
          doc.text(`Von: ${from}`);
          doc.text(`Gültig bis: ${exp}`);
          doc.moveDown(0.5);

          if (note) {
            doc.fontSize(12).text('Nachricht:', { underline: true });
            doc.moveDown(0.2);
            doc.fontSize(12).text(note, { align: 'left' });
            doc.moveDown(0.8);
          }

          doc.moveDown(1);
          doc.fontSize(10).text(
            'Einlösbar für die oben genannte Leistung in unserem Studio. ' +
            'Nicht bar auszahlbar. Termin nach Verfügbarkeit. Bitte zur Einlösung Gutschein-ID angeben.',
            { align: 'justify' }
          );

          doc.moveDown(2);
          const paid = ((session.amount_total || 0) / 100).toFixed(2) + ' ' + String(session.currency || 'EUR').toUpperCase();
          const createdMs = (session.created ? Number(session.created) * 1000 : Date.now());
          doc.fontSize(10).text(`Belegt durch Zahlung: ${paid} | Datum: ${new Date(createdMs).toLocaleDateString('de-AT')}`);
          doc.end();
        } catch (e) {
          console.error('Voucher PDF generation failed', e);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Failed to generate PDF');
        }
        return;
      }

      // Voucher PDF Preview: generate a sample personalized voucher PDF without requiring payment
      if (pathname === '/voucher/pdf/preview' && req.method === 'GET') {
        try {
          const qp = parsedUrl.query || {};
          const sku = String(qp.sku || 'Family-Basic');
          const name = String(qp.name || qp.recipient_name || 'Anna Muster');
          const from = String(qp.from || qp.from_name || 'Max Beispiel');
          const note = String(qp.message || 'Alles Gute zum besonderen Anlass!');
          const vId = String(qp.voucher_id || 'VCHR-PREVIEW-1234');
          const exp = String(qp.expiry_date || '12 Monate ab Kaufdatum');
          const amount = parseFloat(String(qp.amount || '95.00'));
          const currency = String(qp.currency || 'EUR');

          const titleMap = {
            'Maternity-Basic': 'Schwangerschafts Fotoshooting - Basic',
            'Family-Basic': 'Family Fotoshooting - Basic',
            'Newborn-Basic': 'Newborn Fotoshooting - Basic',
            'Maternity-Premium': 'Schwangerschafts Fotoshooting - Premium',
            'Family-Premium': 'Family Fotoshooting - Premium',
            'Newborn-Premium': 'Newborn Fotoshooting - Premium',
            'Maternity-Deluxe': 'Schwangerschafts Fotoshooting - Deluxe',
            'Family-Deluxe': 'Family Fotoshooting - Deluxe',
            'Newborn-Deluxe': 'Newborn Fotoshooting - Deluxe',
          };
          const title = titleMap[sku] || 'Gutschein';

          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${vId}.pdf"`);

          const doc = new PDFDocument({ size: 'A4', margin: 50 });
          doc.pipe(res);

          try {
            const logoUrl = process.env.VOUCHER_LOGO_URL || 'https://i.postimg.cc/j55DNmbh/frontend-logo.jpg';
            const resp = await fetch(logoUrl);
            if (resp && resp.ok) {
              const arr = await resp.arrayBuffer();
              const imgBuf = Buffer.from(arr);
              doc.image(imgBuf, 50, 50, { fit: [160, 60] });
            }
          } catch {}
          doc.moveDown(2);

          doc.fontSize(22).text('New Age Fotografie', { align: 'right' });
          doc.moveDown(0.5);
          doc.fontSize(12).text('www.newagefotografie.com', { align: 'right' });
          doc.moveDown(1.5);

          doc.fontSize(26).text('PERSONALISIERTER GUTSCHEIN', { align: 'left' });
          doc.moveDown(0.5);

          doc.fontSize(18).text(title);
          doc.moveDown(0.5);
          doc.fontSize(12).text(`Gutschein-ID: ${vId}`);
          doc.text(`SKU: ${sku}`);
          doc.text(`Empfänger/in: ${name}`);
          doc.text(`Von: ${from}`);
          doc.text(`Gültig bis: ${exp}`);
          doc.moveDown(0.5);

          if (note) {
            doc.fontSize(12).text('Nachricht:', { underline: true });
            doc.moveDown(0.2);
            doc.fontSize(12).text(note, { align: 'left' });
            doc.moveDown(0.8);
          }

          doc.moveDown(1);
          doc.fontSize(10).text(
            'Einlösbar für die oben genannte Leistung in unserem Studio. ' +
            'Nicht bar auszahlbar. Termin nach Verfügbarkeit. Bitte zur Einlösung Gutschein-ID angeben.',
            { align: 'justify' }
          );

          doc.moveDown(2);
          const paid = amount.toFixed(2) + ' ' + currency.toUpperCase();
          doc.fontSize(10).text(`Vorschau der Zahlung: ${paid} | Datum: ${new Date().toLocaleDateString('de-AT')}`);
          doc.end();
        } catch (e) {
          console.error('Voucher PDF preview failed', e);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Failed to generate preview PDF');
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

  // New coupon validation endpoint aligned with client CartPage and EnhancedCheckout
  if (pathname === '/api/vouchers/coupons/validate' && req.method === 'POST') {
        try {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const { code, orderAmount, items } = JSON.parse(body || '{}');
              if (!code) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ valid: false, error: 'Coupon code required' }));
                return;
              }

              const coupon = findCouponByCode(code);
              if (!coupon || !isCouponActive(coupon)) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ valid: false, error: 'Ungültiger Gutscheincode' }));
                return;
              }

              const cartItems = Array.isArray(items) ? items : [];
              let applicableSubtotal = 0;
              let hasExact95 = false;
              for (const it of cartItems) {
                const sku = it?.sku || it?.productSlug || it?.name;
                const qty = Number(it?.quantity || 1);
                const price = Number(it?.price || 0);
                if (allowsSku(coupon, sku)) {
                  applicableSubtotal += price * qty;
                  // Track if any eligible line has unit price exactly €95.00
                  if (Math.abs(price - 95) < 1e-6) {
                    hasExact95 = true;
                  }
                }
              }

              // Special constraint: VCWIEN only valid for €95 vouchers
              if (String(code).toUpperCase() === 'VCWIEN' && !hasExact95) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ valid: false, error: 'Gutschein nur für 95€ Gutscheine gültig' }));
                return;
              }

              if (applicableSubtotal <= 0) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ valid: false, error: 'Gutschein nicht für diese Produkte' }));
                return;
              }

              let discountAmount = 0;
              let discountType = 'fixed';
              if (String(coupon.type).toLowerCase() === 'percentage') {
                discountType = 'percentage';
                const pct = Number(coupon.percent || coupon.value || 0);
                discountAmount = Math.max(0, (applicableSubtotal * pct) / 100);
              } else {
                const fixed = Number(coupon.amount || coupon.value || 0);
                discountAmount = Math.min(applicableSubtotal, Math.max(0, fixed));
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                valid: true,
                coupon: {
                  code: String(coupon.code).toUpperCase(),
                  discountType,
                  discountValue: discountType === 'percentage' ? (coupon.percent || coupon.value || 0) : (coupon.amount || coupon.value || 0),
                  discountAmount: discountAmount.toFixed(2),
                  applicableProducts: coupon.allowedSkus || ['*']
                }
              }));
            } catch (err) {
              console.error('❌ Coupon validation error:', err.message);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ valid: false, error: 'Ungültiger Gutscheincode' }));
            }
          });
        } catch (error) {
          console.error('❌ Coupon validation API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Admin endpoints (API-prefixed variants)
      if (pathname === '/api/__admin/refresh-coupons' && req.method === 'POST') {
        try {
          const token = req.headers['x-admin-token'] || req.headers['x_admin_token'];
          const expected = process.env.ADMIN_TOKEN || process.env.SECRET_ADMIN_TOKEN;
          if (!expected || token !== expected) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
            return;
          }
          const count = forceRefreshCoupons();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, reloaded: count }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false }));
        }
        return;
      }
      if (pathname === '/api/__admin/coupons/status' && req.method === 'GET') {
        const token = req.headers['x-admin-token'] || req.headers['x_admin_token'];
        const expected = process.env.ADMIN_TOKEN || process.env.SECRET_ADMIN_TOKEN;
        if (!expected || token !== expected) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
          return;
        }
        const coupons = getCoupons();
        const now = Date.now();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          count: coupons.length,
          coupons: coupons.map(c => ({ code: c.code, type: c.type, percent: c.percent, amount: c.amount, allowedSkus: c.allowedSkus })),
          cache: { expiresAt: __couponCache.expiresAt, millisRemaining: Math.max(0, __couponCache.expiresAt - now), ttlSeconds: COUPON_TTL_SECONDS },
          source: process.env.COUPONS_JSON ? 'env' : 'fallback'
        }));
        return;
      }

      // Surveys/Questionnaires API endpoints
      if (pathname.startsWith('/api/surveys')) {
        try {
          if (pathname === '/api/surveys' && req.method === 'GET') {
            try {
              if (sql) {
                const rows = await sql`SELECT * FROM surveys ORDER BY created_at DESC`;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(rows));
                return;
              }
            } catch (dbErr) {
              console.error('❌ Error fetching surveys from DB:', dbErr.message || dbErr);
            }

            // Fallback to mock surveys
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
            req.on('end', async () => {
              try {
                const surveyData = JSON.parse(body);
                console.log('📋 Creating new survey:', surveyData.title);

                if (sql) {
                  // Persist survey to DB
                  const pagesJson = JSON.stringify(surveyData.pages || []);
                  const settingsJson = JSON.stringify(surveyData.settings || {});
                  const result = await sql`
                    INSERT INTO surveys (title, description, status, pages, settings, created_by, created_at, updated_at)
                    VALUES (
                      ${surveyData.title}, ${surveyData.description || null}, ${surveyData.status || 'active'},
                      ${pagesJson}, ${settingsJson}, ${surveyData.created_by || null}, NOW(), NOW()
                    ) RETURNING *
                  `;
                  const created = result[0] || result;
                  res.writeHead(201, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, survey: created }));
                } else {
                  const newSurvey = {
                    id: Date.now().toString(),
                    ...surveyData,
                    created_at: new Date().toISOString(),
                    responses_count: 0
                  };
                  res.writeHead(201, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, survey: newSurvey }));
                }
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
            req.on('end', async () => {
              try {
                const updates = JSON.parse(body);
                console.log('📝 Updating survey:', surveyId);

                if (sql) {
                  const pagesJson = JSON.stringify(updates.pages || []);
                  const settingsJson = JSON.stringify(updates.settings || {});
                  const result = await sql`
                    UPDATE surveys SET title = ${updates.title}, description = ${updates.description || null}, pages = ${pagesJson}, settings = ${settingsJson}, updated_at = NOW()
                    WHERE id = ${surveyId}
                    RETURNING *
                  `;
                  const updatedSurvey = result[0] || result;
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, survey: updatedSurvey }));
                } else {
                  const updatedSurvey = {
                    id: surveyId,
                    ...updates,
                    updated_at: new Date().toISOString()
                  };
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, survey: updatedSurvey }));
                }
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
            
            // Server-side duplication could be implemented here. For now return mock duplicate
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

      // Gallery API endpoints
      if (pathname.startsWith('/api/galleries')) {
        try {
          await handleGalleryAPI(req, res, pathname, parsedUrl.query);
        } catch (error) {
          console.error('❌ Gallery API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }
    }
      // End of /api/* handling

    // Admin endpoint to force-refresh coupon cache after env changes
    if (pathname === '/__admin/refresh-coupons' && req.method === 'POST') {
      try {
        const token = req.headers['x-admin-token'] || req.headers['x_admin_token'];
        const expected = process.env.ADMIN_TOKEN || process.env.SECRET_ADMIN_TOKEN;
        if (!expected || token !== expected) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
          return;
        }
        const count = forceRefreshCoupons();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, reloaded: count }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
      }
      return;
    }

    // Admin diagnostics: list coupons and cache state
    if (pathname === '/__admin/coupons/status' && req.method === 'GET') {
      const token = req.headers['x-admin-token'] || req.headers['x_admin_token'];
      const expected = process.env.ADMIN_TOKEN || process.env.SECRET_ADMIN_TOKEN;
      if (!expected || token !== expected) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
        return;
      }
      const coupons = getCoupons();
      const now = Date.now();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        count: coupons.length,
        coupons: coupons.map(c => ({ code: c.code, type: c.type, percent: c.percent, amount: c.amount, allowedSkus: c.allowedSkus })),
        cache: { expiresAt: __couponCache.expiresAt, millisRemaining: Math.max(0, __couponCache.expiresAt - now), ttlSeconds: COUPON_TTL_SECONDS },
        source: process.env.COUPONS_JSON ? 'env' : 'fallback'
      }));
      return;
    }
    
    // Compatibility shim for legacy CRM invoice routes
    if (pathname.startsWith('/api/crm/invoices')) {
      try {
        // Map legacy paths to new endpoints
        // GET /api/crm/invoices -> /api/invoices
        if (pathname === '/api/crm/invoices' && req.method === 'GET') {
          req.url = req.url.replace('/api/crm/invoices', '/api/invoices');
          parsedUrl.pathname = '/api/invoices';
        }
        // POST /api/crm/invoices -> /api/invoices
        if (pathname === '/api/crm/invoices' && req.method === 'POST') {
          req.url = req.url.replace('/api/crm/invoices', '/api/invoices');
          parsedUrl.pathname = '/api/invoices';
        }
        // DELETE or PATCH specific invoice maps to DELETE /api/invoices/:id or PUT /api/invoices/:id/status
        const legacyIdMatch = pathname.match(/^\/api\/crm\/invoices\/([^\/]+)$/);
        if (legacyIdMatch && req.method === 'DELETE') {
          req.url = req.url.replace('/api/crm/invoices/', '/api/invoices/');
          parsedUrl.pathname = req.url;
        }
        if (legacyIdMatch && req.method === 'PATCH') {
          // Transform PATCH body { status } into PUT /status
          const invoiceId = legacyIdMatch[1];
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const data = body ? JSON.parse(body) : {};
              const newReq = { status: data.status, paid_date: data.paid_date };
              // Re-dispatch to status endpoint
              const statusPath = `/api/invoices/${invoiceId}/status`;
              // Manually handle here to avoid re-entering routing
              try {
                const status = String(newReq.status || '').toLowerCase();
                await sql`
                  UPDATE crm_invoices 
                  SET 
                    status = ${status},
                    sent_date = ${status === 'sent' ? new Date().toISOString() : null},
                    paid_date = ${status === 'paid' ? (newReq.paid_date || new Date().toISOString()) : null},
                    updated_at = NOW()
                  WHERE id = ${invoiceId}
                `;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Invoice status updated' }));
              } catch (err) {
                console.error('❌ Legacy PATCH status error:', err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            } catch (parseErr) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Invalid request body' }));
            }
          });
          return;
        }
        // GET /api/crm/invoices/:id/pdf -> /api/invoices/:id/download
        const pdfMatch = pathname.match(/^\/api\/crm\/invoices\/([^\/]+)\/pdf$/);
        if (pdfMatch && req.method === 'GET') {
          const newPath = `/api/invoices/${pdfMatch[1]}/download`;
          req.url = newPath;
          parsedUrl.pathname = newPath;
        }
        // POST /api/crm/invoices/:id/email -> /api/invoices/send-email
        const emailMatch = pathname.match(/^\/api\/crm\/invoices\/([^\/]+)\/email$/);
        if (emailMatch && req.method === 'POST') {
          // We will read body, append invoice_id field, and call handler directly
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const data = body ? JSON.parse(body) : {};
              const payload = {
                invoice_id: emailMatch[1],
                email_address: data.to || data.email || data.email_address,
                subject: data.subject,
                message: data.message
              };
              // Call the same logic as /api/invoices/send-email by simulating a new request
              req.method = 'POST';
              req.url = '/api/invoices/send-email';
              // Reconstruct a minimal flow by writing to the existing handler block
              // Delegate by re-entering the server function is complex; instead, duplicate minimal logic here
              try {
                const invoices = await sql`
                  SELECT i.*, c.name as client_name, c.email as client_email, c.firstname, c.lastname
                  FROM crm_invoices i
                  LEFT JOIN crm_clients c ON i.client_id = c.id
                  WHERE i.id = ${payload.invoice_id}
                `;
                if (invoices.length === 0) {
                  res.writeHead(404, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Invoice not found' }));
                  return;
                }
                const invoice = invoices[0];
                const baseUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:3001';
                const invoiceUrl = `${baseUrl}/invoice/public/${payload.invoice_id}`;
                const items = await sql`
                  SELECT * FROM crm_invoice_items WHERE invoice_id = ${payload.invoice_id} ORDER BY sort_order
                `;
                const clientName = invoice.firstname && invoice.lastname ? `${invoice.firstname} ${invoice.lastname}` : invoice.client_name || 'Kunde';
                const emailSubject = payload.subject || `Rechnung ${invoice.invoice_number} - New Age Fotografie`;
                const itemsHtml = items.map(item => `
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">€${parseFloat(item.unit_price).toFixed(2)}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">€${(parseFloat(item.quantity) * parseFloat(item.unit_price)).toFixed(2)}</td>
                  </tr>`).join('');
                const emailHtml = `<!DOCTYPE html><html><body><div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">${clientName}<br/>Rechnung ${invoice.invoice_number}<br/>${invoiceUrl}<table style="width:100%; border-collapse: collapse;">${itemsHtml}</table></div></body></html>`;
                const nodemailer = require('nodemailer');
                const transporter = nodemailer.createTransport({
                  host: 'mail.easyname.com',
                  port: 587,
                  secure: false,
                  auth: { user: process.env.SMTP_USER || 'hallo@newagefotografie.com', pass: process.env.SMTP_PASS || 'your-email-password' },
                  tls: { rejectUnauthorized: false }
                });
                await transporter.sendMail({
                  from: 'hallo@newagefotografie.com',
                  to: payload.email_address || invoice.client_email,
                  subject: emailSubject,
                  html: emailHtml
                });
                await sql`
                  UPDATE crm_invoices SET status = 'sent', sent_date = NOW(), updated_at = NOW() WHERE id = ${payload.invoice_id}
                `;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
              } catch (err) {
                console.error('❌ Legacy email send error:', err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            } catch (e) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Invalid request body' }));
            }
          });
          return;
        }
        // Payments: GET/POST/DELETE legacy paths -> new ones
        const legacyPaymentsBase = pathname.match(/^\/api\/crm\/invoices\/([^\/]+)\/payments$/);
        if (legacyPaymentsBase && (req.method === 'GET' || req.method === 'POST')) {
          const invoiceId = legacyPaymentsBase[1];
          // delegate directly to the implemented handlers above by mapping path
          req.url = `/api/invoices/${invoiceId}/payments`;
          parsedUrl.pathname = req.url;
        }
        const legacyPaymentDelete = pathname.match(/^\/api\/crm\/invoices\/([^\/]+)\/payments\/([^\/]+)$/);
        if (legacyPaymentDelete && req.method === 'DELETE') {
          const invoiceId = legacyPaymentDelete[1];
          const paymentId = legacyPaymentDelete[2];
          req.url = `/api/invoices/${invoiceId}/payments/${paymentId}`;
          parsedUrl.pathname = req.url;
        }
      } catch (shimErr) {
        console.error('❌ CRM invoices compatibility shim error:', shimErr.message);
      }
      // Continue processing after URL rewrite; fall through
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

console.log('ℹ️ Reaching server.listen with port =', port);
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


