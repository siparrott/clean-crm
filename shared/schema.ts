import { 
  pgTable, 
  text, 
  serial, 
  integer, 
  boolean, 
  uuid, 
  timestamp, 
  decimal, 
  jsonb,
  date,
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Legacy Users table (for existing CRM clients)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  password: text("password"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatar: text("avatar"),
  isAdmin: boolean("is_admin").default(false),
  studioId: uuid("studio_id"), // Links user to their studio
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Studio Configuration table (multi-tenant support)
export const studioConfigs = pgTable("studio_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  studioName: text("studio_name").notNull(),
  ownerEmail: text("owner_email").notNull(),
  domain: text("domain"), // custom domain if any
  subdomain: text("subdomain").unique(), // photographer1.yoursaas.com
  activeTemplate: text("active_template").default("template-01-modern-minimal"),
  
  // Branding
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#7C3AED"),
  secondaryColor: text("secondary_color").default("#F59E0B"),
  fontFamily: text("font_family").default("Inter"),
  
  // Business Info
  businessName: text("business_name"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  country: text("country").default("Austria"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  
  // Social Media
  facebookUrl: text("facebook_url"),
  instagramUrl: text("instagram_url"),
  twitterUrl: text("twitter_url"),
  
  // Operating Hours
  openingHours: jsonb("opening_hours"),
  
  // Features
  enabledFeatures: text("enabled_features").array().default(["gallery", "booking", "blog", "crm"]),
  
  // SEO
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  
  // Status
  isActive: boolean("is_active").default(true),
  subscriptionStatus: text("subscription_status").default("trial"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Template Definitions table
export const templateDefinitions = pgTable("template_definitions", {
  id: text("id").primaryKey(), // template-01-modern-minimal
  name: text("name").notNull(), // "Modern Minimal"
  description: text("description"),
  category: text("category"), // "minimal", "artistic", "classic", etc.
  previewImage: text("preview_image"),
  demoUrl: text("demo_url"),
  features: text("features").array(),
  colorScheme: jsonb("color_scheme"),
  isActive: boolean("is_active").default(true),
  isPremium: boolean("is_premium").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin Users table (authentication for backend access)  
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").default("admin"), // admin, user
  status: text("status").default("active"), // active, inactive
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Blog Posts
export const blogPosts = pgTable("blog_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").unique().notNull(),
  content: text("content"),
  contentHtml: text("content_html"),
  excerpt: text("excerpt"),
  imageUrl: text("image_url"),
  published: boolean("published").default(false),
  publishedAt: timestamp("published_at"),
  scheduledFor: timestamp("scheduled_for"),
  status: text("status").default("DRAFT"), // DRAFT, PUBLISHED, SCHEDULED
  authorId: uuid("author_id").references(() => users.id),
  tags: text("tags").array(),
  metaDescription: text("meta_description"),
  seoTitle: text("seo_title"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CRM Clients
export const crmClients = pgTable("crm_clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  clientId: text("client_id").unique(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  country: text("country"),
  company: text("company"),
  notes: text("notes"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CRM Leads
export const crmLeads = pgTable("crm_leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  message: text("message"),
  source: text("source"),
  status: text("status").default("new"),
  assigned_to: uuid("assigned_to").references(() => users.id),
  priority: text("priority").default("medium"),
  tags: text("tags").array(),
  follow_up_date: date("follow_up_date"),
  value: decimal("value", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CRM Invoices
export const crmInvoices = pgTable("crm_invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: text("invoice_number").unique().notNull(),
  clientId: uuid("client_id").references(() => crmClients.id).notNull(),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("draft"),
  notes: text("notes"),
  termsAndConditions: text("terms_and_conditions"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CRM Invoice Items
export const crmInvoiceItems = pgTable("crm_invoice_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").references(() => crmInvoices.id, { onDelete: "cascade" }).notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// CRM Invoice Payments
export const crmInvoicePayments = pgTable("crm_invoice_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").references(() => crmInvoices.id, { onDelete: "cascade" }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").default("bank_transfer"),
  paymentReference: text("payment_reference"),
  paymentDate: date("payment_date").notNull(),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Voucher Products (what customers can buy)
export const voucherProducts = pgTable("voucher_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(), // "Familie Fotoshooting", "Neugeborenen Fotoshooting"
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }), // for showing discounts
  category: text("category"), // "familie", "baby", "hochzeit", "business", "event"
  sessionDuration: integer("session_duration").default(60), // minutes
  sessionType: text("session_type"), // links to photography session types
  
  // Voucher details
  validityPeriod: integer("validity_period").default(365), // days
  redemptionInstructions: text("redemption_instructions"),
  termsAndConditions: text("terms_and_conditions"),
  
  // Display settings
  imageUrl: text("image_url"),
  displayOrder: integer("display_order").default(0),
  featured: boolean("featured").default(false),
  badge: text("badge"), // "30% OFF", "BESTSELLER", etc.
  
  // Availability
  isActive: boolean("is_active").default(true),
  stockLimit: integer("stock_limit"), // null = unlimited
  maxPerCustomer: integer("max_per_customer").default(5),
  
  // SEO
  slug: text("slug").unique(),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Discount Coupons
export const discountCoupons = pgTable("discount_coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").unique().notNull(), // "WELCOME10", "SUMMER2024"
  name: text("name").notNull(), // "Welcome Discount", "Summer Sale"
  description: text("description"),
  
  // Discount settings
  discountType: text("discount_type").notNull(), // "percentage", "fixed_amount"
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  maxDiscountAmount: decimal("max_discount_amount", { precision: 10, scale: 2 }),
  
  // Usage limits
  usageLimit: integer("usage_limit"), // null = unlimited
  usageCount: integer("usage_count").default(0),
  usageLimitPerCustomer: integer("usage_limit_per_customer").default(1),
  
  // Validity
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  
  // Restrictions
  applicableProducts: text("applicable_products").array(), // product IDs or "all"
  excludedProducts: text("excluded_products").array(),
  firstTimeCustomersOnly: boolean("first_time_customers_only").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Voucher Sales (purchases)
export const voucherSales = pgTable("voucher_sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => voucherProducts.id),
  
  // Customer info
  purchaserName: text("purchaser_name").notNull(),
  purchaserEmail: text("purchaser_email").notNull(),
  purchaserPhone: text("purchaser_phone"),
  
  // Gift recipient (if different)
  recipientName: text("recipient_name"),
  recipientEmail: text("recipient_email"),
  giftMessage: text("gift_message"),
  
  // Voucher details
  voucherCode: text("voucher_code").unique().notNull(),
  originalAmount: decimal("original_amount", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default('0'),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("EUR"),
  
  // Coupon applied
  couponId: uuid("coupon_id").references(() => discountCoupons.id),
  couponCode: text("coupon_code"),
  
  // Payment
  paymentIntentId: text("payment_intent_id"),
  paymentStatus: text("payment_status").default("pending"), // "pending", "paid", "failed", "refunded"
  paymentMethod: text("payment_method"), // "stripe", "paypal", etc.
  
  // Fulfillment
  isRedeemed: boolean("is_redeemed").default(false),
  redeemedAt: timestamp("redeemed_at"),
  redeemedBy: uuid("redeemed_by").references(() => crmClients.id),
  sessionId: uuid("session_id"), // links to photography session when redeemed
  
  // Validity
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Coupon usage tracking
export const couponUsage = pgTable("coupon_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  couponId: uuid("coupon_id").references(() => discountCoupons.id),
  customerEmail: text("customer_email").notNull(),
  orderAmount: decimal("order_amount", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(),
  voucherSaleId: uuid("voucher_sale_id").references(() => voucherSales.id),
  usedAt: timestamp("used_at").defaultNow(),
});

// CRM Messages
export const crmMessages = pgTable("crm_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  status: text("status").default("unread"),
  clientId: uuid("client_id").references(() => crmClients.id),
  assignedTo: uuid("assigned_to").references(() => users.id),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Gallery Systems
export const galleries = pgTable("galleries", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  coverImage: text("cover_image"),
  isPublic: boolean("is_public").default(true),
  isPasswordProtected: boolean("is_password_protected").default(false),
  password: text("password"),
  clientId: uuid("client_id").references(() => crmClients.id),
  createdBy: uuid("created_by").references(() => users.id),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const galleryImages = pgTable("gallery_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  galleryId: uuid("gallery_id").references(() => galleries.id, { onDelete: "cascade" }).notNull(),
  filename: text("filename").notNull(),
  url: text("url").notNull(),
  title: text("title"),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Photography Session Management System  
export const photographySessions = pgTable("photography_sessions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  sessionType: text("session_type").notNull(),
  status: text("status").default("scheduled"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  
  // Client Integration & Attendees
  clientId: text("client_id"), // Link to CRM clients
  clientName: text("client_name"),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  attendees: jsonb("attendees"), // Array of attendee objects with RSVP status
  
  // Location & Weather
  locationName: text("location_name"),
  locationAddress: text("location_address"),
  locationCoordinates: text("location_coordinates"),
  weatherDependent: boolean("weather_dependent").default(false),
  goldenHourOptimized: boolean("golden_hour_optimized").default(false),
  backupPlan: text("backup_plan"),
  
  // Pricing & Payment Status
  basePrice: decimal("base_price", { precision: 10, scale: 2 }),
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }),
  depositPaid: boolean("deposit_paid").default(false),
  finalPayment: decimal("final_payment", { precision: 10, scale: 2 }),
  finalPaymentPaid: boolean("final_payment_paid").default(false),
  paymentStatus: text("payment_status").default("unpaid"), // unpaid, deposit_paid, fully_paid, refunded
  
  // Equipment & Workflow
  equipmentList: text("equipment_list").array(),
  crewMembers: text("crew_members").array(),
  conflictDetected: boolean("conflict_detected").default(false),
  notes: text("notes"),
  portfolioWorthy: boolean("portfolio_worthy").default(false),
  editingStatus: text("editing_status").default("not_started"),
  deliveryStatus: text("delivery_status").default("pending"),
  deliveryDate: timestamp("delivery_date", { withTimezone: true }),
  
  // Recurring Events Support
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: text("recurrence_rule"), // RRULE format for recurring events
  parentEventId: text("parent_event_id"), // For recurring event instances
  
  // External Calendar Integration
  googleCalendarEventId: text("google_calendar_event_id"),
  icalUid: text("ical_uid"),
  externalCalendarSync: boolean("external_calendar_sync").default(false),
  
  // Automated Reminders & Notifications
  reminderSettings: jsonb("reminder_settings"), // Customizable reminder times
  reminderSent: boolean("reminder_sent").default(false),
  confirmationSent: boolean("confirmation_sent").default(false),
  followUpSent: boolean("follow_up_sent").default(false),
  
  // Booking & Availability
  isOnlineBookable: boolean("is_online_bookable").default(false),
  bookingRequirements: jsonb("booking_requirements"), // Custom fields for booking
  availabilityStatus: text("availability_status").default("available"), // available, blocked, tentative
  
  // Enhanced Display & Organization
  color: text("color"), // Custom color for calendar display
  priority: text("priority").default("medium"), // low, medium, high, urgent
  isPublic: boolean("is_public").default(false), // For client-facing calendar
  category: text("category"), // Additional categorization beyond session type
  
  // Metadata
  galleryId: text("gallery_id"),
  photographerId: text("photographer_id"),
  tags: text("tags").array(),
  customFields: jsonb("custom_fields"), // Flexible custom data storage
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const sessionEquipment = pgTable("session_equipment", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  equipmentName: text("equipment_name").notNull(),
  equipmentType: text("equipment_type"),
  rentalRequired: boolean("rental_required").default(false),
  rentalCost: decimal("rental_cost", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const sessionTasks = pgTable("session_tasks", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  taskType: text("task_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: text("assigned_to"),
  status: text("status").default("pending"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const sessionCommunications = pgTable("session_communications", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  communicationType: text("communication_type").notNull(),
  subject: text("subject"),
  content: text("content"),
  sentTo: text("sent_to"),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow(),
  responseReceived: boolean("response_received").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const weatherData = pgTable("weather_data", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  forecastDate: timestamp("forecast_date", { withTimezone: true }).notNull(),
  temperature: decimal("temperature", { precision: 5, scale: 2 }),
  condition: text("condition"),
  precipitationChance: integer("precipitation_chance"),
  windSpeed: decimal("wind_speed", { precision: 5, scale: 2 }),
  goldenHourStart: timestamp("golden_hour_start", { withTimezone: true }),
  goldenHourEnd: timestamp("golden_hour_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const businessInsights = pgTable("business_insights", {
  id: text("id").primaryKey(),
  insightType: text("insight_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dataPoint: decimal("data_point", { precision: 15, scale: 2 }),
  dataUnit: text("data_unit"),
  periodStart: timestamp("period_start", { withTimezone: true }),
  periodEnd: timestamp("period_end", { withTimezone: true }),
  category: text("category"),
  priority: text("priority").default("medium"),
  actionable: boolean("actionable").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Advanced Calendar Features - Availability Management
export const availabilityTemplates = pgTable("availability_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  photographerId: text("photographer_id").notNull(),
  businessHours: jsonb("business_hours"),
  breakTime: jsonb("break_time"),
  bufferTime: integer("buffer_time").default(30),
  maxSessionsPerDay: integer("max_sessions_per_day").default(3),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const availabilityOverrides = pgTable("availability_overrides", {
  id: text("id").primaryKey(),
  photographerId: text("photographer_id").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  overrideType: text("override_type").notNull(),
  title: text("title"),
  description: text("description"),
  customHours: jsonb("custom_hours"),
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: text("recurrence_rule"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// External Calendar Integration
export const calendarSyncSettings = pgTable("calendar_sync_settings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  calendarId: text("calendar_id"),
  syncEnabled: boolean("sync_enabled").default(true),
  syncDirection: text("sync_direction").default("bidirectional"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  syncStatus: text("sync_status").default("active"),
  syncErrors: jsonb("sync_errors"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const calendarSyncLogs = pgTable("calendar_sync_logs", {
  id: text("id").primaryKey(),
  syncSettingId: text("sync_setting_id").notNull(),
  syncType: text("sync_type").notNull(),
  status: text("status").notNull(),
  eventsProcessed: integer("events_processed").default(0),
  eventsCreated: integer("events_created").default(0),
  eventsUpdated: integer("events_updated").default(0),
  eventsDeleted: integer("events_deleted").default(0),
  errors: jsonb("errors"),
  duration: integer("duration"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Online Booking System
export const bookingForms = pgTable("booking_forms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  sessionTypes: text("session_types").array(),
  fields: jsonb("fields"),
  requirements: jsonb("requirements"),
  pricing: jsonb("pricing"),
  availability: jsonb("availability"),
  confirmationMessage: text("confirmation_message"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const onlineBookings = pgTable("online_bookings", {
  id: text("id").primaryKey(),
  formId: text("form_id").notNull(),
  sessionId: text("session_id"),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  clientPhone: text("client_phone"),
  formData: jsonb("form_data"),
  requestedDate: timestamp("requested_date", { withTimezone: true }),
  requestedTime: text("requested_time"),
  sessionType: text("session_type").notNull(),
  status: text("status").default("pending"),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  processedBy: text("processed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Insert schemas
export const insertPhotographySessionSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  sessionType: z.string(),
  status: z.string().optional(),
  startTime: z.date(),
  endTime: z.date(),
  clientName: z.string().optional(),
  clientEmail: z.string().optional(),
  clientPhone: z.string().optional(),
  locationName: z.string().optional(),
  locationAddress: z.string().optional(),
  locationCoordinates: z.string().optional(),
  basePrice: z.number().optional(),
  depositAmount: z.number().optional(),
  depositPaid: z.boolean().optional(),
  finalPayment: z.number().optional(),
  finalPaymentPaid: z.boolean().optional(),
  equipmentList: z.array(z.string()).optional(),
  crewMembers: z.array(z.string()).optional(),
  weatherDependent: z.boolean().optional(),
  goldenHourOptimized: z.boolean().optional(),
  backupPlan: z.string().optional(),
  notes: z.string().optional(),
  portfolioWorthy: z.boolean().optional(),
  editingStatus: z.string().optional(),
  deliveryStatus: z.string().optional(),
  deliveryDate: z.date().optional(),
  galleryId: z.string().optional(),
  photographerId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  name: true,
  avatar: true,
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).pick({
  title: true,
  content: true,
  contentHtml: true,
  slug: true,
  excerpt: true,
  published: true,
  imageUrl: true,
  tags: true,
  publishedAt: true,
  scheduledFor: true,
  status: true,
  seoTitle: true,
  metaDescription: true,
  authorId: true,
});

export const insertCrmClientSchema = createInsertSchema(crmClients).pick({
  name: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  country: true,
  tags: true,
  notes: true,
  source: true,
  lifetime_value: true,
});

export const insertCrmLeadSchema = createInsertSchema(crmLeads).pick({
  name: true,
  email: true,
  phone: true,
  company: true,
  message: true,
  source: true,
  status: true,
  priority: true,
  tags: true,
  followUpDate: true,
  value: true,
});

export const insertGallerySchema = createInsertSchema(galleries).pick({
  title: true,
  description: true,
  slug: true,
  coverImage: true,
  isPublished: true,
  tags: true,
  password: true,
});

export const insertCrmInvoiceSchema = createInsertSchema(crmInvoices).pick({
  invoiceNumber: true,
  clientId: true,
  issueDate: true,
  dueDate: true,
  subtotal: true,
  taxAmount: true,
  total: true,
  status: true,
  notes: true,
  termsAndConditions: true,
}).partial({ invoiceNumber: true }); // Make invoiceNumber optional for automatic generation

export const insertCrmInvoiceItemSchema = createInsertSchema(crmInvoiceItems).pick({
  invoiceId: true,
  description: true,
  quantity: true,
  unitPrice: true,
  taxRate: true,
  sortOrder: true,
});

export const insertCrmMessageSchema = createInsertSchema(crmMessages).pick({
  senderName: true,
  senderEmail: true,
  subject: true,
  content: true,
  status: true,
  clientId: true,
  assignedTo: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPhotographySession = z.infer<typeof insertPhotographySessionSchema>;
export type PhotographySession = typeof photographySessions.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertCrmClient = z.infer<typeof insertCrmClientSchema>;
export type CrmClient = typeof crmClients.$inferSelect;
export type InsertCrmLead = z.infer<typeof insertCrmLeadSchema>;
export type CrmLead = typeof crmLeads.$inferSelect;
export type InsertGallery = z.infer<typeof insertGallerySchema>;
export type Gallery = typeof galleries.$inferSelect;
export type InsertCrmInvoice = z.infer<typeof insertCrmInvoiceSchema>;
export type CrmInvoice = typeof crmInvoices.$inferSelect;
export type InsertCrmInvoiceItem = z.infer<typeof insertCrmInvoiceItemSchema>;
export type CrmInvoiceItem = typeof crmInvoiceItems.$inferSelect;
export type CrmInvoicePayment = typeof crmInvoicePayments.$inferSelect;
export type InsertCrmInvoicePayment = typeof crmInvoicePayments.$inferInsert;
export type CrmMessage = typeof crmMessages.$inferSelect;
export type InsertCrmMessage = z.infer<typeof insertCrmMessageSchema>;
export type Gallery = typeof galleries.$inferSelect;
export type SessionEquipment = typeof sessionEquipment.$inferSelect;
export type SessionTask = typeof sessionTasks.$inferSelect;
export type SessionCommunication = typeof sessionCommunications.$inferSelect;
export type WeatherData = typeof weatherData.$inferSelect;
export type BusinessInsight = typeof businessInsights.$inferSelect;

// New types for template and studio management
export type StudioConfig = typeof studioConfigs.$inferSelect;
export type InsertStudioConfig = z.infer<typeof insertStudioConfigSchema>;
export type TemplateDefinition = typeof templateDefinitions.$inferSelect;
export type InsertTemplateDefinition = z.infer<typeof insertTemplateDefinitionSchema>;

// Voucher Product schemas
export const insertVoucherProductSchema = createInsertSchema(voucherProducts, {
  name: z.string().min(1, "Product name is required"),
  price: z.string().min(1, "Price is required"),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type InsertVoucherProduct = z.infer<typeof insertVoucherProductSchema>;
export type VoucherProduct = typeof voucherProducts.$inferSelect;

// Discount Coupon schemas
export const insertDiscountCouponSchema = createInsertSchema(discountCoupons, {
  code: z.string().min(1, "Coupon code is required"),
  name: z.string().min(1, "Coupon name is required"),
  discountType: z.enum(["percentage", "fixed_amount"]),
  discountValue: z.string().min(1, "Discount value is required"),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type InsertDiscountCoupon = z.infer<typeof insertDiscountCouponSchema>;
export type DiscountCoupon = typeof discountCoupons.$inferSelect;

// Voucher Sale schemas
export const insertVoucherSaleSchema = createInsertSchema(voucherSales, {
  purchaserName: z.string().min(1, "Purchaser name is required"),
  purchaserEmail: z.string().email("Valid email is required"),
  voucherCode: z.string().min(1, "Voucher code is required"),
  originalAmount: z.string().min(1, "Original amount is required"),
  finalAmount: z.string().min(1, "Final amount is required"),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type InsertVoucherSale = z.infer<typeof insertVoucherSaleSchema>;
export type VoucherSale = typeof voucherSales.$inferSelect;

// Coupon Usage schemas
export const insertCouponUsageSchema = createInsertSchema(couponUsage, {
  customerEmail: z.string().email("Valid email is required"),
  orderAmount: z.string().min(1, "Order amount is required"),
  discountAmount: z.string().min(1, "Discount amount is required"),
}).omit({ 
  id: true, 
  usedAt: true 
});

export type InsertCouponUsage = z.infer<typeof insertCouponUsageSchema>;
export type CouponUsage = typeof couponUsage.$inferSelect;

// Knowledge Base table
export const knowledgeBase = pgTable("knowledge_base", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  tags: text("tags").array().default([]),
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// OpenAI Assistants table
export const openaiAssistants = pgTable("openai_assistants", {
  id: uuid("id").primaryKey().defaultRandom(), // Database ID
  openaiAssistantId: text("openai_assistant_id"), // OpenAI assistant ID from API
  name: text("name").notNull(),
  description: text("description"),
  model: text("model").default("gpt-4o"),
  instructions: text("instructions").notNull(),
  isActive: boolean("is_active").default(true),
  knowledgeBaseIds: text("knowledge_base_ids").array().default([]),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Knowledge Base schemas
export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase, {
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  category: z.string().min(1, "Category is required"),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;

// OpenAI Assistant schemas
export const insertOpenaiAssistantSchema = createInsertSchema(openaiAssistants, {
  name: z.string().min(1, "Assistant name is required"),
  instructions: z.string().min(1, "Instructions are required"),
}).omit({ 
  id: true, // Let the database generate the OpenAI assistant ID
  createdAt: true, 
  updatedAt: true 
});

export type InsertOpenaiAssistant = z.infer<typeof insertOpenaiAssistantSchema>;
export type OpenaiAssistant = typeof openaiAssistants.$inferSelect;

// Admin User schemas
export const insertAdminUserSchema = createInsertSchema(adminUsers, {
  email: z.string().email("Valid email is required"),
  passwordHash: z.string().min(1, "Password hash is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  lastLoginAt: true
});

export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

// ========== MULTI-STUDIO AI OPERATOR TABLES ==========

// Studios table (main studio/tenant table)
export const studios = pgTable("studios", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  default_currency: text("default_currency").default("EUR"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Studio Integrations (credentials and settings per studio)
export const studioIntegrations = pgTable("studio_integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  studioId: uuid("studio_id").references(() => studios.id, { onDelete: "cascade" }).notNull(),
  
  // SMTP Configuration
  smtp_host: text("smtp_host"),
  smtp_port: integer("smtp_port").default(587),
  smtp_user: text("smtp_user"),
  smtp_pass_encrypted: text("smtp_pass_encrypted"),
  inbound_email_address: text("inbound_email_address"),
  default_from_email: text("default_from_email"),
  
  // Stripe Configuration
  stripe_account_id: text("stripe_account_id"),
  stripe_publishable_key: text("stripe_publishable_key"),
  stripe_secret_key_encrypted: text("stripe_secret_key_encrypted"),
  
  // OpenAI Configuration
  openai_api_key_encrypted: text("openai_api_key_encrypted"),
  
  // Currency and Regional Settings
  default_currency: text("default_currency").default("EUR"),
  timezone: text("timezone").default("Europe/Vienna"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI Policies (what the AI agent can do per studio)
export const aiPolicies = pgTable("ai_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  studioId: uuid("studio_id").references(() => studios.id, { onDelete: "cascade" }).notNull(),
  
  // Agent behavior mode
  mode: text("mode").notNull().default("read_only"), // "read_only", "propose", "auto_safe", "auto_all"
  
  // Specific authorities/permissions
  authorities: text("authorities").array().default([]), // ["READ_CLIENTS", "READ_LEADS", "DRAFT_EMAIL", etc.]
  
  // Limits and restrictions
  invoice_auto_limit: decimal("invoice_auto_limit", { precision: 10, scale: 2 }).default("0"),
  email_send_mode: text("email_send_mode").default("draft"), // "draft", "trusted", "auto"
  
  // Additional constraints
  max_daily_actions: integer("max_daily_actions").default(100),
  require_approval_above: decimal("require_approval_above", { precision: 10, scale: 2 }).default("500"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Agent Action Log (audit trail)
export const agentActionLog = pgTable("agent_action_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  studioId: uuid("studio_id").references(() => studios.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id),
  
  // Action details
  action_type: text("action_type").notNull(), // "READ_CLIENTS", "DRAFT_EMAIL", "SEND_INVOICE", etc.
  action_details: jsonb("action_details"), // Full details of what was done
  
  // Context
  assistant_id: text("assistant_id"), // OpenAI assistant ID that performed the action
  conversation_id: text("conversation_id"), // Link to conversation thread
  
  // Result
  success: boolean("success").default(true),
  error_message: text("error_message"),
  
  // Metadata
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Add studio_id to existing tables for multi-tenancy
// Note: This should be added to existing tables in migrations

// Schema types for new tables
export const insertStudioSchema = createInsertSchema(studios, {
  name: z.string().min(1, "Studio name is required"),
  slug: z.string().min(1, "Studio slug is required"),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertStudioIntegrationSchema = createInsertSchema(studioIntegrations, {
  studioId: z.string().uuid("Valid studio ID is required"),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertAiPolicySchema = createInsertSchema(aiPolicies, {
  studioId: z.string().uuid("Valid studio ID is required"),
  mode: z.enum(["read_only", "propose", "auto_safe", "auto_all"]),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertAgentActionLogSchema = createInsertSchema(agentActionLog, {
  studioId: z.string().uuid("Valid studio ID is required"),
  action_type: z.string().min(1, "Action type is required"),
}).omit({ 
  id: true, 
  createdAt: true 
});

// Type exports for new tables
export type Studio = typeof studios.$inferSelect;
export type InsertStudio = z.infer<typeof insertStudioSchema>;
export type StudioIntegration = typeof studioIntegrations.$inferSelect;
export type InsertStudioIntegration = z.infer<typeof insertStudioIntegrationSchema>;
export type AiPolicy = typeof aiPolicies.$inferSelect;
export type InsertAiPolicy = z.infer<typeof insertAiPolicySchema>;
export type AgentActionLog = typeof agentActionLog.$inferSelect;
export type InsertAgentActionLog = z.infer<typeof insertAgentActionLogSchema>;
