import { 
  users,
  adminUsers,
  blogPosts,
  crmClients,
  crmLeads,
  crmInvoices,
  crmInvoiceItems,
  crmInvoicePayments,
  crmMessages,
  galleries,
  photographySessions,
  voucherProducts,
  discountCoupons,
  voucherSales,
  couponUsage,
  type User, 
  type InsertUser,
  type AdminUser,
  type InsertAdminUser,
  type BlogPost,
  type InsertBlogPost,
  type CrmClient,
  type InsertCrmClient,
  type CrmLead,
  type InsertCrmLead,
  type CrmInvoice,
  type InsertCrmInvoice,
  type CrmInvoiceItem,
  type InsertCrmInvoiceItem,
  type CrmInvoicePayment,
  type InsertCrmInvoicePayment,
  type CrmMessage,
  type InsertCrmMessage,
  type PhotographySession,
  type InsertPhotographySession,
  type Gallery,
  type InsertGallery,
  type VoucherProduct,
  type InsertVoucherProduct,
  type DiscountCoupon,
  type InsertDiscountCoupon,
  type VoucherSale,
  type InsertVoucherSale,
  type CouponUsage,
  type InsertCouponUsage
} from "../shared/schema.js";
import { db } from "./db";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import validator from "validator";

export interface IStorage {
  // Admin User management (authentication)
  getAdminUser(id: string): Promise<AdminUser | undefined>;
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;
  updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser>;
  deleteAdminUser(id: string): Promise<void>;

  // Legacy User management (CRM clients)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Blog management
  getBlogPosts(published?: boolean): Promise<BlogPost[]>;
  getBlogPost(id: string): Promise<BlogPost | undefined>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: string, updates: Partial<BlogPost>): Promise<BlogPost>;
  deleteBlogPost(id: string): Promise<void>;
  getAllBlogSlugs(): Promise<string[]>;
  savePublicAsset(bucket: string, filename: string, buffer: Buffer): Promise<string>;

  // CRM Client management
  getCrmClients(): Promise<CrmClient[]>;
  getCrmClient(id: string): Promise<CrmClient | undefined>;
  createCrmClient(client: InsertCrmClient): Promise<CrmClient>;
  updateCrmClient(id: string, updates: Partial<CrmClient>): Promise<CrmClient>;
  deleteCrmClient(id: string): Promise<void>;

  // CRM Lead management
  getCrmLeads(status?: string): Promise<CrmLead[]>;
  getCrmLead(id: string): Promise<CrmLead | undefined>;
  createCrmLead(lead: InsertCrmLead): Promise<CrmLead>;
  updateCrmLead(id: string, updates: Partial<CrmLead>): Promise<CrmLead>;
  deleteCrmLead(id: string): Promise<void>;

  // Photography Session management
  getPhotographySessions(photographerId?: string): Promise<PhotographySession[]>;
  getPhotographySession(id: string): Promise<PhotographySession | undefined>;
  createPhotographySession(session: InsertPhotographySession): Promise<PhotographySession>;
  updatePhotographySession(id: string, updates: Partial<PhotographySession>): Promise<PhotographySession>;
  deletePhotographySession(id: string): Promise<void>;

  // Gallery management
  getGalleries(): Promise<Gallery[]>;
  getGallery(id: string): Promise<Gallery | undefined>;
  getGalleryBySlug(slug: string): Promise<Gallery | undefined>;
  createGallery(gallery: InsertGallery): Promise<Gallery>;
  updateGallery(id: string, updates: Partial<Gallery>): Promise<Gallery>;
  deleteGallery(id: string): Promise<void>;

  // CRM Message management
  getCrmMessages(): Promise<CrmMessage[]>;
  getCrmMessage(id: string): Promise<CrmMessage | undefined>;
  createCrmMessage(message: InsertCrmMessage): Promise<CrmMessage>;
  updateCrmMessage(id: string, updates: Partial<CrmMessage>): Promise<CrmMessage>;
  deleteCrmMessage(id: string): Promise<void>;

  // Invoice management
  getCrmInvoices(): Promise<CrmInvoice[]>;
  getCrmInvoice(id: string): Promise<CrmInvoice | undefined>;
  createCrmInvoice(invoice: InsertCrmInvoice): Promise<CrmInvoice>;
  updateCrmInvoice(id: string, updates: Partial<CrmInvoice>): Promise<CrmInvoice>;
  deleteCrmInvoice(id: string): Promise<void>;
  
  // Invoice Items management
  getCrmInvoiceItems(invoiceId: string): Promise<CrmInvoiceItem[]>;
  createCrmInvoiceItems(items: InsertCrmInvoiceItem[]): Promise<CrmInvoiceItem[]>;
  
  // Invoice Payments management
  getCrmInvoicePayments(invoiceId: string): Promise<CrmInvoicePayment[]>;
  createCrmInvoicePayment(payment: InsertCrmInvoicePayment): Promise<CrmInvoicePayment>;
  deleteCrmInvoicePayment(paymentId: string): Promise<void>;

  // Voucher Products management
  getVoucherProducts(): Promise<VoucherProduct[]>;
  getVoucherProduct(id: string): Promise<VoucherProduct | undefined>;
  createVoucherProduct(product: InsertVoucherProduct): Promise<VoucherProduct>;
  updateVoucherProduct(id: string, updates: Partial<VoucherProduct>): Promise<VoucherProduct>;
  deleteVoucherProduct(id: string): Promise<void>;

  // Discount Coupons management
  getDiscountCoupons(): Promise<DiscountCoupon[]>;
  getDiscountCoupon(id: string): Promise<DiscountCoupon | undefined>;
  getDiscountCouponByCode(code: string): Promise<DiscountCoupon | undefined>;
  createDiscountCoupon(coupon: InsertDiscountCoupon): Promise<DiscountCoupon>;
  updateDiscountCoupon(id: string, updates: Partial<DiscountCoupon>): Promise<DiscountCoupon>;
  deleteDiscountCoupon(id: string): Promise<void>;

  // Voucher Sales management
  getVoucherSales(): Promise<VoucherSale[]>;
  getVoucherSale(id: string): Promise<VoucherSale | undefined>;
  getVoucherSaleByCode(code: string): Promise<VoucherSale | undefined>;
  createVoucherSale(sale: InsertVoucherSale): Promise<VoucherSale>;
  updateVoucherSale(id: string, updates: Partial<VoucherSale>): Promise<VoucherSale>;
  deleteVoucherSale(id: string): Promise<void>;

  // Coupon Usage management
  getCouponUsage(couponId: string): Promise<CouponUsage[]>;
  createCouponUsage(usage: InsertCouponUsage): Promise<CouponUsage>;
}

export class DatabaseStorage implements IStorage {
  // Admin User management (authentication)
  async getAdminUser(id: string): Promise<AdminUser | undefined> {
    const result = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
    return result[0];
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    const result = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    return result[0];
  }

  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    const result = await db.insert(adminUsers).values(user).returning();
    return result[0];
  }

  async updateAdminUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser> {
    const result = await db.update(adminUsers).set(updates).where(eq(adminUsers.id, id)).returning();
    return result[0];
  }

  async deleteAdminUser(id: string): Promise<void> {
    await db.delete(adminUsers).where(eq(adminUsers.id, id));
  }

  // Legacy User management (CRM clients)
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Blog management
  async getBlogPosts(published?: boolean): Promise<BlogPost[]> {
    let query = db.select().from(blogPosts);
    
    if (published !== undefined) {
      query = query.where(eq(blogPosts.published, published));
    }
    
    return await query.orderBy(desc(blogPosts.createdAt));
  }

  async getBlogPost(id: string): Promise<BlogPost | undefined> {
    const result = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
    return result[0];
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const result = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
    return result[0];
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const result = await db.insert(blogPosts).values(post).returning();
    return result[0];
  }

  async updateBlogPost(id: string, updates: Partial<BlogPost>): Promise<BlogPost> {
    const result = await db.update(blogPosts).set(updates).where(eq(blogPosts.id, id)).returning();
    return result[0];
  }

  async deleteBlogPost(id: string): Promise<void> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
  }

  // CRM Client management
  async getCrmClients(): Promise<CrmClient[]> {
    return await db.select().from(crmClients).orderBy(desc(crmClients.createdAt));
  }

  async getCrmClient(id: string): Promise<CrmClient | undefined> {
    const result = await db.select().from(crmClients).where(eq(crmClients.id, id)).limit(1);
    return result[0];
  }

  async createCrmClient(client: InsertCrmClient): Promise<CrmClient> {
    // Email validation - Fix #1 from triage playbook
    if (client.email && !validator.isEmail(client.email)) {
      throw new Error(`Invalid email address: ${client.email}. Please provide a valid email format.`);
    }
    
    const result = await db.insert(crmClients).values(client).returning();
    return result[0];
  }

  async updateCrmClient(id: string, updates: Partial<CrmClient>): Promise<CrmClient> {
    const result = await db.update(crmClients).set(updates).where(eq(crmClients.id, id)).returning();
    return result[0];
  }

  async deleteCrmClient(id: string): Promise<void> {
    await db.delete(crmClients).where(eq(crmClients.id, id));
  }

  // CRM Lead management
  async getCrmLeads(status?: string): Promise<CrmLead[]> {
    let query = db.select().from(crmLeads);
    
    if (status && status !== 'all') {
      query = query.where(eq(crmLeads.status, status));
    }
    
    return await query.orderBy(desc(crmLeads.createdAt));
  }

  async getCrmLead(id: string): Promise<CrmLead | undefined> {
    const result = await db.select().from(crmLeads).where(eq(crmLeads.id, id)).limit(1);
    return result[0];
  }

  async createCrmLead(lead: InsertCrmLead): Promise<CrmLead> {
    // Email validation - Fix #1 from triage playbook
    if (lead.email && !validator.isEmail(lead.email)) {
      throw new Error(`Invalid email address: ${lead.email}. Please provide a valid email format.`);
    }
    
    const result = await db.insert(crmLeads).values(lead).returning();
    return result[0];
  }

  async updateCrmLead(id: string, updates: Partial<CrmLead>): Promise<CrmLead> {
    const result = await db.update(crmLeads).set(updates).where(eq(crmLeads.id, id)).returning();
    return result[0];
  }

  async deleteCrmLead(id: string): Promise<void> {
    await db.delete(crmLeads).where(eq(crmLeads.id, id));
  }

  // Photography Session management
  async getPhotographySessions(photographerId?: string): Promise<PhotographySession[]> {
    let query = db.select().from(photographySessions);
    
    if (photographerId) {
      query = query.where(eq(photographySessions.photographerId, photographerId));
    }
    
    return await query.orderBy(asc(photographySessions.startTime));
  }

  async getPhotographySession(id: string): Promise<PhotographySession | undefined> {
    const result = await db.select().from(photographySessions).where(eq(photographySessions.id, id)).limit(1);
    return result[0];
  }

  async createPhotographySession(session: InsertPhotographySession): Promise<PhotographySession> {
    const result = await db.insert(photographySessions).values(session).returning();
    return result[0];
  }

  async updatePhotographySession(id: string, updates: Partial<PhotographySession>): Promise<PhotographySession> {
    const result = await db.update(photographySessions).set(updates).where(eq(photographySessions.id, id)).returning();
    return result[0];
  }

  async deletePhotographySession(id: string): Promise<void> {
    await db.delete(photographySessions).where(eq(photographySessions.id, id));
  }

  // Gallery management
  async getGalleries(): Promise<Gallery[]> {
    return await db.select().from(galleries).orderBy(desc(galleries.createdAt));
  }

  async getGallery(id: string): Promise<Gallery | undefined> {
    const result = await db.select().from(galleries).where(eq(galleries.id, id)).limit(1);
    return result[0];
  }

  async getGalleryBySlug(slug: string): Promise<Gallery | undefined> {
    const result = await db.select().from(galleries).where(eq(galleries.slug, slug)).limit(1);
    return result[0];
  }

  async createGallery(gallery: InsertGallery): Promise<Gallery> {
    const result = await db.insert(galleries).values(gallery).returning();
    return result[0];
  }

  async updateGallery(id: string, updates: Partial<Gallery>): Promise<Gallery> {
    const result = await db.update(galleries).set(updates).where(eq(galleries.id, id)).returning();
    return result[0];
  }

  async deleteGallery(id: string): Promise<void> {
    await db.delete(galleries).where(eq(galleries.id, id));
  }

  // Invoice management
  async getCrmInvoices(): Promise<any[]> {
    const result = await db.select({
      id: crmInvoices.id,
      invoice_number: crmInvoices.invoiceNumber,
      client_id: crmInvoices.clientId,
      issue_date: crmInvoices.issueDate,
      due_date: crmInvoices.dueDate,
      subtotal: crmInvoices.subtotal,
      tax_amount: crmInvoices.taxAmount,
      total: crmInvoices.total,
      status: crmInvoices.status,
      notes: crmInvoices.notes,
      created_at: crmInvoices.createdAt,
      client_name: sql`CONCAT(${crmClients.firstName}, ' ', ${crmClients.lastName})`,
      client_email: crmClients.email
    })
    .from(crmInvoices)
    .leftJoin(crmClients, eq(crmInvoices.clientId, crmClients.id))
    .orderBy(desc(crmInvoices.createdAt));
    return result;
  }

  async getCrmInvoice(id: string): Promise<CrmInvoice | undefined> {
    const result = await db.select().from(crmInvoices).where(eq(crmInvoices.id, id)).limit(1);
    return result[0];
  }

  async createCrmInvoice(invoice: InsertCrmInvoice): Promise<CrmInvoice> {
    // Generate invoice number if not provided
    if (!invoice.invoiceNumber) {
      const currentYear = new Date().getFullYear();
      const existingInvoices = await db.select().from(crmInvoices);
      const nextNumber = existingInvoices.length + 1;
      invoice.invoiceNumber = `${currentYear}-${String(nextNumber).padStart(4, '0')}`;
    }
    
    const result = await db.insert(crmInvoices).values(invoice).returning();
    return result[0];
  }

  async updateCrmInvoice(id: string, updates: Partial<CrmInvoice>): Promise<CrmInvoice> {
    const result = await db.update(crmInvoices).set(updates).where(eq(crmInvoices.id, id)).returning();
    return result[0];
  }

  async deleteCrmInvoice(id: string): Promise<void> {
    await db.delete(crmInvoices).where(eq(crmInvoices.id, id));
  }

  // Invoice Items management
  async getCrmInvoiceItems(invoiceId: string): Promise<CrmInvoiceItem[]> {
    const result = await db.select().from(crmInvoiceItems).where(eq(crmInvoiceItems.invoiceId, invoiceId)).orderBy(asc(crmInvoiceItems.sortOrder));
    return result;
  }

  async createCrmInvoiceItems(items: InsertCrmInvoiceItem[]): Promise<CrmInvoiceItem[]> {
    const result = await db.insert(crmInvoiceItems).values(items).returning();
    return result;
  }

  async getCrmInvoicePayments(invoiceId: string): Promise<CrmInvoicePayment[]> {
    const result = await db.select().from(crmInvoicePayments)
      .where(eq(crmInvoicePayments.invoiceId, invoiceId))
      .orderBy(desc(crmInvoicePayments.paymentDate));
    return result;
  }

  async createCrmInvoicePayment(payment: InsertCrmInvoicePayment): Promise<CrmInvoicePayment> {
    const result = await db.insert(crmInvoicePayments).values(payment).returning();
    return result[0];
  }

  async deleteCrmInvoicePayment(paymentId: string): Promise<void> {
    await db.delete(crmInvoicePayments).where(eq(crmInvoicePayments.id, paymentId));
  }

  // CRM Message methods
  async getCrmMessages(): Promise<CrmMessage[]> {
    return await db.select().from(crmMessages).orderBy(desc(crmMessages.createdAt));
  }

  async getCrmMessage(id: string): Promise<CrmMessage | undefined> {
    const results = await db.select().from(crmMessages).where(eq(crmMessages.id, id));
    return results[0];
  }

  async createCrmMessage(message: InsertCrmMessage): Promise<CrmMessage> {
    const results = await db.insert(crmMessages).values(message).returning();
    return results[0];
  }

  async updateCrmMessage(id: string, updates: Partial<CrmMessage>): Promise<CrmMessage> {
    const results = await db.update(crmMessages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(crmMessages.id, id))
      .returning();
    return results[0];
  }

  async deleteCrmMessage(id: string): Promise<void> {
    await db.delete(crmMessages).where(eq(crmMessages.id, id));
  }

  // Voucher Products management
  async getVoucherProducts(): Promise<VoucherProduct[]> {
    return await db.select().from(voucherProducts).orderBy(asc(voucherProducts.displayOrder), desc(voucherProducts.createdAt));
  }

  async getVoucherProduct(id: string): Promise<VoucherProduct | undefined> {
    const results = await db.select().from(voucherProducts).where(eq(voucherProducts.id, id));
    return results[0];
  }

  async createVoucherProduct(product: InsertVoucherProduct): Promise<VoucherProduct> {
    const results = await db.insert(voucherProducts).values(product).returning();
    return results[0];
  }

  async updateVoucherProduct(id: string, updates: Partial<VoucherProduct>): Promise<VoucherProduct> {
    const results = await db.update(voucherProducts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(voucherProducts.id, id))
      .returning();
    return results[0];
  }

  async deleteVoucherProduct(id: string): Promise<void> {
    await db.delete(voucherProducts).where(eq(voucherProducts.id, id));
  }

  // Discount Coupons management
  async getDiscountCoupons(): Promise<DiscountCoupon[]> {
    return await db.select().from(discountCoupons).orderBy(desc(discountCoupons.createdAt));
  }

  async getDiscountCoupon(id: string): Promise<DiscountCoupon | undefined> {
    const results = await db.select().from(discountCoupons).where(eq(discountCoupons.id, id));
    return results[0];
  }

  async getDiscountCouponByCode(code: string): Promise<DiscountCoupon | undefined> {
    const results = await db.select().from(discountCoupons).where(eq(discountCoupons.code, code));
    return results[0];
  }

  async createDiscountCoupon(coupon: InsertDiscountCoupon): Promise<DiscountCoupon> {
    const results = await db.insert(discountCoupons).values(coupon).returning();
    return results[0];
  }

  async updateDiscountCoupon(id: string, updates: Partial<DiscountCoupon>): Promise<DiscountCoupon> {
    const results = await db.update(discountCoupons)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(discountCoupons.id, id))
      .returning();
    return results[0];
  }

  async deleteDiscountCoupon(id: string): Promise<void> {
    await db.delete(discountCoupons).where(eq(discountCoupons.id, id));
  }

  // Voucher Sales management
  async getVoucherSales(): Promise<VoucherSale[]> {
    return await db.select().from(voucherSales).orderBy(desc(voucherSales.createdAt));
  }

  async getVoucherSale(id: string): Promise<VoucherSale | undefined> {
    const results = await db.select().from(voucherSales).where(eq(voucherSales.id, id));
    return results[0];
  }

  async getVoucherSaleByCode(code: string): Promise<VoucherSale | undefined> {
    const results = await db.select().from(voucherSales).where(eq(voucherSales.voucherCode, code));
    return results[0];
  }

  async createVoucherSale(sale: InsertVoucherSale): Promise<VoucherSale> {
    const results = await db.insert(voucherSales).values(sale).returning();
    return results[0];
  }

  async updateVoucherSale(id: string, updates: Partial<VoucherSale>): Promise<VoucherSale> {
    const results = await db.update(voucherSales)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(voucherSales.id, id))
      .returning();
    return results[0];
  }

  async deleteVoucherSale(id: string): Promise<void> {
    await db.delete(voucherSales).where(eq(voucherSales.id, id));
  }

  // Coupon Usage management
  async getCouponUsage(couponId: string): Promise<CouponUsage[]> {
    return await db.select().from(couponUsage).where(eq(couponUsage.couponId, couponId)).orderBy(desc(couponUsage.usedAt));
  }

  async createCouponUsage(usage: InsertCouponUsage): Promise<CouponUsage> {
    const results = await db.insert(couponUsage).values(usage).returning();
    return results[0];
  }

  // AutoBlog helper methods
  async getAllBlogSlugs(): Promise<string[]> {
    const results = await db.select({ slug: blogPosts.slug }).from(blogPosts);
    return results.map(r => r.slug);
  }

  async savePublicAsset(bucket: string, filename: string, buffer: Buffer): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Create directory structure if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'server', 'public', bucket);
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    // Save file
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);
    
    // Return absolute public URL that OpenAI can access
    const baseUrl = process.env.PUBLIC_SITE_BASE_URL || process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : 'http://localhost:5000';
    
    return `${baseUrl}/${bucket}/${filename}`;
  }
}

export const storage = new DatabaseStorage();
