// PRODUCTION SERVER WITH NEON DATABASE INTEGRATION
// Load environment variables
require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const os = require('os');
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

// Cached invoice column detection to avoid per-request information_schema scans
let __invoiceColsCache = { set: null, ts: 0 };
async function getInvoiceColumnSet() {
  try {
    if (!sql) return new Set();
    const now = Date.now();
    if (!__invoiceColsCache.set || (now - __invoiceColsCache.ts) > 60_000) {
      const rows = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'invoices'`;
      __invoiceColsCache = { set: new Set(rows.map(r => r.column_name)), ts: now };
    }
    return __invoiceColsCache.set;
  } catch (_) {
    return new Set();
  }
}

// ===== Leads schema bootstrap (compatible with existing table) =====
let __leadsSchemaEnsured = false;
async function ensureLeadsSchema() {
  if (__leadsSchemaEnsured) return;
  if (!sql) return; // will be re-attempted on first use when SQL ready
  try {
    // Ensure pgcrypto for gen_random_uuid
    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
    // Create table if missing (keeps existing if present)
    await sql`
      CREATE TABLE IF NOT EXISTS leads (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        form_type text,
        full_name text,
        email text,
        phone text,
        preferred_date date,
        message text,
        consent boolean DEFAULT false,
        source_path text,
        user_agent text,
        ip inet,
        meta jsonb DEFAULT '{}'::jsonb,
        status text DEFAULT 'new',
        created_at timestamptz DEFAULT now()
      )
    `;
    // Add/align columns on existing installs (no-throw if already present)
    const alters = [
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS form_type text`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS full_name text`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS email text`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone text`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferred_date date`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS message text`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent boolean DEFAULT false`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_path text`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS user_agent text`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS ip inet`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS status text DEFAULT 'new'`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()`
    ];
    for (const stmt of alters) {
      await sql(stmt).catch(() => {});
    }
    // Helpful indexes (idempotent)
    await sql`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS uniq_newsletter_email ON leads (lower(email)) WHERE form_type = 'newsletter'`;
    __leadsSchemaEnsured = true;
    console.log('✅ Leads schema ensured');
  } catch (e) {
    console.warn('⚠️ ensureLeadsSchema failed:', e.message);
  }
}

// Helper: insert a lead into unified leads table and send notifications
async function insertLeadAndNotify({ req, formType, fullName = null, email, phone = null, preferredDate = null, message = null, consent = false, sourcePath = null }) {
  if (!sql) throw new Error('Database not available');
  await ensureLeadsSchema();
  // Capture client details
  let ip = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';
  if (Array.isArray(ip)) ip = ip[0] || '';
  if (typeof ip === 'string' && ip.includes(',')) ip = ip.split(',')[0].trim();
  const userAgent = String(req?.headers?.['user-agent'] || '');
  const src = typeof sourcePath === 'string' && sourcePath ? sourcePath : (req?.headers?.referer || '');

  const rows = await sql`
    INSERT INTO leads(form_type, full_name, email, phone, preferred_date, message, consent, source_path, user_agent, ip, meta, status)
    VALUES (${formType}, ${fullName}, ${email}, ${phone}, ${preferredDate}, ${message}, ${!!consent}, ${src}, ${userAgent}, ${ip}, ${JSON.stringify({})}, 'new')
    RETURNING id
  `;

  // Best-effort emails (studio and optional acknowledgement)
  try {
    const nodemailer = require('nodemailer');
    const tx = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      tls: { rejectUnauthorized: false }
    });
    const studioTo = (process.env.STUDIO_NOTIFY_EMAIL || 'hallo@newagefotografie.com').trim();
    if (studioTo) {
      const lines = [
        `Form: ${formType}`,
        `Name: ${fullName || '-'}`,
        `Email: ${email}`,
        `Phone: ${phone || '-'}`,
        `Preferred Date: ${preferredDate || '-'}`,
        `Message: ${message || '-'}`,
        `Consent: ${consent ? 'yes' : 'no'}`,
        `Source: ${src}`,
        `IP: ${ip}`,
      ];
      await tx.sendMail({
        from: process.env.FROM_EMAIL || process.env.SMTP_USER || 'hallo@newagefotografie.com',
        to: studioTo,
        subject: '📥 New Lead received',
        text: lines.join('\n')
      });
    }
    if (email && (formType === 'waitlist' || formType === 'contact')) {
      await tx.sendMail({
        from: process.env.FROM_EMAIL || process.env.SMTP_USER || 'hallo@newagefotografie.com',
        to: email,
        subject: 'Thanks — we’ve received your message ✅',
        html: `<div style="font-family:system-ui;line-height:1.55"><p>Hi ${fullName || ''}</p><p>Thanks for reaching out to New Age Fotografie. We’ll get back to you shortly.</p><p>– New Age Fotografie</p></div>`
      });
    }
  } catch (mailErr) {
    console.warn('⚠️ Lead email notification failed:', mailErr.message);
  }

  return { id: rows[0]?.id };
}

// ===== CRM Clients schema ensure =====
let __crmClientsEnsured = false;
async function ensureCrmClientsSchema() {
  if (__crmClientsEnsured) return;
  if (!sql) return;
  try {
    await sql`
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
    `;
    __crmClientsEnsured = true;
  } catch (e) {
    console.warn('ensureCrmClientsSchema failed:', e.message);
  }
}

// Invoices schema: tables and extension for UUIDs
async function ensureInvoiceSchema() {
  try {
    if (!sql) return;
    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
    await sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id uuid primary key default gen_random_uuid(),
        invoice_no text unique not null,
        client_id uuid,
        client_name text not null,
        client_email text,
        client_phone text,
        issue_date date not null,
        due_date date not null,
        currency text not null default 'EUR',
        subtotal numeric(12,2) not null default 0,
        tax numeric(12,2) not null default 0,
        total numeric(12,2) not null default 0,
        status text not null default 'draft',
        public_id text unique not null,
        notes text,
        meta jsonb default '{}'::jsonb,
        created_at timestamptz default now()
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id uuid primary key default gen_random_uuid(),
        invoice_id uuid not null references invoices(id) on delete cascade,
        description text not null,
        quantity numeric(10,2) not null default 1,
        unit_price numeric(12,2) not null default 0,
        line_total numeric(12,2) not null default 0
      )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`;
  } catch (e) {
    console.warn('ensureInvoiceSchema failed:', e.message);
  }
}

// Invoices utilities
function makePublicId() {
  return crypto.randomBytes(6).toString('hex');
}
function makeInvoiceNo(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const n = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
  return `INV-${y}${m}-${n}`;
}
function appUrl(req) {
  return process.env.APP_URL || (req?.headers?.host ? `https://${req.headers.host}` : '');
}

// Vonage helpers
function generateVonageJwt() {
  const appId = process.env.VONAGE_APPLICATION_ID;
  const pk = process.env.VONAGE_PRIVATE_KEY; // PEM content
  if (!appId || !pk) return null;
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const iat = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ application_id: appId, iat, exp: iat + 300, jti: crypto.randomBytes(8).toString('hex') })).toString('base64url');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(pk, 'base64url');
  return `${header}.${payload}.${signature}`;
}

// ===== Coupon Engine (env-driven with VCWIEN fallback) =====
const COUPON_TTL_SECONDS = parseInt(process.env.COUPON_RELOAD_SECONDS || '60', 10);
let __couponCache = { coupons: null, expiresAt: 0 };
let __dbCoupons = [];

async function refreshDbCoupons() {
  try {
    if (!sql) return;
    await sql`
      CREATE TABLE IF NOT EXISTS discount_coupons (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        code TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL DEFAULT 'percentage',
        percent NUMERIC,
        amount NUMERIC,
        allowed_skus JSONB DEFAULT '[]',
        starts_at TIMESTAMPTZ,
        ends_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    // Backfill columns on older databases
    await sql`ALTER TABLE discount_coupons ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'percentage'`;
    await sql`ALTER TABLE discount_coupons ADD COLUMN IF NOT EXISTS percent NUMERIC`;
    await sql`ALTER TABLE discount_coupons ADD COLUMN IF NOT EXISTS amount NUMERIC`;
    await sql`ALTER TABLE discount_coupons ADD COLUMN IF NOT EXISTS allowed_skus JSONB DEFAULT '[]'`;
    await sql`ALTER TABLE discount_coupons ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ`;
    await sql`ALTER TABLE discount_coupons ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ`;
    await sql`ALTER TABLE discount_coupons ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`;
    await sql`ALTER TABLE discount_coupons ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;
    await sql`ALTER TABLE discount_coupons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`;
    const rows = await sql`SELECT id, code, type, percent, amount, allowed_skus, starts_at, ends_at, is_active FROM discount_coupons WHERE is_active = true`;
    __dbCoupons = rows.map(r => ({
      id: r.id,
      code: r.code,
      type: r.type,
      percent: r.percent ? Number(r.percent) : undefined,
      amount: r.amount ? Number(r.amount) : undefined,
      allowedSkus: Array.isArray(r.allowed_skus) ? r.allowed_skus : [],
      startDate: r.starts_at,
      endDate: r.ends_at
    }));
    console.log(`✅ Loaded ${__dbCoupons.length} coupons from DB`);
  } catch (e) {
    console.warn('⚠️ Could not load coupons from DB:', e.message);
  }
}

const DEFAULT_FALLBACK_COUPONS = [
  {
    code: 'VCWIEN',
    type: 'percentage',
    percent: 50,
    allowedSkus: [
      'maternity-basic', 'family-basic', 'newborn-basic'
    ]
  },
  {
    code: 'CL50',
    type: 'percentage',
    percent: 50,
    allowedSkus: [
      'maternity-basic', 'family-basic', 'newborn-basic'
    ]
  },
  {
    code: 'WL50',
    type: 'percentage',
    percent: 50,
    allowedSkus: [
      'maternity-basic', 'family-basic', 'newborn-basic'
    ]
  },
  {
    code: 'VW50',
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
  const merged = [
    ...(__dbCoupons || []),
    ...((fromEnv && fromEnv.length ? fromEnv : DEFAULT_FALLBACK_COUPONS) || [])
  ];
  const coupons = merged;
  __couponCache = {
    coupons,
    expiresAt: now + COUPON_TTL_SECONDS * 1000,
  };
  return coupons;
}
// Preload DB coupons on boot (non-blocking)
refreshDbCoupons();

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

// Helper: which coupon codes must only apply to exact €95 voucher items
function get95OnlyCodes() {
  const env = (process.env.COUPONS_95_ONLY || '').trim();
  const base = ['VCWIEN', 'CL50', 'WL50', 'VW50'];
  if (!env) return new Set(base);
  // Allow comma-separated list in env to override/extend
  const fromEnv = env.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  return new Set(fromEnv.length ? fromEnv : base);
}
function is95OnlyCode(code) {
  if (!code) return false;
  return get95OnlyCodes().has(String(code).toUpperCase());
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

// ===== Vouchers schema bootstrap =====
let __vouchersSchemaEnsured = false;
async function ensureVouchersSchema() {
  if (__vouchersSchemaEnsured) return;
  if (!sql) return;
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
    await sql`
      CREATE TABLE IF NOT EXISTS vouchers (
        id uuid primary key default gen_random_uuid(),
        session_id text unique,
        payment_intent_id text,
        email text,
        amount integer,
        currency text,
        delivery text check (delivery in ('pdf','post')) not null,
        variant text,
        personalization jsonb not null,
        preview_url text,
        shipping jsonb,
        status text not null default 'pending',
        pdf_url text,
        created_at timestamptz default now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status)`;
    __vouchersSchemaEnsured = true;
    console.log('✅ Vouchers schema ensured');
  } catch (e) {
    console.warn('⚠️ ensureVouchersSchema failed:', e.message);
  }
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

// Map DB voucher product row (snake_case) to camelCase expected by admin UI
function mapVoucherProduct(row) {
  if (!row) return row;
  return {
    id: row.id,
    name: row.name,
    description: row.description || null,
    price: row.price != null ? Number(row.price) : null,
    originalPrice: row.original_price != null ? Number(row.original_price) : null,
    category: row.category || null,
    type: row.type || 'voucher',
    sku: row.sku || null,
    isActive: row.is_active !== false,
    features: Array.isArray(row.features) ? row.features : [],
    termsAndConditions: row.terms_and_conditions || null,
    validityPeriod: row.validity_period != null ? Number(row.validity_period) : null,
    displayOrder: row.display_order != null ? Number(row.display_order) : 0,
    imageUrl: row.image_url || null,
    thumbnailUrl: row.thumbnail_url || null,
    metadata: row.metadata || {},
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function requireAdminToken(req, res) {
  const token = req.headers['x-admin-token'] || req.headers['x_admin_token'];
  const expected = process.env.ADMIN_TOKEN || process.env.SECRET_ADMIN_TOKEN;
  if (!expected || token !== expected) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return false;
  }
  return true;
}

// ===== Voucher Sales schema bootstrap (minimal for admin listing) =====
let __voucherSalesEnsured = false;
async function ensureVoucherSalesSchema() {
  if (__voucherSalesEnsured) return;
  if (!sql) return;
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
    await sql`
      CREATE TABLE IF NOT EXISTS voucher_sales (
        id uuid primary key default gen_random_uuid(),
        product_id uuid,
        purchaser_name text not null,
        purchaser_email text not null,
        purchaser_phone text,
        voucher_code text unique not null,
        original_amount numeric(12,2) not null,
        discount_amount numeric(12,2) default 0,
        final_amount numeric(12,2) not null,
        currency text default 'EUR',
        coupon_id uuid,
        coupon_code text,
        payment_intent_id text,
        payment_status text default 'pending',
        valid_from timestamptz default now(),
        valid_until timestamptz,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      )`;
    __voucherSalesEnsured = true;
    console.log('✅ Voucher sales schema ensured');
  } catch (e) {
    console.warn('⚠️ ensureVoucherSalesSchema failed:', e.message);
  }
}

// ===== Email Campaigns schema bootstrap =====
let __emailCampaignsEnsured = false;
async function ensureEmailCampaignsSchema() {
  if (__emailCampaignsEnsured) return;
  if (!sql) return;
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
    await sql`
      CREATE TABLE IF NOT EXISTS email_campaigns (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        type text not null default 'broadcast',
        subject text not null,
        preview_text text,
        content text,
        design_template text,
        sender_name text,
        sender_email text,
        reply_to text,
        status text not null default 'draft',
        scheduled_at timestamptz,
        sent_at timestamptz,
        segments jsonb default '[]'::jsonb,
        tags_include jsonb default '[]'::jsonb,
        tags_exclude jsonb default '[]'::jsonb,
        ab_test jsonb default '{}'::jsonb,
        send_time_optimization boolean default false,
        frequency_capping jsonb default '{}'::jsonb,
        deliverability_settings jsonb default '{}'::jsonb,
        compliance_settings jsonb default '{}'::jsonb,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      )`;

    // Lightweight supporting tables for UI browsing (optional)
    await sql`
      CREATE TABLE IF NOT EXISTS email_templates (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        category text not null default 'custom',
        thumbnail text,
        html_content text,
        css_content text,
        json_design jsonb default '{}'::jsonb,
        variables jsonb default '[]'::jsonb,
        responsive boolean default true,
        dark_mode_support boolean default true,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS email_segments (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        description text,
        type text not null default 'dynamic',
        conditions jsonb default '[]'::jsonb,
        subscriber_count integer default 0,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      )`;
    __emailCampaignsEnsured = true;
    console.log('✅ Email campaigns schema ensured');
  } catch (e) {
    console.warn('⚠️ ensureEmailCampaignsSchema failed:', e.message);
  }
}

// ===== Helper: base URL, email sender, PDF generator =====
function getBaseUrl() {
  const base = (process.env.APP_BASE_URL || process.env.APP_URL || '').trim();
  if (base) return base.replace(/\/$/, '');
  const p = process.env.PORT || 3001;
  return `http://localhost:${p}`;
}

async function sendEmailSimple(to, subject, text, html) {
  try {
    const nodemailer = require('nodemailer');
    const useJson = (process.env.EMAIL_TRANSPORT === 'json') || (!process.env.SMTP_HOST && !process.env.SMTP_USER);
    const transporter = useJson
      ? nodemailer.createTransport({ jsonTransport: true })
      : nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: (process.env.SMTP_SECURE || 'false') === 'true',
          auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
          tls: { rejectUnauthorized: false }
        });
    const from = process.env.FROM_EMAIL || process.env.SMTP_USER || 'no-reply@newagefotografie.com';
    const info = await transporter.sendMail({ from, to, subject, text, html });
    if (useJson) {
      try { console.log('📧 [json email]', JSON.stringify(info.message, null, 2)); } catch {}
    }
  } catch (e) {
    console.warn('sendEmailSimple failed:', e.message);
  }
}

function base64UrlEncode(s) {
  return Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64UrlDecodeToString(token) {
  const b64 = String(token).replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 2 ? '==' : b64.length % 4 === 3 ? '=' : '';
  return Buffer.from(b64 + pad, 'base64').toString('utf8');
}

async function generateVoucherPdf(sessionId, personalization = {}, previewUrl = null) {
  const tmpDir = path.join(os.tmpdir(), 'vouchers');
  await fs.promises.mkdir(tmpDir, { recursive: true });
  const filePath = path.join(tmpDir, `voucher-${sessionId}.pdf`);
  const vId = personalization.voucher_id || sessionId;
  const sku = personalization.sku || personalization.variant || 'Voucher';
  const name = personalization.recipient_name || personalization.name || '—';
  const from = personalization.from_name || personalization.from || '—';
  const note = personalization.message || personalization.personal_message || '';
  const exp = personalization.expiry_date || '12 Monate ab Kaufdatum';

  await new Promise(async (resolve, reject) => {
    try {
      const out = fs.createWriteStream(filePath);
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      doc.pipe(out);

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

      // Render front-end preview image if provided to match personalization exactly
      if (previewUrl) {
        try {
          const respPrev = await fetch(String(previewUrl));
          if (respPrev && respPrev.ok) {
            const arrPrev = await respPrev.arrayBuffer();
            const imgPrev = Buffer.from(arrPrev);
            // Fit the preview image nicely on the page
            const maxWidth = 500;
            doc.image(imgPrev, { fit: [maxWidth, 300], align: 'center' });
            doc.moveDown(0.5);
          }
        } catch {}
      }

      doc.fontSize(18).text(String(sku));
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
        doc.fontSize(12).text(String(note), { align: 'left' });
        doc.moveDown(0.8);
      }

      doc.moveDown(1);
      doc.fontSize(10).text(
        'Einlösbar für die oben genannte Leistung in unserem Studio. ' +
        'Nicht bar auszahlbar. Termin nach Verfügbarkeit. Bitte zur Einlösung Gutschein-ID angeben.',
        { align: 'justify' }
      );

      doc.end();
      out.on('finish', resolve);
      out.on('error', reject);
    } catch (e) { reject(e); }
  });

  const base = getBaseUrl();
  const token = base64UrlEncode(filePath);
  return `${base}/api/vouchers/download?token=${token}`;
}

function signDownload(sessionId, expires) {
  const secret = process.env.DOWNLOAD_TOKEN_SECRET || (process.env.STRIPE_WEBHOOK_SECRET ? String(process.env.STRIPE_WEBHOOK_SECRET).slice(0, 32) : 'fallback-secret');
  const h = crypto.createHmac('sha256', secret);
  h.update(`${sessionId}.${expires}`);
  return h.digest('hex');
}

function buildSecureDownloadUrl(sessionId, ttlSeconds = 3600) {
  const base = getBaseUrl();
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = signDownload(sessionId, expires);
  return `${base}/api/vouchers/secure-download?session_id=${encodeURIComponent(sessionId)}&expires=${expires}&sig=${sig}`;
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
        client_id, 
        session_id,
        search_term,
        is_public,
        limit = '20'
      } = query || {};

      let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      if (Array.isArray(ip)) ip = ip[0] || '';
      if (typeof ip === 'string' && ip.includes(',')) ip = ip.split(',')[0].trim();

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

  // Ensure required gallery tables exist (idempotent, protects after migrations)
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
    await sql`
      CREATE TABLE IF NOT EXISTS galleries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        slug TEXT UNIQUE,
        description TEXT,
        cover_image TEXT,
        is_public BOOLEAN DEFAULT true,
        is_password_protected BOOLEAN DEFAULT false,
        password TEXT,
        client_id TEXT,
        created_by TEXT,
        sort_order INTEGER DEFAULT 0,
        download_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS gallery_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gallery_id TEXT NOT NULL,
        filename TEXT,
        url TEXT,
        title TEXT,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS gallery_access_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gallery_id TEXT NOT NULL,
        visitor_email TEXT,
        visitor_name TEXT,
        ip_address INET,
        user_agent TEXT,
        accessed_at TIMESTAMPTZ DEFAULT NOW()
      )`;
  } catch (e) {
    console.warn('⚠️ Gallery schema ensure failed:', e.message);
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
                ${is_public}, ${is_password_protected}, ${password}, NULL)
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
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-token, X-Admin-Token');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Health check (enhanced with DB + SMTP)
  if (pathname === '/healthz') {
    try {
      const { db } = require('./lib/db');
      const { assertMailer } = require('./lib/mailer');
      let dbOk = null;
      try {
        const r = await db('select now() as ts');
        dbOk = r?.rows?.[0]?.ts || true;
      } catch (e) {
        dbOk = false;
      }
      let smtpOk = true;
      try { await assertMailer(); } catch { smtpOk = false; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, db: dbOk, smtp: smtpOk ? 'ok' : 'fail' }));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, db: 'unknown', smtp: 'unknown' }));
    }
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

  // Enhanced Public server-rendered questionnaire page
  if (pathname.startsWith('/q/') && req.method === 'GET') {
    const { handlePublicQuestionnairePage } = require('./handlers/public-questionnaire-handler');
    const token = pathname.split('/')[2];
    await handlePublicQuestionnairePage(req, res, token);
    return;
  }

  
  // API endpoints
  if (pathname.startsWith('/api/')) {
    // Email AI helpers: subject lines
    if (pathname === '/api/email/ai/subject-lines' && req.method === 'POST') {
      try {
        let raw = ''; req.on('data', c => raw += c); await new Promise(r => req.on('end', r));
        const body = raw ? JSON.parse(raw) : {};
        const content = String(body.content || '');
        const audience = String(body.audience || 'subscribers');
        const base = content.replace(/<[^>]+>/g, ' ').slice(0, 120).trim();
        const suggestions = [
          `Neu: ${base || 'Exklusive Angebote für Sie'}`.slice(0, 60),
          `Für ${audience}: ${base || 'Jetzt entdecken'}`.slice(0, 60),
          `Nur kurz: ${base || 'Sichern Sie sich Ihren Platz'}`.slice(0, 60)
        ];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ suggestions }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to generate suggestions' }));
      }
      return;
    }

    // Email AI helpers: predict engagement
    if (pathname.startsWith('/api/email/ai/predict-engagement/') && req.method === 'GET') {
      try {
        const parts = pathname.split('/');
        const id = parts[parts.length - 1];
        // Basic deterministic mock
        const hash = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
        const predicted_open_rate = 0.25 + ((hash % 15) / 100);
        const predicted_click_rate = 0.03 + ((hash % 7) / 100);
        const confidence = 0.6 + ((hash % 20) / 100);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ predicted_open_rate, predicted_click_rate, confidence }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Prediction failed' }));
      }
      return;
    }

    // Email resources: templates and segments (public read)
    if (pathname === '/api/email/templates' && req.method === 'GET') {
      try {
        const samples = [
          { name: 'Newsletter Classic', category: 'newsletter', html_content: '<h1>Hallo!</h1><p>Neuigkeiten aus dem Studio…</p>' },
          { name: 'Promo Angebot', category: 'promotional', html_content: '<h2>Spar-Aktion</h2><p>Jetzt Termin sichern.</p>' },
          { name: 'Event Einladung', category: 'event', html_content: '<h2>Einladung</h2><p>Wir freuen uns auf Sie!</p>' },
          { name: 'Willkommen', category: 'welcome', html_content: '<h2>Willkommen</h2><p>Schön, dass Sie da sind.</p>' }
        ];
        let rows = [];
        if (sql) {
          try {
            await ensureEmailCampaignsSchema();
            rows = await sql`SELECT id, name, category, thumbnail, html_content, css_content, json_design, variables, responsive, dark_mode_support, created_at, updated_at FROM email_templates ORDER BY created_at DESC LIMIT 12`;
          } catch { rows = []; }
        }
        const out = (rows && rows.length ? rows : samples.map((s, i) => ({ id: `sample-${i+1}`, thumbnail: '', css_content: '', json_design: {}, variables: [], responsive: true, dark_mode_support: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...s })));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(out));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to load templates' }));
      }
      return;
    }

    if (pathname === '/api/email/segments' && req.method === 'GET') {
      try {
        const samples = [
          { id: 'recent-subscribers', name: 'Recent Subscribers', description: 'Signed up in last 30 days', type: 'dynamic', conditions: [], subscriber_count: 850, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), growth_rate: 0.08, engagement_rate: 0.31 },
          { id: 'high-engagers', name: 'High Engagers', description: 'Opened or clicked in last 60 days', type: 'dynamic', conditions: [], subscriber_count: 540, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), growth_rate: 0.05, engagement_rate: 0.52 },
          { id: 'vienna', name: 'Vienna Area', description: 'Location in Vienna', type: 'dynamic', conditions: [], subscriber_count: 420, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), growth_rate: 0.03, engagement_rate: 0.29 }
        ];
        let rows = [];
        if (sql) {
          try {
            await ensureEmailCampaignsSchema();
            rows = await sql`SELECT id, name, description, type, conditions, subscriber_count, created_at, updated_at FROM email_segments ORDER BY created_at DESC LIMIT 50`;
          } catch { rows = []; }
        }
        const out = (rows && rows.length ? rows : samples);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(out));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to load segments' }));
      }
      return;
    }

    // Admin: campaigns CRUD
    if (pathname === '/api/admin/email/campaigns' && req.method === 'GET') {
      if (!requireAdminToken(req, res)) return;
      try {
        if (!sql) throw new Error('Database not available');
        await ensureEmailCampaignsSchema();
        const rows = await sql`SELECT * FROM email_campaigns ORDER BY created_at DESC`;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(rows));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    if (pathname === '/api/admin/email/campaigns' && req.method === 'POST') {
      if (!requireAdminToken(req, res)) return;
      try {
        if (!sql) throw new Error('Database not available');
        await ensureEmailCampaignsSchema();
        let raw = ''; req.on('data', c => raw += c); await new Promise(r => req.on('end', r));
        const b = raw ? JSON.parse(raw) : {};
        const ins = await sql`
          INSERT INTO email_campaigns (
            name, type, subject, preview_text, content, design_template,
            sender_name, sender_email, reply_to, status, scheduled_at, sent_at,
            segments, tags_include, tags_exclude, ab_test,
            send_time_optimization, frequency_capping, deliverability_settings, compliance_settings
          ) VALUES (
            ${b.name || ''}, ${b.type || 'broadcast'}, ${b.subject || ''}, ${b.preview_text || ''}, ${b.content || ''}, ${b.design_template || null},
            ${b.sender_name || null}, ${b.sender_email || null}, ${b.reply_to || null}, ${b.status || 'draft'}, ${b.scheduled_at || null}, ${b.sent_at || null},
            ${JSON.stringify(b.segments || [])}::jsonb, ${JSON.stringify(b.tags_include || [])}::jsonb, ${JSON.stringify(b.tags_exclude || [])}::jsonb, ${JSON.stringify(b.ab_test || {})}::jsonb,
            ${!!b.send_time_optimization}, ${JSON.stringify(b.frequency_capping || {})}::jsonb, ${JSON.stringify(b.deliverability_settings || {})}::jsonb, ${JSON.stringify(b.compliance_settings || {})}::jsonb
          ) RETURNING *`;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(ins[0]));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    if (pathname.startsWith('/api/admin/email/campaigns/') && req.method === 'PUT') {
      if (!requireAdminToken(req, res)) return;
      try {
        if (!sql) throw new Error('Database not available');
        await ensureEmailCampaignsSchema();
        const id = pathname.split('/').pop();
        let raw = ''; req.on('data', c => raw += c); await new Promise(r => req.on('end', r));
        const b = raw ? JSON.parse(raw) : {};
        const upd = await sql`
          UPDATE email_campaigns SET
            name = COALESCE(${b.name}, name),
            type = COALESCE(${b.type}, type),
            subject = COALESCE(${b.subject}, subject),
            preview_text = COALESCE(${b.preview_text}, preview_text),
            content = COALESCE(${b.content}, content),
            design_template = COALESCE(${b.design_template}, design_template),
            sender_name = COALESCE(${b.sender_name}, sender_name),
            sender_email = COALESCE(${b.sender_email}, sender_email),
            reply_to = COALESCE(${b.reply_to}, reply_to),
            status = COALESCE(${b.status}, status),
            scheduled_at = COALESCE(${b.scheduled_at}, scheduled_at),
            sent_at = COALESCE(${b.sent_at}, sent_at),
            segments = COALESCE(${b.segments ? JSON.stringify(b.segments) : null}::jsonb, segments),
            tags_include = COALESCE(${b.tags_include ? JSON.stringify(b.tags_include) : null}::jsonb, tags_include),
            tags_exclude = COALESCE(${b.tags_exclude ? JSON.stringify(b.tags_exclude) : null}::jsonb, tags_exclude),
            ab_test = COALESCE(${b.ab_test ? JSON.stringify(b.ab_test) : null}::jsonb, ab_test),
            send_time_optimization = COALESCE(${typeof b.send_time_optimization === 'boolean' ? b.send_time_optimization : null}, send_time_optimization),
            frequency_capping = COALESCE(${b.frequency_capping ? JSON.stringify(b.frequency_capping) : null}::jsonb, frequency_capping),
            deliverability_settings = COALESCE(${b.deliverability_settings ? JSON.stringify(b.deliverability_settings) : null}::jsonb, deliverability_settings),
            compliance_settings = COALESCE(${b.compliance_settings ? JSON.stringify(b.compliance_settings) : null}::jsonb, compliance_settings),
            updated_at = now()
          WHERE id = ${id}
          RETURNING *`;
        if (!upd.length) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(upd[0]));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    // Send or test-send a campaign
    if (pathname === '/api/email/campaigns/send' && req.method === 'POST') {
      try {
        if (!sql) throw new Error('Database not available');
        await ensureEmailCampaignsSchema();
        let raw = ''; req.on('data', c => raw += c); await new Promise(r => req.on('end', r));
        const b = raw ? JSON.parse(raw) : {};
        const id = b.campaign_id;
        if (!id) throw new Error('campaign_id required');
        const rows = await sql`SELECT * FROM email_campaigns WHERE id = ${id}`;
        if (!rows.length) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Campaign not found' }));
          return;
        }
        const camp = rows[0];
        const subj = camp.subject || 'Campaign';
        const html = camp.content || '<p>No content</p>';
        const test = !!b.test_send;
        const testEmails = Array.isArray(b.test_emails) ? b.test_emails.filter(Boolean) : [];
        if (test) {
          const toList = (testEmails.length ? testEmails : [(process.env.STUDIO_NOTIFY_EMAIL || 'hallo@newagefotografie.com')]);
          for (const to of toList) {
            await sendEmailSimple(to, `[TEST] ${subj}`, '', html);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, test: true, recipients: toList }));
          return;
        }
        // Non-test: mark as sent and notify studio (placeholder)
        await sql`UPDATE email_campaigns SET status = 'sent', sent_at = now(), updated_at = now() WHERE id = ${id}`;
        const to = (process.env.STUDIO_NOTIFY_EMAIL || 'hallo@newagefotografie.com');
        await sendEmailSimple(to, `[SENT] ${subj}`, '', html);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, sent: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    // Admin debug: ping-db
    if (pathname === '/api/admin/ping-db' && req.method === 'GET') {
      try {
        const { db } = require('./lib/db');
        const r = await db('select current_database() as db, now() as ts');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, info: r.rows?.[0] || null }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
      return;
    }

    // Admin debug: test-email
    if (pathname === '/api/admin/test-email' && req.method === 'POST') {
      try {
        let raw = ''; req.on('data', c => raw += c); await new Promise(r => req.on('end', r));
        const body = raw ? JSON.parse(raw) : {};
        const { mailer } = require('./lib/mailer');
        const { ENV } = require('./lib/env');
        const to = String(body.to || ENV?.SMTP_USER || ENV?.EMAIL_FROM || '').trim();
        const tx = mailer();
        await tx.sendMail({ from: (ENV && (ENV.EMAIL_FROM || ENV.SMTP_USER)) || 'no-reply@newagefotografie.com', to: to || 'hallo@newagefotografie.com', subject: 'New Age Fotografie – SMTP test', text: 'If you received this, your SMTP is working.' });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, to: to || 'default' }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
      return;
    }
    // Simple image upload stub for admin UI (returns placeholder URL)
    if (pathname === '/api/upload/image' && req.method === 'POST') {
      if (!requireAdminToken(req, res)) return;
      try {
        const seed = crypto.randomBytes(6).toString('hex');
        const url = `https://picsum.photos/seed/${seed}/640/480`;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ url }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Image upload failed' }));
      }
      return;
    }

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

    // Enhanced Admin Questionnaire API Endpoints
    if (pathname === '/api/admin/questionnaire-responses' && req.method === 'GET') {
      const { questionnaireHandlers } = require('./api/questionnaire-handlers');
      await questionnaireHandlers.getQuestionnaireResponses(req, res);
      return;
    }
    
    if (pathname === '/api/admin/attach-response-to-client' && req.method === 'POST') {
      const { questionnaireHandlers } = require('./api/questionnaire-handlers');
      await questionnaireHandlers.attachResponseToClient(req, res);
      return;
    }

    // Simple clients search for admin typeahead
    if (pathname === '/api/admin/clients/search' && req.method === 'GET') {
      try {
        const neon = require('@neondatabase/serverless');
        const sql = neon.neon(process.env.DATABASE_URL);
        const url = new URL(req.url, `http://${req.headers.host}`);
        const q = (url.searchParams.get('q') || '').trim();
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 25);
        if (!q) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ clients: [] }));
          return;
        }
        const rows = await sql`
          SELECT id::text as id, client_id, first_name, last_name, email
          FROM crm_clients
          WHERE (first_name ILIKE ${'%' + q + '%'} OR last_name ILIKE ${'%' + q + '%'} OR email ILIKE ${'%' + q + '%'} OR client_id ILIKE ${'%' + q + '%'})
          ORDER BY last_name NULLS LAST, first_name NULLS LAST
          LIMIT ${limit}
        `;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ clients: rows }));
      } catch (e) {
        console.error('clients search error:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'search failed' }));
      }
      return;
    }

    // Helper to normalize phone as SQL expression (digits + default country code)
    const DEFAULT_CC = (process.env.DEFAULT_COUNTRY_CODE || '').replace('+','').trim();
    const phoneKeyExprSQL = () => {
      const cc = DEFAULT_CC;
      const digits = "REGEXP_REPLACE(TRIM(phone), '[^0-9]+', '', 'g')";
      const caseExpr = `(
        CASE
          WHEN ${digits} = '' THEN NULL
          WHEN ${digits} LIKE '00%' THEN SUBSTRING(${digits} FROM 3)
          ${cc ? `WHEN ${digits} LIKE '${cc}%' THEN ${digits}` : ''}
          ${cc ? `WHEN '${cc}' <> '' AND ${digits} LIKE '0%' THEN '${cc}' || SUBSTRING(${digits} FROM 2)` : ''}
          ELSE ${digits}
        END
      )`;
      return caseExpr;
    };

    // ===== Find duplicate clients (by email or phone or both) =====
    if ((pathname === '/api/crm/clients/duplicates' || pathname === '/api/admin/clients/duplicates') && req.method === 'GET') {
      try {
        if (!sql) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Database unavailable' })); return; }
        await ensureCrmClientsSchema();
        const url = new URL(req.url, `http://${req.headers.host}`);
        const byParam = String(url.searchParams.get('by') || 'email').toLowerCase();
        const by = ['phone','email','both'].includes(byParam) ? byParam : 'email';
        const limit = Math.max(1, Math.min(500, parseInt(url.searchParams.get('limit') || '100', 10)));
        const emailExpr = `LOWER(NULLIF(TRIM(email),'') )`;
        const phoneExpr = phoneKeyExprSQL();
        const baseQuery = (expr) => `
          SELECT ${expr} AS dup_key, ARRAY_AGG(id) AS ids, COUNT(*)::int AS count
          FROM crm_clients
          WHERE ${expr} IS NOT NULL
          GROUP BY 1
          HAVING COUNT(*) > 1
          ORDER BY COUNT(*) DESC
          LIMIT $1`;
        let rows = [];
        if (by === 'both') {
          const emailRows = await sql(baseQuery(emailExpr), [limit]);
          const phoneRows = await sql(baseQuery(phoneExpr), [limit]);
          // Tag keys to distinguish types
          rows = [
            ...emailRows.map(r => ({ ...r, dup_key: `email:${r.dup_key}` })),
            ...phoneRows.map(r => ({ ...r, dup_key: `phone:${r.dup_key}` })),
          ];
        } else {
          const expr = by === 'phone' ? phoneExpr : emailExpr;
          rows = await sql(baseQuery(expr), [limit]);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ by, groups: rows }));
      } catch (error) {
        console.error('Error listing duplicate clients:', error?.message || error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to list duplicates' }));
      }
      return;
    }

    // ===== Merge duplicate clients (bulk) =====
    if ((pathname === '/api/crm/clients/merge-duplicates' || pathname === '/api/admin/clients/merge-duplicates') && req.method === 'POST') {
      try {
        const token = req.headers['x-admin-token'] || req.headers['x_admin_token'];
        const expected = process.env.ADMIN_TOKEN || process.env.SECRET_ADMIN_TOKEN;
        if (!expected || token !== expected) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }
        if (!sql) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Database unavailable' })); return; }
        await ensureCrmClientsSchema();
        let raw = '';
        req.on('data', c => raw += c.toString());
        req.on('end', async () => {
          try {
            const body = raw ? JSON.parse(raw) : {};
            const by = String(body.by || 'email').toLowerCase() === 'phone' ? 'phone' : 'email';
            const dryRun = body.dryRun !== false; // default true
            const limit = Math.max(1, Math.min(1000, Number(body.limit ?? 200)));
            const strategy = String(body.strategy || 'keep-oldest').toLowerCase();
            const keepOldest = strategy !== 'keep-newest';
            const keyExpr = by === 'phone' ? `NULLIF(TRIM(phone),'')` : `LOWER(NULLIF(TRIM(email),'') )`;
            const dupQuery = `
              SELECT ${keyExpr} AS dup_key, ARRAY_AGG(id) AS ids, COUNT(*)::int AS count
              FROM crm_clients
              WHERE ${keyExpr} IS NOT NULL
              GROUP BY 1
              HAVING COUNT(*) > 1
              ORDER BY COUNT(*) DESC
              LIMIT $1`;
            const groups = await sql(dupQuery, [limit]);

            let totalMerged = 0;
            const previews = [];

            for (const g of groups) {
              const ids = g.ids || [];
              if (!ids || ids.length < 2) continue;
              const rows = await sql(
                `SELECT id, created_at, updated_at, first_name, last_name, email, phone, address, city, state, zip, country
                 FROM crm_clients WHERE id = ANY($1)`,
                [ids]
              );
              if (!rows || rows.length < 2) continue;
              rows.sort((a, b) => {
                const ta = new Date(a.created_at || a.updated_at || 0).getTime();
                const tb = new Date(b.created_at || b.updated_at || 0).getTime();
                return keepOldest ? (ta - tb) : (tb - ta);
              });
              const primary = rows[0];
              const duplicates = rows.slice(1);
              const dupIds = duplicates.map(r => r.id);
              previews.push({ key: g.dup_key, keep: primary.id, remove: dupIds });
              totalMerged += dupIds.length;
              if (dryRun) continue;

              // For each duplicate, re-link references then delete dup
              for (const d of duplicates) {
                const dupId = d.id;
                // Relink references best-effort
                await sql(`UPDATE invoices SET client_id = $1 WHERE client_id = $2`, [primary.id, dupId]).catch(()=>{});
                await sql(`UPDATE crm_messages SET client_id = $1 WHERE client_id = $2`, [primary.id, dupId]).catch(()=>{});
                await sql(`UPDATE galleries SET client_id = $1 WHERE client_id = $2`, [primary.id, dupId]).catch(()=>{});
                await sql(`UPDATE digital_files SET client_id = $1 WHERE client_id = $2`, [primary.id, dupId]).catch(()=>{});

                // Fill missing primary fields from duplicate when blank
                await sql(
                  `UPDATE crm_clients AS c SET
                     email = COALESCE(NULLIF(c.email,''), NULLIF($2,'')),
                     phone = COALESCE(NULLIF(c.phone,''), NULLIF($3,'')),
                     address = COALESCE(NULLIF(c.address,''), NULLIF($4,'')),
                     city = COALESCE(NULLIF(c.city,''), NULLIF($5,'')),
                     state = COALESCE(NULLIF(c.state,''), NULLIF($6,'')),
                     zip = COALESCE(NULLIF(c.zip,''), NULLIF($7,'')),
                     country = COALESCE(NULLIF(c.country,''), NULLIF($8,'')),
                     updated_at = NOW()
                   WHERE c.id = $1`,
                  [primaryId, d.email, d.phone, d.address, d.city, d.state, d.zip, d.country]
                ).catch(()=>{});

                await sql(`DELETE FROM crm_clients WHERE id = $1`, [dupId]);
              }
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, dryRun, by, groups: groups.length, totalMerged, preview: previews.slice(0, 50) }));
          } catch (e) {
            console.error('merge-duplicates error:', e.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to merge duplicates' }));
          }
        });
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to merge duplicates' }));
      }
      return;
    }

    // ===== Merge suggestions (read-only) =====
    if ((pathname === '/api/crm/clients/merge-suggestions' || pathname === '/api/admin/clients/merge-suggestions') && req.method === 'GET') {
      try {
        if (!sql) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Database unavailable' })); return; }
        await ensureCrmClientsSchema();
        const url = new URL(req.url, `http://${req.headers.host}`);
        const byParam = String(url.searchParams.get('by') || 'email').toLowerCase();
        const mode = ['phone','email','both'].includes(byParam) ? byParam : 'email';
        const strategy = String(url.searchParams.get('strategy') || 'keep-oldest').toLowerCase();
        const keepOldest = strategy !== 'keep-newest';
        const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') ?? '100')));
        const emailExpr = `LOWER(NULLIF(TRIM(email),'') )`;
        const phoneExpr = phoneKeyExprSQL();
        const dupQuery = (expr) => `
          SELECT ${expr} AS dup_key, ARRAY_AGG(id) AS ids, COUNT(*)::int AS count
          FROM crm_clients
          WHERE ${expr} IS NOT NULL
          GROUP BY 1
          HAVING COUNT(*) > 1
          ORDER BY COUNT(*) DESC
          LIMIT $1`;
        let groups = [];
        if (mode === 'both') {
          const emailGroups = await sql(dupQuery(emailExpr), [limit]);
          const phoneGroups = await sql(dupQuery(phoneExpr), [limit]);
          groups = [
            ...emailGroups.map(g => ({ ...g, __type: 'email' })),
            ...phoneGroups.map(g => ({ ...g, __type: 'phone' })),
          ];
        } else {
          const expr = mode === 'phone' ? phoneExpr : emailExpr;
          groups = await sql(dupQuery(expr), [limit]);
        }
        const suggestions = [];
        for (const g of groups) {
          const ids = g.ids || [];
          if (!ids || ids.length < 2) continue;
          const rows = await sql(
            `SELECT id, created_at, updated_at, first_name, last_name, email, phone, address, city, state, zip, country
             FROM crm_clients WHERE id = ANY($1)`,
            [ids]
          );
          if (!rows || rows.length < 2) continue;
          rows.sort((a, b) => {
            const ta = new Date(a.created_at || a.updated_at || 0).getTime();
            const tb = new Date(b.created_at || b.updated_at || 0).getTime();
            return keepOldest ? (ta - tb) : (tb - ta);
          });
          const primary = rows[0];
          const duplicates = rows.slice(1);
          suggestions.push({ key: g.dup_key, primary, duplicates, type: g.__type || mode });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, by: mode, strategy, count: suggestions.length, suggestions }));
      } catch (error) {
        console.error('merge-suggestions error:', error?.message || error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to build merge suggestions' }));
      }
      return;
    }

    // ===== Execute a targeted merge decision from wizard =====
    if ((pathname === '/api/crm/clients/merge-execute' || pathname === '/api/admin/clients/merge-execute') && req.method === 'POST') {
      try {
        const token = req.headers['x-admin-token'] || req.headers['x_admin_token'];
        const expected = process.env.ADMIN_TOKEN || process.env.SECRET_ADMIN_TOKEN;
        if (!expected || token !== expected) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }
        if (!sql) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Database unavailable' })); return; }
        await ensureCrmClientsSchema();
        let raw = '';
        req.on('data', c => raw += c.toString());
        req.on('end', async () => {
          try {
            const body = raw ? JSON.parse(raw) : {};
            const primaryId = body.primaryId;
            const duplicateIds = Array.isArray(body.duplicateIds) ? body.duplicateIds : [];
            if (!primaryId || duplicateIds.length === 0) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'primaryId and duplicateIds[] required' })); return; }

            // validate primary exists
            const prim = await sql(`SELECT id, phone, address, city, state, zip, country FROM crm_clients WHERE id = $1`, [primaryId]);
            if (!prim || prim.length === 0) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Primary client not found' })); return; }

            let merged = 0;
            for (const dupId of duplicateIds) {
              if (dupId === primaryId) continue;
              const dup = await sql(`SELECT id, phone, address, city, state, zip, country FROM crm_clients WHERE id = $1`, [dupId]);
              if (!dup || dup.length === 0) continue;
              const d = dup[0];
              await sql(`UPDATE invoices SET client_id = $1 WHERE client_id = $2`, [primaryId, dupId]).catch(()=>{});
              await sql(`UPDATE crm_messages SET client_id = $1 WHERE client_id = $2`, [primaryId, dupId]).catch(()=>{});
              await sql(`UPDATE galleries SET client_id = $1 WHERE client_id = $2`, [primaryId, dupId]).catch(()=>{});
              await sql(`UPDATE digital_files SET client_id = $1 WHERE client_id = $2`, [primaryId, dupId]).catch(()=>{});

              await sql(
                `UPDATE crm_clients AS c SET
                   email = COALESCE(NULLIF(c.email,''), NULLIF($2,'')),
                   phone = COALESCE(NULLIF(c.phone,''), NULLIF($3,'')),
                   address = COALESCE(NULLIF(c.address,''), NULLIF($4,'')),
                   city = COALESCE(NULLIF(c.city,''), NULLIF($5,'')),
                   state = COALESCE(NULLIF(c.state,''), NULLIF($6,'')),
                   zip = COALESCE(NULLIF(c.zip,''), NULLIF($7,'')),
                   country = COALESCE(NULLIF(c.country,''), NULLIF($8,'')),
                   updated_at = NOW()
                 WHERE c.id = $1`,
                [primaryId, d.email, d.phone, d.address, d.city, d.state, d.zip, d.country]
              ).catch(()=>{});
              await sql(`DELETE FROM crm_clients WHERE id = $1`, [dupId]);
              merged++;
            }
            const updatedPrimary = await sql(`SELECT * FROM crm_clients WHERE id = $1`, [primaryId]);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, merged, primaryId, primary: updatedPrimary?.[0] }));
          } catch (e) {
            console.error('merge-execute error:', e.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to execute merge' }));
          }
        });
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to execute merge' }));
      }
      return;
    }

    // ===== Execute batch merges from wizard =====
    if ((pathname === '/api/crm/clients/merge-execute-batch' || pathname === '/api/admin/clients/merge-execute-batch') && req.method === 'POST') {
      try {
        const token = req.headers['x-admin-token'] || req.headers['x_admin_token'];
        const expected = process.env.ADMIN_TOKEN || process.env.SECRET_ADMIN_TOKEN;
        if (!expected || token !== expected) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }
        if (!sql) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Database unavailable' })); return; }
        await ensureCrmClientsSchema();
        let raw = '';
        req.on('data', c => raw += c.toString());
        req.on('end', async () => {
          try {
            const body = raw ? JSON.parse(raw) : {};
            const merges = Array.isArray(body.merges) ? body.merges : [];
            const results = [];
            for (const m of merges) {
              const primaryId = m?.primaryId;
              const duplicateIds = Array.isArray(m?.duplicateIds) ? m.duplicateIds : [];
              if (!primaryId || duplicateIds.length === 0) { results.push({ primaryId, merged: 0, error: 'invalid' }); continue; }
              try {
                const prim = await sql(`SELECT id, phone, address, city, state, zip, country FROM crm_clients WHERE id = $1`, [primaryId]);
                if (!prim || prim.length === 0) { results.push({ primaryId, merged: 0, error: 'primary not found' }); continue; }
                let merged = 0;
                for (const dupId of duplicateIds) {
                  if (dupId === primaryId) continue;
                  const dup = await sql(`SELECT id, phone, address, city, state, zip, country FROM crm_clients WHERE id = $1`, [dupId]);
                  if (!dup || dup.length === 0) continue;
                  const d = dup[0];
                  await sql(`UPDATE invoices SET client_id = $1 WHERE client_id = $2`, [primaryId, dupId]).catch(()=>{});
                  await sql(`UPDATE crm_messages SET client_id = $1 WHERE client_id = $2`, [primaryId, dupId]).catch(()=>{});
                  await sql(`UPDATE galleries SET client_id = $1 WHERE client_id = $2`, [primaryId, dupId]).catch(()=>{});
                  await sql(`UPDATE digital_files SET client_id = $1 WHERE client_id = $2`, [primaryId, dupId]).catch(()=>{});
                  await sql(
                    `UPDATE crm_clients AS c SET
                       email = COALESCE(NULLIF(c.email,''), NULLIF($2,'')),
                       phone = COALESCE(NULLIF(c.phone,''), NULLIF($3,'')),
                       address = COALESCE(NULLIF(c.address,''), NULLIF($4,'')),
                       city = COALESCE(NULLIF(c.city,''), NULLIF($5,'')),
                       state = COALESCE(NULLIF(c.state,''), NULLIF($6,'')),
                       zip = COALESCE(NULLIF(c.zip,''), NULLIF($7,'')),
                       country = COALESCE(NULLIF(c.country,''), NULLIF($8,'')),
                       updated_at = NOW()
                     WHERE c.id = $1`,
                    [primaryId, d.email, d.phone, d.address, d.city, d.state, d.zip, d.country]
                  ).catch(()=>{});
                  await sql(`DELETE FROM crm_clients WHERE id = $1`, [dupId]);
                  merged++;
                }
                results.push({ primaryId, merged });
              } catch (e) {
                results.push({ primaryId, merged: 0, error: e?.message || 'error' });
              }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, results }));
          } catch (e) {
            console.error('merge-execute-batch error:', e.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to execute batch merge' }));
          }
        });
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to execute batch merge' }));
      }
      return;
    }

    // ===== Invoices APIs =====
    // Create invoice
    if (pathname === '/api/invoices/create' && req.method === 'POST') {
      try {
        if (!sql) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Database unavailable' })); return; }
        await ensureInvoiceSchema();
        let raw = '';
        req.on('data', c => raw += c.toString());
        req.on('end', async () => {
          try {
            const body = raw ? JSON.parse(raw) : {};
            const items = Array.isArray(body.items) ? body.items : [];
            const required = ['client_name','issue_date','due_date'];
            for (const k of required) { if (!body[k]) { res.writeHead(400, {'Content-Type':'application/json'}); res.end(JSON.stringify({ error: `${k} is required` })); return; } }
            if (!items.length) { res.writeHead(400, {'Content-Type':'application/json'}); res.end(JSON.stringify({ error: 'items[] required' })); return; }
            const currency = body.currency || 'EUR';
            let subtotal = 0;
            for (const it of items) {
              const qty = Number(it?.quantity ?? 0);
              const unit = Number(it?.unit_price ?? 0);
              if (!(it?.description) || !(qty > 0) || !(unit >= 0)) { res.writeHead(400, {'Content-Type':'application/json'}); res.end(JSON.stringify({ error: 'Invalid item row' })); return; }
              subtotal += qty * unit;
            }
            const tax = 0; // VAT if needed
            const total = subtotal + tax;
            const invoice_no = makeInvoiceNo();
            const public_id = makePublicId();
            const invRows = await sql`
              INSERT INTO invoices (
                invoice_no, client_id, client_name, client_email, client_phone,
                issue_date, due_date, currency, subtotal, tax, total, status, public_id, notes, meta
              ) VALUES (
                ${invoice_no}, ${body.client_id || null}, ${body.client_name}, ${body.client_email || null}, ${body.client_phone || null},
                ${body.issue_date}, ${body.due_date}, ${currency}, ${subtotal}, ${tax}, ${total}, 'draft', ${public_id}, ${body.notes || null}, ${body.meta || {}}
              )
              RETURNING id
            `;
            const invoice_id = invRows?.[0]?.id;
            if (!invoice_id) { throw new Error('Insert failed'); }
            const valueTuples = items.map(it => sql`(${invoice_id}, ${it.description}, ${Number(it.quantity)}, ${Number(it.unit_price)}, ${Number(it.quantity) * Number(it.unit_price)})`);
            if (valueTuples.length) {
              await sql`INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, line_total) VALUES ${sql.join(valueTuples, sql`,`)}`;
            }
            const link = `${appUrl(req)}/inv/${public_id}`;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, invoice_id, invoice_no, public_id, link, total }));
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok:false, error: e?.message || 'Create failed' }));
          }
        });
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Create failed' }));
      }
      return;
    }

    // List invoices
    if (pathname === '/api/invoices/list' && req.method === 'GET') {
      try {
        if (!sql) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Database unavailable' })); return; }
        await ensureInvoiceSchema();
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const status = String(urlObj.searchParams.get('status') || 'any');
        const q = String(urlObj.searchParams.get('q') || '').toLowerCase();
  // Detect available columns (cached) to avoid referencing non-existent ones
  const cols = await getInvoiceColumnSet();

        const has = (c) => cols.has(c);
  const invoiceNoExpr = has('invoice_no') ? 'invoice_no' : (has('invoice_number') ? 'invoice_number' : "''");
  const clientNameExpr = has('client_name') ? 'client_name' : "''";
  const subtotalExpr = has('subtotal') ? 'subtotal' : (has('subtotal_amount') ? 'subtotal_amount' : '0');
  const taxExpr = has('tax') ? 'tax' : (has('tax_amount') ? 'tax_amount' : '0');
  const totalExpr = has('total') ? 'total' : (has('total_amount') ? 'total_amount' : `(${subtotalExpr} + ${taxExpr})`);
  const currencyExpr = has('currency') ? 'currency' : (has('currency_code') ? 'currency_code' : `'EUR'`);
  const statusExpr = has('status') ? 'status' : `'draft'`;
  const issueDateExpr = has('issue_date') ? 'issue_date' : (has('invoice_date') ? 'invoice_date' : 'created_at::date');
  const dueDateExpr = has('due_date') ? 'due_date' : (has('invoice_due') ? 'invoice_due' : 'created_at::date');
  const publicIdExpr = has('public_id') ? 'public_id' : '(id::text)';
  const orderByExpr = has('created_at') ? 'created_at' : (has('updated_at') ? 'updated_at' : 'id');

        const query = `
          SELECT
            id::text               AS id,
            ${invoiceNoExpr}       AS invoice_no,
            ${clientNameExpr}      AS client_name,
            ${subtotalExpr}        AS subtotal,
            ${taxExpr}             AS tax,
            ${totalExpr}           AS total,
            ${currencyExpr}        AS currency,
            ${statusExpr}          AS status,
            ${issueDateExpr}       AS issue_date,
            ${dueDateExpr}         AS due_date,
            ${publicIdExpr}        AS public_id,
            ${orderByExpr}         AS created_at
          FROM invoices
          ORDER BY ${orderByExpr} DESC
          LIMIT 200`;
        const rows = await sql(query);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ rows }));
      } catch (e) {
        console.error('❌ /api/invoices/list error:', e?.message || e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'List failed' }));
      }
      return;
    }

    // Compatibility: legacy dashboards calling /api/crm/invoices
    if (pathname === '/api/crm/invoices' && req.method === 'GET') {
      try {
        if (!sql) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Database unavailable' })); return; }
        await ensureInvoiceSchema();
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const status = String(urlObj.searchParams.get('status') || 'any');
        const q = String(urlObj.searchParams.get('q') || '').toLowerCase();
  // Detect available columns (cached)
  const cols = await getInvoiceColumnSet();

        const has = (c) => cols.has(c);
  const invoiceNoExpr = has('invoice_no') ? 'invoice_no' : (has('invoice_number') ? 'invoice_number' : "''");
  const clientNameExpr = has('client_name') ? 'client_name' : "''";
  const subtotalExpr = has('subtotal') ? 'subtotal' : (has('subtotal_amount') ? 'subtotal_amount' : '0');
  const taxExpr = has('tax') ? 'tax' : (has('tax_amount') ? 'tax_amount' : '0');
  const totalExpr = has('total') ? 'total' : (has('total_amount') ? 'total_amount' : `(${subtotalExpr} + ${taxExpr})`);
  const currencyExpr = has('currency') ? 'currency' : (has('currency_code') ? 'currency_code' : `'EUR'`);
  const statusExpr = has('status') ? 'status' : `'draft'`;
  const issueDateExpr = has('issue_date') ? 'issue_date' : (has('invoice_date') ? 'invoice_date' : 'created_at::date');
  const dueDateExpr = has('due_date') ? 'due_date' : (has('invoice_due') ? 'invoice_due' : 'created_at::date');
  const publicIdExpr = has('public_id') ? 'public_id' : '(id::text)';
  const orderByExpr = has('created_at') ? 'created_at' : (has('updated_at') ? 'updated_at' : 'id');

        const query = `
          SELECT
            id::text               AS id,
            ${invoiceNoExpr}       AS invoice_no,
            ${clientNameExpr}      AS client_name,
            ${subtotalExpr}        AS subtotal,
            ${taxExpr}             AS tax,
            ${totalExpr}           AS total,
            ${currencyExpr}        AS currency,
            ${statusExpr}          AS status,
            ${issueDateExpr}       AS issue_date,
            ${dueDateExpr}         AS due_date,
            ${publicIdExpr}        AS public_id,
            ${orderByExpr}         AS created_at
          FROM invoices
          ORDER BY ${orderByExpr} DESC
          LIMIT 200`;
        const rows = await sql(query);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        // Return the same shape as /api/invoices/list for consistency
        res.end(JSON.stringify({ rows }));
      } catch (e) {
        console.error('❌ /api/crm/invoices legacy list error:', e?.message || e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'List failed' }));
      }
      return;
    }

    // Send invoice via email
    if (pathname === '/api/invoices/send-email' && req.method === 'POST') {
      try {
        if (!sql) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Database unavailable' })); return; }
        await ensureInvoiceSchema();
        let raw = '';
        req.on('data', c => raw += c.toString());
        req.on('end', async () => {
          try {
            const body = raw ? JSON.parse(raw) : {};
            const invoice_id = body.invoice_id;
            const to = body.to;
            if (!invoice_id || !to) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'invoice_id and to required' })); return; }
            const inv = await sql`SELECT invoice_no, client_name, client_email, total, currency, public_id, issue_date, due_date FROM invoices WHERE id = ${invoice_id}`;
            if (!inv || inv.length === 0) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Invoice not found' })); return; }
            const i = inv[0];
            const link = `${appUrl(req)}/inv/${i.public_id}`;

            const nodemailer = require('nodemailer');
            const tx = (process.env.EMAIL_TRANSPORT === 'json')
              ? nodemailer.createTransport({ jsonTransport: true })
              : nodemailer.createTransport({
                  host: process.env.SMTP_HOST,
                  port: Number(process.env.SMTP_PORT || 587),
                  secure: String(process.env.SMTP_SECURE || 'false') === 'true',
                  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
                });
            await tx.sendMail({
              from: process.env.EMAIL_FROM || process.env.FROM_EMAIL || 'no-reply@example.com',
              to,
              subject: `Invoice ${i.invoice_no} from New Age Fotografie`,
              html: `
                <div style="font-family:system-ui;line-height:1.55">
                  <p>Hi ${i.client_name},</p>
                  <p>Here is your invoice <strong>${i.invoice_no}</strong> for <strong>${Number(i.total).toFixed(2)} ${i.currency}</strong>.</p>
                  <p><a href="${link}">View your invoice online</a></p>
                  <p>Issue Date: ${i.issue_date} — Due Date: ${i.due_date}</p>
                  <p>Thank you!<br/>New Age Fotografie</p>
                </div>`,
            });
            await sql`UPDATE invoices SET status='sent' WHERE id = ${invoice_id} AND status = 'draft'`;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, link }));
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e?.message || 'send failed' }));
          }
        });
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'send failed' }));
      }
      return;
    }

    // Send invoice via WhatsApp (Vonage or Twilio optional)
    if (pathname === '/api/invoices/send-whatsapp' && req.method === 'POST') {
      try {
        if (!sql) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Database unavailable' })); return; }
        await ensureInvoiceSchema();
        let raw = '';
        req.on('data', c => raw += c.toString());
        req.on('end', async () => {
          try {
            const body = raw ? JSON.parse(raw) : {};
            const invoice_id = body.invoice_id;
            const to_phone = body.to_phone;
            if (!invoice_id) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'invoice_id required' })); return; }
            const inv = await sql`SELECT invoice_no, client_name, total, currency, public_id FROM invoices WHERE id = ${invoice_id}`;
            if (!inv || inv.length === 0) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Invoice not found' })); return; }
            const i = inv[0];
            const link = `${appUrl(req)}/inv/${i.public_id}`;
            const message = `New Age Fotografie – Invoice ${i.invoice_no} for ${Number(i.total).toFixed(2)} ${i.currency}\n${link}`;

            // Try Vonage Messages API (WhatsApp)
            const vonageJwt = generateVonageJwt();
            const vonageFrom = process.env.VONAGE_WHATSAPP_FROM;
            if (vonageJwt && vonageFrom && to_phone) {
              try {
                const resp = await fetch('https://api.nexmo.com/v1/messages', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${vonageJwt}` },
                  body: JSON.stringify({
                    from: { type: 'whatsapp', number: vonageFrom },
                    to: { type: 'whatsapp', number: String(to_phone).replace(/[^0-9+]/g,'') },
                    message: { content: { type: 'text', text: message } }
                  })
                });
                if (resp.ok) {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ ok: true, sent: true, provider: 'vonage', link }));
                  return;
                }
              } catch (e) {
                // fall through
              }
            }

            // Try Twilio WhatsApp
            const hasTwilio = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
            if (hasTwilio && to_phone) {
              try {
                const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                await twilio.messages.create({ from: process.env.TWILIO_WHATSAPP_FROM, to: `whatsapp:${to_phone}`, body: message });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, sent: true, provider: 'twilio', link }));
                return;
              } catch (e) {
                // fall through
              }
            }
            const share = `https://wa.me/?text=${encodeURIComponent(message)}`;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, sent: false, share, link }));
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e?.message || 'whatsapp failed' }));
          }
        });
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'whatsapp failed' }));
      }
      return;
    }

    // Send invoice via SMS (Vonage SMS API)
    if (pathname === '/api/invoices/send-sms' && req.method === 'POST') {
      try {
        if (!sql) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Database unavailable' })); return; }
        await ensureInvoiceSchema();
        let raw = '';
        req.on('data', c => raw += c.toString());
        req.on('end', async () => {
          try {
            const body = raw ? JSON.parse(raw) : {};
            const invoice_id = body.invoice_id;
            const to_phone = body.to_phone;
            if (!invoice_id || !to_phone) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'invoice_id and to_phone required' })); return; }
            const inv = await sql`SELECT invoice_no, client_name, total, currency, public_id FROM invoices WHERE id = ${invoice_id}`;
            if (!inv || inv.length === 0) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Invoice not found' })); return; }
            const i = inv[0];
            const link = `${appUrl(req)}/inv/${i.public_id}`;
            const message = `New Age Fotografie – Invoice ${i.invoice_no} for ${Number(i.total).toFixed(2)} ${i.currency} ${link}`;
            const key = process.env.VONAGE_API_KEY;
            const secret = process.env.VONAGE_API_SECRET;
            const from = process.env.VONAGE_SMS_FROM || 'NewAgeFoto';
            if (key && secret) {
              const resp = await fetch('https://rest.nexmo.com/sms/json', {
                method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ api_key: key, api_secret: secret, to: String(to_phone).replace(/[^0-9+]/g,''), from, text: message }).toString()
              });
              const data = await resp.json().catch(() => ({}));
              if (resp.ok) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, sent: true, provider: 'vonage', data, link })); return; }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, sent: false, info: 'No SMS provider configured', link }));
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e?.message || 'sms failed' }));
          }
        });
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'sms failed' }));
      }
      return;
    }

    // Update invoice status
    if (pathname === '/api/invoices/update-status' && req.method === 'POST') {
      try {
        if (!sql) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Database unavailable' })); return; }
        await ensureInvoiceSchema();
        let raw = '';
        req.on('data', c => raw += c.toString());
        req.on('end', async () => {
          try {
            const body = raw ? JSON.parse(raw) : {};
            const invoice_id = body.invoice_id;
            const status = body.status;
            if (!invoice_id || !status) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'invoice_id and status required' })); return; }
            await sql`UPDATE invoices SET status = ${status} WHERE id = ${invoice_id}`;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e?.message || 'update failed' }));
          }
        });
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'update failed' }));
      }
      return;
    }

    // Public invoice page
    if (pathname.startsWith('/inv/') && req.method === 'GET') {
      try {
        if (!sql) { res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' }); res.end('<main>Database unavailable</main>'); return; }
        await ensureInvoiceSchema();
        const publicId = pathname.split('/inv/')[1];
        if (!publicId) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); res.end('<main>Invoice not found.</main>'); return; }
        const inv = await sql`SELECT id, invoice_no, client_name, client_email, issue_date, due_date, currency, subtotal, tax, total, notes FROM invoices WHERE public_id = ${publicId}`;
        if (!inv || inv.length === 0) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); res.end('<main>Invoice not found.</main>'); return; }
        const id = inv[0].id;
        const items = await sql`SELECT description, quantity, unit_price, line_total FROM invoice_items WHERE invoice_id = ${id}`;
        const i = inv[0];
        const esc = (s) => String(s ?? '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
        const rowHtml = items.map(it => `
          <tr style="border-top:1px solid #eee"><td>${esc(it.description)}</td><td align="right">${Number(it.quantity).toFixed(2)}</td><td align="right">${Number(it.unit_price).toFixed(2)} ${i.currency}</td><td align="right">${Number(it.line_total).toFixed(2)} ${i.currency}</td></tr>
        `).join('');
        const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
          <title>Invoice ${esc(i.invoice_no)}</title>
          <style>body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;margin:0} main{max-width:880px;margin:24px auto;padding:0 16px} button{cursor:pointer}</style>
        </head><body>
        <main>
          <h1 style="margin-bottom:4px">Invoice ${esc(i.invoice_no)}</h1>
          <div style="opacity:.75;margin-bottom:16px">New Age Fotografie · ${esc(process.env.SMTP_USER || 'hallo@newagefotografie.com')}</div>
          <section style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div>
              <strong>Bill To:</strong>
              <div>${esc(i.client_name)}</div>
              ${i.client_email ? `<div>${esc(i.client_email)}</div>` : ''}
            </div>
            <div>
              <div><strong>Issue:</strong> ${esc(i.issue_date)}</div>
              <div><strong>Due:</strong> ${esc(i.due_date)}</div>
              <div><strong>Total:</strong> ${Number(i.total).toFixed(2)} ${esc(i.currency)}</div>
            </div>
          </section>
          <table style="width:100%;margin-top:16px;border-collapse:collapse">
            <thead><tr><th align="left">Description</th><th align="right">Qty</th><th align="right">Unit</th><th align="right">Line</th></tr></thead>
            <tbody>${rowHtml}</tbody>
            <tfoot>
              <tr><td colspan="3" align="right">Subtotal</td><td align="right">${Number(i.subtotal).toFixed(2)} ${esc(i.currency)}</td></tr>
              <tr><td colspan="3" align="right">Tax</td><td align="right">${Number(i.tax).toFixed(2)} ${esc(i.currency)}</td></tr>
              <tr><td colspan="3" align="right"><strong>Total</strong></td><td align="right"><strong>${Number(i.total).toFixed(2)} ${esc(i.currency)}</strong></td></tr>
            </tfoot>
          </table>
          ${i.notes ? `<p style="margin-top:16px;white-space:pre-wrap">${esc(i.notes)}</p>` : ''}
          <button onclick="window.print()" style="margin-top:16px;padding:10px 14px;border-radius:8px;border:1px solid #111;background:#111;color:#fff">Print / Save PDF</button>
        </main>
        </body></html>`;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<main>Server error</main>');
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

      // Enhanced Create questionnaire link endpoint
      if (pathname === '/api/admin/create-questionnaire-link' && req.method === 'POST') {
        const { questionnaireHandlers } = require('./api/questionnaire-handlers');
        await questionnaireHandlers.createQuestionnaireLink(req, res);
        return;
      }

      // Enhanced Get questionnaire by token endpoint
      if (pathname.startsWith('/api/questionnaire/') && req.method === 'GET') {
        const { questionnaireHandlers } = require('./api/questionnaire-handlers');
        const token = pathname.split('/').pop();
        await questionnaireHandlers.getQuestionnaireByToken(req, res, token);
        return;
      }

      // Enhanced Submit questionnaire endpoint
      if (pathname === '/api/email-questionnaire' && req.method === 'POST') {
        const { questionnaireHandlers } = require('./api/questionnaire-handlers');
        await questionnaireHandlers.submitQuestionnaire(req, res);
        return;
      }
      
      // === LEAD CAPTURE ENDPOINTS ===

      // Unified leads submit endpoint (newsletter, waitlist, contact)
      if (pathname === '/api/leads/submit') {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
          return;
        }
        if (!sql) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Database not available' }));
          return;
        }
        await ensureLeadsSchema();
        let raw = '';
        req.on('data', c => raw += c.toString());
        req.on('end', async () => {
          try {
            const body = raw ? JSON.parse(raw) : {};
            const formType = String(body.formType || '').toLowerCase();
            const allowed = ['newsletter','waitlist','contact'];
            if (!allowed.includes(formType)) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'Invalid formType' }));
              return;
            }
            const sourcePath = typeof body.sourcePath === 'string' ? body.sourcePath : (req.headers.referer || '');
            const consent = !!body.consent;

            // Basic validation per type
            const email = String(body.email || '').trim();
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'Valid email is required' }));
              return;
            }

            let fullName = null, phone = null, preferredDate = null, message = null;
            if (formType === 'waitlist' || formType === 'contact') {
              fullName = String(body.fullName || '').trim();
              if (!fullName) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: 'fullName is required' }));
                return;
              }
              phone = body.phone ? String(body.phone).trim() : null;
              message = body.message ? String(body.message).trim() : null;
              if (formType === 'waitlist' && body.preferredDate) {
                preferredDate = String(body.preferredDate);
              }
            }

            // Capture client details
            let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
            if (Array.isArray(ip)) ip = ip[0] || '';
            if (typeof ip === 'string' && ip.includes(',')) ip = ip.split(',')[0].trim();
            const userAgent = String(req.headers['user-agent'] || '');

            // Insert
            try {
              const rows = await sql`
                INSERT INTO leads(form_type, full_name, email, phone, preferred_date, message, consent, source_path, user_agent, ip, meta, status)
                VALUES (${formType}, ${fullName}, ${email}, ${phone}, ${preferredDate}, ${message}, ${consent}, ${sourcePath}, ${userAgent}, ${ip}, ${JSON.stringify({})}, 'new')
                RETURNING id, created_at
              `;

              // Send emails (studio + optional client acknowledgement)
              try {
                const nodemailer = require('nodemailer');
                const tx = nodemailer.createTransport({
                  host: process.env.SMTP_HOST,
                  port: parseInt(process.env.SMTP_PORT || '587', 10),
                  secure: false,
                  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
                  tls: { rejectUnauthorized: false }
                });
                const studioTo = (process.env.STUDIO_NOTIFY_EMAIL || '').trim();
                if (studioTo) {
                  const lines = [
                    `Form: ${formType}`,
                    `Name: ${fullName || '-'}`,
                    `Email: ${email}`,
                    `Phone: ${phone || '-'}`,
                    `Preferred Date: ${preferredDate || '-'}`,
                    `Message: ${message || '-'}`,
                    `Consent: ${consent ? 'yes' : 'no'}`,
                    `Source: ${sourcePath}`,
                    `IP: ${ip}`,
                  ];
                  await tx.sendMail({
                    from: process.env.FROM_EMAIL || process.env.SMTP_USER,
                    to: studioTo,
                    subject: '📥 New Lead received',
                    text: lines.join('\n')
                  });
                }
                if (email && (formType === 'waitlist' || formType === 'contact')) {
                  await tx.sendMail({
                    from: process.env.FROM_EMAIL || process.env.SMTP_USER,
                    to: email,
                    subject: 'Thanks — we’ve received your message ✅',
                    html: `<div style="font-family:system-ui;line-height:1.55"><p>Hi ${fullName || ''}</p><p>Thanks for reaching out to New Age Fotografie. We’ll get back to you shortly.</p><p>– New Age Fotografie</p></div>`
                  });
                }
              } catch (mailErr) {
                console.warn('⚠️ Lead email notification failed:', mailErr.message);
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true, id: rows[0]?.id }));
            } catch (e) {
              const msg = String(e?.message || '');
              if (msg.includes('uniq_newsletter_email') && formType === 'newsletter') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, duplicate: true, message: 'Already subscribed' }));
                return;
              }
              console.error('DB insert error (leads):', e);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'Failed to save lead' }));
            }
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
          }
        });
        return;
      }

      // List new leads (minimal admin helper)
      if (pathname === '/api/leads/list' && req.method === 'GET') {
        if (!sql) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Database not available' }));
          return;
        }
        await ensureLeadsSchema();
        try {
          const rows = await sql`
            SELECT id, form_type, full_name, email, phone, preferred_date, created_at
            FROM leads
            WHERE status = 'new'
            ORDER BY created_at DESC
          `;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ count: rows.length, rows }));
        } catch (e) {
          console.error('leads list error:', e.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Failed to list leads' }));
        }
        return;
      }
      
      // Contact form submission endpoint (compat shim -> unified leads)
      if (pathname === '/api/contact' && req.method === 'POST') {
        try {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const { fullName, email, phone, message, consent, sourcePath } = JSON.parse(body || '{}');
              console.log('📞 New contact form submission:', { fullName, email, phone });
              if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Valid email is required' }));
                return;
              }
              if (!fullName) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'fullName is required' }));
                return;
              }
              await insertLeadAndNotify({ req, formType: 'contact', fullName, email, phone, message, consent, sourcePath });
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Kontaktformular erfolgreich übermittelt' }));
            } catch (error) {
              console.error('❌ Contact form submission error:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Fehler beim Übermitteln des Kontaktformulars' }));
            }
          });
        } catch (error) {
          console.error('❌ Contact form API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'API-Fehler' }));
        }
        return;
      }
      
      // Waitlist (Warteliste) form submission endpoint (compat shim -> unified leads)
      if (pathname === '/api/waitlist' && req.method === 'POST') {
        try {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const { fullName, email, phone, preferredDate, message, consent, sourcePath } = JSON.parse(body || '{}');
              console.log('📅 New waitlist submission:', { fullName, email, phone, preferredDate });
              if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Valid email is required' }));
                return;
              }
              if (!fullName) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'fullName is required' }));
                return;
              }
              await insertLeadAndNotify({ req, formType: 'waitlist', fullName, email, phone, preferredDate, message, consent, sourcePath });
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Warteliste-Anfrage erfolgreich übermittelt' }));
            } catch (error) {
              console.error('❌ Waitlist submission error:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Fehler beim Übermitteln der Warteliste-Anfrage' }));
            }
          });
        } catch (error) {
          console.error('❌ Waitlist API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'API-Fehler' }));
        }
        return;
      }
      
      // Newsletter signup endpoint (compat shim -> unified leads)
      if (pathname === '/api/newsletter/signup' && req.method === 'POST') {
        try {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const { email, consent, sourcePath } = JSON.parse(body || '{}');
              console.log('📧 New newsletter signup:', { email });
              if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Valid email is required' }));
                return;
              }
              try {
                const { id } = await insertLeadAndNotify({ req, formType: 'newsletter', email, consent, sourcePath });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, id, message: 'Newsletter-Anmeldung erfolgreich' }));
              } catch (e) {
                const msg = String(e?.message || '');
                if (msg.includes('uniq_newsletter_email')) {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, duplicate: true, message: 'Already subscribed' }));
                  return;
                }
                throw e;
              }
            } catch (error) {
              console.error('❌ Newsletter signup error:', error.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Fehler bei der Newsletter-Anmeldung' }));
            }
          });
        } catch (error) {
          console.error('❌ Newsletter API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'API-Fehler' }));
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
                COALESCE(qr.client_id, ql.client_id) AS client_id,
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
              LEFT JOIN crm_clients c ON (
                c.client_id::text = COALESCE(qr.client_id::text, ql.client_id::text)
                OR c.id::text = COALESCE(qr.client_id::text, ql.client_id::text)
              )
              WHERE (
                ql.client_id::text = ${clientIdParam}::text
                OR qr.client_id::text = ${clientIdParam}::text
              )
              ORDER BY COALESCE(qr.submitted_at, ql.created_at) DESC
            `;
            console.log('✅ Primary query successful, found questionnaires:', questionnaires.length);
            questionnaires.forEach((q, i) => {
              console.log(`📝 Questionnaire ${i + 1}:`, {
                token: q.token,
                client_id: q.client_id,
                is_used: q.is_used,
                has_response: !!q.response_id,
                submitted_at: q.submitted_at,
                answers: q.answers ? (typeof q.answers === 'string' ? Object.keys(JSON.parse(q.answers || '{}')).length : Object.keys(q.answers || {}).length) + ' answers' : 'no answers'
              });
            });
            // If no results, fallback to responses table by client_id
            if (!questionnaires || questionnaires.length === 0) {
              console.log('ℹ️ No questionnaires via links. Falling back to responses by client_id...');
              const responseResults = await sql`
                SELECT 
                  qr.token,
                  qr.client_id,
                  qr.answers,
                  qr.submitted_at,
                  qr.submitted_at as created_at
                FROM questionnaire_responses qr
                WHERE qr.client_id::text = ${clientIdParam}::text
                ORDER BY qr.submitted_at DESC
              `;
              questionnaires = responseResults.map(r => ({
                token: r.token,
                client_id: r.client_id,
                template_id: null,
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
            }
          } catch (sqlErr) {
            console.error('❌ Client questionnaires SQL error:', sqlErr.message || sqlErr);
            
            // Fallback: Try to get responses directly from questionnaire_responses table
            try {
              console.log('🔄 Trying fallback query...');
              const responseResults = await sql`
                SELECT 
                  token,
                  client_id,
                  answers,
                  submitted_at,
                  submitted_at as created_at
                FROM questionnaire_responses 
                WHERE client_id::text = ${clientIdParam}::text
                ORDER BY submitted_at DESC
              `;
              
              console.log('✅ Fallback query found responses:', responseResults.length);
              
              questionnaires = responseResults.map(r => ({
                token: r.token,
                client_id: r.client_id,
                template_id: null,
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
          // Return notifications based on recent questionnaire responses with client name
          const recentResponses = await sql`
            SELECT 
              qr.id,
              qr.client_id,
              qr.client_name,
              qr.client_email,
              qr.submitted_at,
              qr.token,
              c.first_name,
              c.last_name
            FROM questionnaire_responses qr
            LEFT JOIN crm_clients c ON (c.id::text = qr.client_id::text OR c.client_id::text = qr.client_id::text)
            WHERE qr.submitted_at > NOW() - INTERVAL '7 days'
            ORDER BY qr.submitted_at DESC
            LIMIT 10
          `;

          const notifications = recentResponses.map(r => {
            const fullName = [r.first_name, r.last_name].filter(Boolean).join(' ').trim();
            const displayName = fullName || (r.client_name || 'Client');
            return {
              id: `questionnaire-${r.id}`,
              type: 'questionnaire',
              title: 'New Questionnaire Response',
              message: `Client ${displayName} submitted a questionnaire response`,
              timestamp: r.submitted_at,
              read: false
            };
          });
          
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
          res.end(JSON.stringify((products || []).map(mapVoucherProduct)));
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
          res.end(JSON.stringify(mapVoucherProduct(product)));
        } catch (error) {
          console.error('❌ Voucher product API error:', error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Create voucher product
      if (pathname === '/api/vouchers/products' && req.method === 'POST') {
        if (!requireAdminToken(req, res)) return;
        try {
          let raw = '';
          req.on('data', c => raw += c.toString());
          req.on('end', async () => {
            try {
              const body = raw ? JSON.parse(raw) : {};
              const name = String(body.name || '').trim();
              const price = Number(body.price);
              if (!name || !isFinite(price)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'name and price are required' }));
                return;
              }
              const productPayload = {
                name,
                description: body.description || null,
                price,
                original_price: body.originalPrice ? Number(body.originalPrice) : null,
                category: body.category || null,
                type: 'voucher',
                sku: (name.toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,12) + '-' + Math.floor(Math.random()*900+100)),
                is_active: body.isActive !== false,
                features: Array.isArray(body.features) ? body.features : [],
                terms_and_conditions: body.termsAndConditions || null,
                validity_period: body.validityPeriod ? parseInt(body.validityPeriod, 10) : 365,
                display_order: body.displayOrder ? parseInt(body.displayOrder, 10) : 0,
                image_url: body.imageUrl || null,
                thumbnail_url: body.thumbnailUrl || null,
                metadata: body.metadata || {}
              };
              const created = await database.createVoucherProduct(productPayload);
              res.writeHead(201, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(mapVoucherProduct(created)));
            } catch (e) {
              console.error('❌ Create voucher product error:', e.message);
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Invalid payload' }));
            }
          });
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Update voucher product
      if (pathname.startsWith('/api/vouchers/products/') && req.method === 'PUT') {
        if (!requireAdminToken(req, res)) return;
        try {
          const id = pathname.split('/').pop();
          let raw = '';
          req.on('data', c => raw += c.toString());
          req.on('end', async () => {
            try {
              const body = raw ? JSON.parse(raw) : {};
              const updatePayload = {
                name: body.name !== undefined ? String(body.name) : undefined,
                description: body.description !== undefined ? body.description : undefined,
                price: body.price !== undefined ? Number(body.price) : undefined,
                original_price: body.originalPrice !== undefined ? Number(body.originalPrice) : undefined,
                category: body.category !== undefined ? body.category : undefined,
                type: body.type !== undefined ? body.type : undefined,
                sku: body.sku !== undefined ? body.sku : undefined,
                is_active: body.isActive !== undefined ? !!body.isActive : undefined,
                features: body.features !== undefined ? (Array.isArray(body.features) ? body.features : []) : undefined,
                terms_and_conditions: body.termsAndConditions !== undefined ? body.termsAndConditions : undefined,
                validity_period: body.validityPeriod !== undefined ? parseInt(body.validityPeriod, 10) : undefined,
                display_order: body.displayOrder !== undefined ? parseInt(body.displayOrder, 10) : undefined,
                image_url: body.imageUrl !== undefined ? body.imageUrl : undefined,
                thumbnail_url: body.thumbnailUrl !== undefined ? body.thumbnailUrl : undefined,
                metadata: body.metadata !== undefined ? body.metadata : undefined
              };
              const updated = await database.updateVoucherProduct(id, updatePayload);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(mapVoucherProduct(updated)));
            } catch (e) {
              console.error('❌ Update voucher product error:', e.message);
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Invalid payload' }));
            }
          });
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Delete voucher product
      if (pathname.startsWith('/api/vouchers/products/') && req.method === 'DELETE') {
        if (!requireAdminToken(req, res)) return;
        try {
          const id = pathname.split('/').pop();
          const deleted = await database.deleteVoucherProduct(id);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, deleted: deleted?.id || id }));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // Public coupons list for admin UI (merged DB/env/fallback)
      if (pathname === '/api/vouchers/coupons' && req.method === 'GET') {
        if (!requireAdminToken(req, res)) return;
        try {
          await refreshDbCoupons();
          const coupons = getCoupons();
          const mapped = (coupons || []).map(c => ({
            id: c.id || c.code,
            code: c.code,
            name: c.name || c.code,
            description: c.description || null,
            discountType: String(c.type).toLowerCase() === 'percentage' ? 'percentage' : 'fixed_amount',
            discountValue: String(c.type).toLowerCase() === 'percentage' ? Number(c.percent || 0) : Number(c.amount || 0),
            minOrderAmount: c.minOrderAmount || null,
            maxDiscountAmount: c.maxDiscountAmount || null,
            usageLimit: c.usageLimit || null,
            usageCount: c.usageCount || 0,
            startDate: c.startDate || null,
            endDate: c.endDate || null,
            isActive: c.is_active !== false,
            applicableProducts: c.allowedSkus || ['*']
          }));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(mapped));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
        return;
      }

      // Create coupon (simple)
      if (pathname === '/api/vouchers/coupons' && req.method === 'POST') {
        if (!requireAdminToken(req, res)) return;
        try {
          if (!sql) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Database unavailable' })); return; }
          let raw = '';
          req.on('data', c => raw += c.toString());
          req.on('end', async () => {
            try {
              await refreshDbCoupons();
              const body = raw ? JSON.parse(raw) : {};
              const code = String(body.code || '').trim();
              if (!code) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'code required' })); return; }
              const discountType = String(body.discountType || 'percentage');
              const value = Number(body.discountValue || 0);
              const type = discountType === 'fixed_amount' ? 'amount' : 'percentage';
              const percent = type === 'percentage' ? value : null;
              const amount = type === 'amount' ? value : null;
              const allowed = body.applicableProductSlug ? [String(body.applicableProductSlug)] : (Array.isArray(body.applicable_products) ? body.applicable_products : (Array.isArray(body.allowed_skus) ? body.allowed_skus : []));
              const starts_at = body.startDate ? new Date(body.startDate) : null;
              const ends_at = body.endDate ? new Date(body.endDate) : null;
              const is_active = body.isActive !== false;
              await sql`
                INSERT INTO discount_coupons (code, type, percent, amount, allowed_skus, starts_at, ends_at, is_active)
                VALUES (${code}, ${type}, ${percent}, ${amount}, ${JSON.stringify(allowed)}, ${starts_at}, ${ends_at}, ${is_active})
                ON CONFLICT (code) DO UPDATE SET
                  type = EXCLUDED.type,
                  percent = EXCLUDED.percent,
                  amount = EXCLUDED.amount,
                  allowed_skus = EXCLUDED.allowed_skus,
                  starts_at = EXCLUDED.starts_at,
                  ends_at = EXCLUDED.ends_at,
                  is_active = EXCLUDED.is_active,
                  updated_at = NOW()
              `;
              await refreshDbCoupons();
              forceRefreshCoupons();
              res.writeHead(201, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (e) {
              console.error('❌ Create coupon error:', e.message);
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid payload' }));
            }
          });
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // Update coupon by id or code
      if (pathname.startsWith('/api/vouchers/coupons/') && req.method === 'PUT') {
        if (!requireAdminToken(req, res)) return;
        try {
          if (!sql) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Database unavailable' })); return; }
          const ident = pathname.split('/').pop();
          let raw = '';
          req.on('data', c => raw += c.toString());
          req.on('end', async () => {
            try {
              const body = raw ? JSON.parse(raw) : {};
              const code = String(body.code || '').trim();
              const discountType = String(body.discountType || 'percentage');
              const value = Number(body.discountValue || 0);
              const type = discountType === 'fixed_amount' ? 'amount' : 'percentage';
              const percent = type === 'percentage' ? value : null;
              const amount = type === 'amount' ? value : null;
              const allowed = body.applicableProductSlug ? [String(body.applicableProductSlug)] : (Array.isArray(body.applicable_products) ? body.applicable_products : (Array.isArray(body.allowed_skus) ? body.allowed_skus : []));
              const starts_at = body.startDate ? new Date(body.startDate) : null;
              const ends_at = body.endDate ? new Date(body.endDate) : null;
              const is_active = body.isActive !== false;
              const sqlText = `
                UPDATE discount_coupons SET
                  code = COALESCE($2, code),
                  type = $3,
                  percent = $4,
                  amount = $5,
                  allowed_skus = $6,
                  starts_at = $7,
                  ends_at = $8,
                  is_active = $9,
                  updated_at = NOW()
                WHERE id = $1 OR code = $1
                RETURNING *`;
              const rows = await sql(sqlText, [ident, code || null, type, percent, amount, JSON.stringify(allowed || []), starts_at, ends_at, is_active]);
              await refreshDbCoupons();
              forceRefreshCoupons();
              res.writeHead(rows?.length ? 200 : 404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(rows?.[0] ? { success: true } : { error: 'Not found' }));
            } catch (e) {
              console.error('❌ Update coupon error:', e.message);
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid payload' }));
            }
          });
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // Delete coupon by id or code
      if (pathname.startsWith('/api/vouchers/coupons/') && req.method === 'DELETE') {
        if (!requireAdminToken(req, res)) return;
        try {
          if (!sql) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Database unavailable' })); return; }
          const ident = pathname.split('/').pop();
          const del = await sql`DELETE FROM discount_coupons WHERE id = ${ident} OR code = ${ident} RETURNING id`;
          await refreshDbCoupons();
          forceRefreshCoupons();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, deleted: del?.[0]?.id || ident }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
        return;
      }

      // Voucher sales list for admin UI
      if (pathname === '/api/vouchers/sales' && req.method === 'GET') {
        if (!requireAdminToken(req, res)) return;
        try {
          if (!sql) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify([])); return; }
          await ensureVoucherSalesSchema();
          const rows = await sql`
            SELECT id, voucher_code, purchaser_name, purchaser_email, original_amount, discount_amount, final_amount, payment_status, created_at
            FROM voucher_sales
            ORDER BY created_at DESC
            LIMIT 500`;
          const sales = rows.map(r => ({
            id: r.id,
            voucherCode: r.voucher_code,
            purchaserName: r.purchaser_name,
            purchaserEmail: r.purchaser_email,
            originalAmount: Number(r.original_amount || 0),
            discountAmount: Number(r.discount_amount || 0),
            finalAmount: Number(r.final_amount || 0),
            paymentStatus: r.payment_status || 'pending',
            createdAt: r.created_at
          }));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(sales));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
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
      if ((pathname === '/api/checkout/create-session' || pathname === '/api/vouchers/create-session') && req.method === 'POST') {
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
                    // For specific 95-only codes (e.g., VCWIEN, CL50, WL50, VW50),
                    // enforce that item unit price is exactly 9500 cents
                    const appliedCode = String(checkoutData.appliedVoucherCode || '').toUpperCase();
                    const is95Only = is95OnlyCode(appliedCode);
                    const codeEligible = baseCents === 9500;
                    if (is95Only && !codeEligible) {
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
              
              const isVoucherMode = pathname === '/api/vouchers/create-session' || !!(checkoutData?.voucherData || String(checkoutData?.mode || '').toLowerCase() === 'voucher' || String(checkoutData?.order_type || '').toLowerCase() === 'voucher');
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
                  order_type: isVoucherMode ? 'voucher' : (checkoutData.order_type || checkoutData.mode || 'photography_service')
                }
              };

              // Add customer email if provided
              if (checkoutData.customerEmail) {
                sessionParams.customer_email = checkoutData.customerEmail;
              }

              // Add voucher-specific metadata if present
              if (isVoucherMode) {
                const v = checkoutData.voucherData || checkoutData;
                sessionParams.metadata.voucher_mode = 'true';
                sessionParams.metadata.voucher_design = v.selectedDesign?.name || 'custom';
                const delivery = v.delivery || v.deliveryOption?.name || checkoutData.delivery;
                sessionParams.metadata.delivery = delivery || 'pdf';
                if (v.personalMessage || checkoutData.message) {
                  sessionParams.metadata.personal_message = String(v.personalMessage || checkoutData.message).substring(0, 500);
                }
                if (v.shippingAddress || checkoutData.shippingAddress) {
                  try {
                    const sa = v.shippingAddress || checkoutData.shippingAddress;
                    sessionParams.metadata.shipping_address = JSON.stringify(sa).substring(0, 500);
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
                  const vid = v.voucherId || `V-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
                  sessionParams.metadata.voucher_id = String(vid);
                  const recipientName = v.recipientName || v.name;
                  const fromName = v.fromName || v.sender;
                  const message = v.message || v.personalMessage;
                  if (recipientName) sessionParams.metadata.recipient_name = String(recipientName).substring(0, 120);
                  if (fromName) sessionParams.metadata.from_name = String(fromName).substring(0, 120);
                  if (message) sessionParams.metadata.message = String(message).substring(0, 500);
                  if (v.expiryDate) sessionParams.metadata.expiry_date = String(v.expiryDate);
                  if (v.personalization || checkoutData.personalization) {
                    sessionParams.metadata.personalization = JSON.stringify(v.personalization || checkoutData.personalization).substring(0, 500);
                  }
                  if (v.preview_url || checkoutData.preview_url) {
                    sessionParams.metadata.preview_url = String(v.preview_url || checkoutData.preview_url);
                  }
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
      // Stripe Webhook for voucher fulfillment (checkout.session.completed)
      if (pathname === '/api/stripe/webhook' && req.method === 'POST') {
        try {
          if (!stripe) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Stripe not configured' }));
            return;
          }
          await ensureVouchersSchema();
          const chunks = [];
          req.on('data', (c) => chunks.push(c));
          req.on('end', async () => {
            try {
              const buf = Buffer.concat(chunks);
              const sig = req.headers['stripe-signature'];
              const secret = process.env.STRIPE_WEBHOOK_SECRET;
              let evt = null;
              if (secret) {
                evt = stripe.webhooks.constructEvent(buf, sig, secret);
              } else {
                evt = JSON.parse(buf.toString('utf8'));
              }
              if (evt.type === 'checkout.session.completed') {
                const session = evt.data.object;
                const delivery = (session.metadata?.delivery || session.metadata?.delivery_option || 'pdf').toLowerCase();
                const meta = session.metadata || {};
                const personalizationRaw = meta.personalization ? JSON.parse(meta.personalization) : {};
                const mergedPersonalization = {
                  ...personalizationRaw,
                  voucher_id: personalizationRaw.voucher_id || meta.voucher_id || session.id,
                  sku: personalizationRaw.sku || meta.sku || meta.variant || 'Voucher',
                  variant: personalizationRaw.variant || meta.variant || meta.sku || 'Voucher',
                  recipient_name: personalizationRaw.recipient_name || meta.recipient_name || personalizationRaw.recipientName,
                  from_name: personalizationRaw.from_name || meta.from_name || personalizationRaw.fromName || personalizationRaw.sender,
                  message: personalizationRaw.message || meta.message || meta.personal_message || personalizationRaw.personalMessage,
                  expiry_date: personalizationRaw.expiry_date || meta.expiry_date,
                  preview_url: personalizationRaw.preview_url || meta.preview_url || null
                };
                const preview_url = mergedPersonalization.preview_url || null;
                const email = session.customer_details?.email || session.customer_email || '';
                const shipping = session.shipping_details ? JSON.stringify(session.shipping_details) : null;
                const amount = session.amount_total || 0;
                const currency = session.currency || 'eur';
                const variant = mergedPersonalization.variant || 'Voucher';

                await sql`
                  INSERT INTO vouchers(session_id, payment_intent_id, email, amount, currency, delivery, variant, personalization, preview_url, shipping, status)
                  VALUES (${session.id}, ${session.payment_intent}, ${email}, ${amount}, ${currency}, ${delivery}, ${variant}, ${JSON.stringify(mergedPersonalization)}, ${preview_url}, ${shipping}, ${delivery === 'pdf' ? 'paid' : 'print_queue'})
                  ON CONFLICT (session_id) DO UPDATE SET
                    payment_intent_id = EXCLUDED.payment_intent_id,
                    email = EXCLUDED.email,
                    amount = EXCLUDED.amount,
                    currency = EXCLUDED.currency,
                    delivery = EXCLUDED.delivery,
                    variant = EXCLUDED.variant,
                    personalization = EXCLUDED.personalization,
                    preview_url = EXCLUDED.preview_url,
                    shipping = EXCLUDED.shipping,
                    status = EXCLUDED.status
                `;
                // Generate PDF for pdf delivery and email link
                if (delivery === 'pdf') {
                  try {
                    const pdfUrl = await generateVoucherPdf(session.id, mergedPersonalization, preview_url);
                    await sql`UPDATE vouchers SET pdf_url = ${pdfUrl} WHERE session_id = ${session.id}`;
                    const secureUrl = buildSecureDownloadUrl(session.id, 7 * 24 * 3600);
                    if (email) {
                      await sendEmailSimple(email, 'Your Photoshoot Voucher', `Download your voucher: ${secureUrl}`, `<p>Download your voucher <a href="${secureUrl}">${secureUrl}</a></p>`);
                    }
                  } catch (e) {
                    console.warn('⚠️ PDF generation/email failed:', e.message);
                  }
                }
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ received: true }));
            } catch (e) {
              console.error('webhook error:', e.message);
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Webhook Error' }));
            }
          });
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
        return;
      }

      // Temporary local download for generated PDFs (for smoke tests)
      if (pathname === '/api/vouchers/download' && req.method === 'GET') {
        try {
          const token = String(parsedUrl.query?.token || '');
          if (!token) { res.writeHead(400); res.end('Missing token'); return; }
          const file = base64UrlDecodeToString(token);
          if (!fs.existsSync(file)) { res.writeHead(404); res.end('Not found'); return; }
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'inline; filename=voucher.pdf');
          fs.createReadStream(file).pipe(res);
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Download error');
        }
        return;
      }
      // Secure voucher PDF download by session_id (signed)
      if (pathname === '/api/vouchers/secure-download' && req.method === 'GET') {
        try {
          const sid = String(parsedUrl.query?.session_id || '').trim();
          const expires = parseInt(String(parsedUrl.query?.expires || '0'), 10);
          const sig = String(parsedUrl.query?.sig || '');
          if (!sid || !expires || !sig) { res.writeHead(400, { 'Content-Type': 'text/plain' }); res.end('Bad request'); return; }
          if (Date.now() / 1000 > expires) { res.writeHead(410, { 'Content-Type': 'text/plain' }); res.end('Link expired'); return; }
          const expected = signDownload(sid, expires);
          if (expected !== sig) { res.writeHead(403, { 'Content-Type': 'text/plain' }); res.end('Invalid signature'); return; }
          await ensureVouchersSchema();
          const rows = await sql`SELECT pdf_url, personalization, preview_url FROM vouchers WHERE session_id = ${sid}`;
          let filePath = null;
          if (rows && rows[0]?.pdf_url) {
            const u = new URL(rows[0].pdf_url, getBaseUrl());
            if (u.pathname === '/api/vouchers/download') {
              const token = u.searchParams.get('token');
              if (token) filePath = base64UrlDecodeToString(token);
            }
          }
          if (!filePath || !fs.existsSync(filePath)) {
            const pdfUrl = await generateVoucherPdf(sid, rows[0]?.personalization || {}, rows[0]?.preview_url || null);
            await sql`UPDATE vouchers SET pdf_url = ${pdfUrl} WHERE session_id = ${sid}`;
            const u2 = new URL(pdfUrl, getBaseUrl());
            const t2 = u2.searchParams.get('token');
            if (t2) filePath = base64UrlDecodeToString(t2);
          }
          if (!filePath || !fs.existsSync(filePath)) { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('File not ready'); return; }
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'inline; filename=voucher.pdf');
          fs.createReadStream(filePath).pipe(res);
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Download error');
        }
        return;
      }
      // Public API: Return a freshly signed secure download link for the given session_id
      if (pathname === '/api/vouchers/signed-link' && req.method === 'GET') {
        try {
          const sid = String(parsedUrl.query?.session_id || '').trim();
          const ttl = parseInt(String(parsedUrl.query?.ttl || '86400'), 10);
          if (!sid) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ success: false, error: 'session_id required' })); return; }
          await ensureVouchersSchema();
          let row = null;
          try {
            const rows = await sql`SELECT session_id, status FROM vouchers WHERE session_id = ${sid}`;
            row = rows && rows[0] ? rows[0] : null;
          } catch {}
          let isPaid = false;
          if (row) {
            isPaid = row.status === 'paid' || row.status === 'print_queue' || row.status === 'fulfilled';
          } else if (stripe) {
            try {
              const ses = await stripe.checkout.sessions.retrieve(sid);
              isPaid = ses?.payment_status === 'paid';
              if (isPaid) {
                const m = ses.metadata || {};
                const personalization = m.personalization ? JSON.parse(m.personalization) : {};
                const merged = {
                  ...personalization,
                  voucher_id: personalization.voucher_id || m.voucher_id || sid,
                  sku: personalization.sku || m.sku || m.variant || 'Voucher',
                  variant: personalization.variant || m.variant || m.sku || 'Voucher',
                  recipient_name: personalization.recipient_name || m.recipient_name || personalization.recipientName,
                  from_name: personalization.from_name || m.from_name || personalization.fromName || personalization.sender,
                  message: personalization.message || m.message || m.personal_message || personalization.personalMessage,
                  expiry_date: personalization.expiry_date || m.expiry_date,
                  preview_url: personalization.preview_url || m.preview_url || null
                };
                const delivery = (m.delivery || m.delivery_option || 'pdf').toLowerCase();
                await sql`
                  INSERT INTO vouchers(session_id, payment_intent_id, email, amount, currency, delivery, variant, personalization, preview_url, shipping, status)
                  VALUES (${sid}, ${ses.payment_intent}, ${ses.customer_details?.email || ses.customer_email || ''}, ${ses.amount_total || 0}, ${ses.currency || 'eur'}, ${delivery}, ${merged.variant || 'Voucher'}, ${JSON.stringify(merged)}, ${merged.preview_url || null}, ${ses.shipping_details ? JSON.stringify(ses.shipping_details) : null}, ${delivery === 'pdf' ? 'paid' : 'print_queue'})
                  ON CONFLICT (session_id) DO NOTHING
                `;
              }
            } catch {}
          }
          if (!isPaid) { res.writeHead(402, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ success: false, error: 'Payment not completed' })); return; }
          const urlSigned = buildSecureDownloadUrl(sid, isNaN(ttl) ? 86400 : Math.max(300, ttl));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, url: urlSigned }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return;
      }
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

              // Special constraint: certain codes only valid for €95 vouchers
              if (is95OnlyCode(code) && !hasExact95) {
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

      // ===== Admin Vouchers: Print Queue + Actions =====
      if (pathname === '/api/admin/vouchers/print-queue' && req.method === 'GET') {
        try {
          const token = req.headers['x-admin-token'] || req.headers['x_admin_token'];
          const expected = process.env.ADMIN_TOKEN || process.env.SECRET_ADMIN_TOKEN;
          if (!expected || token !== expected) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
            return;
          }
          await ensureVouchersSchema();
          const rows = await sql`SELECT session_id, email, amount, currency, delivery, variant, personalization, preview_url, shipping, status, pdf_url, created_at FROM vouchers WHERE status = 'print_queue' ORDER BY created_at DESC LIMIT 100`;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, count: rows.length, vouchers: rows }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return;
      }
      if (pathname.match(/^\/api\/admin\/vouchers\/[^/]+\/mark-fulfilled$/) && req.method === 'POST') {
        try {
          const token = req.headers['x-admin-token'] || req.headers['x_admin_token'];
          const expected = process.env.ADMIN_TOKEN || process.env.SECRET_ADMIN_TOKEN;
          if (!expected || token !== expected) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
            return;
          }
          const sessionId = pathname.split('/')[4];
          await ensureVouchersSchema();
          const updated = await sql`UPDATE vouchers SET status = 'fulfilled' WHERE session_id = ${sessionId} RETURNING session_id`;
          if (!updated || updated.length === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Not found' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return;
      }
      if (pathname.match(/^\/api\/admin\/vouchers\/[^/]+\/regenerate-pdf$/) && req.method === 'POST') {
        try {
          const token = req.headers['x-admin-token'] || req.headers['x_admin_token'];
          const expected = process.env.ADMIN_TOKEN || process.env.SECRET_ADMIN_TOKEN;
          if (!expected || token !== expected) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
            return;
          }
          const sessionId = pathname.split('/')[4];
          await ensureVouchersSchema();
          const rows = await sql`SELECT personalization, preview_url FROM vouchers WHERE session_id = ${sessionId} LIMIT 1`;
          if (!rows || rows.length === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Not found' }));
            return;
          }
          const pdfUrl = await generateVoucherPdf(sessionId, rows[0].personalization || {}, rows[0].preview_url || null);
          await sql`UPDATE vouchers SET pdf_url = ${pdfUrl} WHERE session_id = ${sessionId}`;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, pdfUrl }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return;
      }

      // Generate a signed secure download link (admin only)
      if (pathname === '/api/admin/vouchers/secure-link' && req.method === 'GET') {
        try {
          const token = req.headers['x-admin-token'] || req.headers['x_admin_token'];
          const expected = process.env.ADMIN_TOKEN || process.env.SECRET_ADMIN_TOKEN;
          if (!expected || token !== expected) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
            return;
          }
          const sid = String(parsedUrl.query?.session_id || '').trim();
          const ttl = parseInt(String(parsedUrl.query?.ttl || '3600'), 10);
          if (!sid) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'session_id required' }));
            return;
          }
          const urlSigned = buildSecureDownloadUrl(sid, isNaN(ttl) ? 3600 : Math.max(60, ttl));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, url: urlSigned }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return;
      }

      // ===== Admin Coupons CRUD (DB-backed) =====
      if (pathname === '/api/admin/coupons' && req.method === 'GET') {
        try {
          const token = req.headers['x-admin-token'] || req.headers['x_admin_token'];
          const expected = process.env.ADMIN_TOKEN || process.env.SECRET_ADMIN_TOKEN;
          if (!expected || token !== expected) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
            return;
          }
          await refreshDbCoupons();
          const rows = await sql`SELECT id, code, type, percent, amount, allowed_skus, starts_at, ends_at, is_active, created_at, updated_at FROM discount_coupons ORDER BY created_at DESC LIMIT 200`;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, coupons: rows }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return;
      }
      if (pathname === '/api/admin/coupons' && req.method === 'POST') {
        try {
          const token = req.headers['x-admin-token'] || req.headers['x_admin_token'];
          const expected = process.env.ADMIN_TOKEN || process.env.SECRET_ADMIN_TOKEN;
          if (!expected || token !== expected) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
            return;
          }
          let raw = '';
          req.on('data', c => raw += c.toString());
          req.on('end', async () => {
            const body = raw ? JSON.parse(raw) : {};
            const code = String(body.code || '').trim();
            if (!code) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ success: false, error: 'code required' })); return; }
            const type = (body.type === 'amount') ? 'amount' : 'percentage';
            const percent = type === 'percentage' ? Number(body.percent || 0) : null;
            const amount = type === 'amount' ? Number(body.amount || 0) : null;
            const allowed = Array.isArray(body.allowed_skus) ? body.allowed_skus : Array.isArray(body.allowedSkus) ? body.allowedSkus : [];
            const starts_at = body.starts_at ? new Date(body.starts_at) : null;
            const ends_at = body.ends_at ? new Date(body.ends_at) : null;
            const is_active = body.is_active !== false;
            await sql`
              INSERT INTO discount_coupons (code, type, percent, amount, allowed_skus, starts_at, ends_at, is_active)
              VALUES (${code}, ${type}, ${percent}, ${amount}, ${JSON.stringify(allowed)}, ${starts_at}, ${ends_at}, ${is_active})
            `;
            await refreshDbCoupons();
            forceRefreshCoupons();
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          });
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return;
      }
      if (pathname.match(/^\/api\/admin\/coupons\/[^/]+$/) && req.method === 'PUT') {
        try {
          const token = req.headers['x-admin-token'] || req.headers['x_admin_token'];
          const expected = process.env.ADMIN_TOKEN || process.env.SECRET_ADMIN_TOKEN;
          if (!expected || token !== expected) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
            return;
          }
          const id = pathname.split('/')[4];
          let raw = '';
          req.on('data', c => raw += c.toString());
          req.on('end', async () => {
            const body = raw ? JSON.parse(raw) : {};
            const updates = {
              code: body.code ? String(body.code).trim() : undefined,
              type: body.type && (body.type === 'amount' || body.type === 'percentage') ? body.type : undefined,
              percent: body.percent !== undefined ? Number(body.percent) : undefined,
              amount: body.amount !== undefined ? Number(body.amount) : undefined,
              allowed_skus: Array.isArray(body.allowed_skus) ? body.allowed_skus : Array.isArray(body.allowedSkus) ? body.allowedSkus : undefined,
              starts_at: body.starts_at ? new Date(body.starts_at) : undefined,
              ends_at: body.ends_at ? new Date(body.ends_at) : undefined,
              is_active: body.is_active !== undefined ? !!body.is_active : undefined,
            };
            const setClauses = [];
            const values = [];
            if (updates.code !== undefined) { setClauses.push(`code = $${setClauses.length+1}`); values.push(updates.code); }
            if (updates.type !== undefined) { setClauses.push(`type = $${setClauses.length+1}`); values.push(updates.type); }
            if (updates.percent !== undefined) { setClauses.push(`percent = $${setClauses.length+1}`); values.push(updates.percent); }
            if (updates.amount !== undefined) { setClauses.push(`amount = $${setClauses.length+1}`); values.push(updates.amount); }
            if (updates.allowed_skus !== undefined) { setClauses.push(`allowed_skus = $${setClauses.length+1}`); values.push(JSON.stringify(updates.allowed_skus)); }
            if (updates.starts_at !== undefined) { setClauses.push(`starts_at = $${setClauses.length+1}`); values.push(updates.starts_at); }
            if (updates.ends_at !== undefined) { setClauses.push(`ends_at = $${setClauses.length+1}`); values.push(updates.ends_at); }
            if (updates.is_active !== undefined) { setClauses.push(`is_active = $${setClauses.length+1}`); values.push(updates.is_active); }
            setClauses.push(`updated_at = NOW()`);
            if (!setClauses.length) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ success: false, error: 'No updates' })); return; }
            const query = `UPDATE discount_coupons SET ${setClauses.join(', ')} WHERE id = $${setClauses.length+1}`;
            values.push(id);
            await sql(query, values);
            await refreshDbCoupons();
            forceRefreshCoupons();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          });
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return;
      }
      if (pathname.match(/^\/api\/admin\/coupons\/[^/]+$/) && req.method === 'DELETE') {
        try {
          const token = req.headers['x-admin-token'] || req.headers['x_admin_token'];
          const expected = process.env.ADMIN_TOKEN || process.env.SECRET_ADMIN_TOKEN;
          if (!expected || token !== expected) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
            return;
          }
          const id = pathname.split('/')[4];
          await sql`DELETE FROM discount_coupons WHERE id = ${id}`;
          await refreshDbCoupons();
          forceRefreshCoupons();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
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


