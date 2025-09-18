import Stripe from 'stripe';
import { findCoupon, allowsSku, isCouponActive } from './coupons';
import { VoucherGenerationService, GeneratedVoucher } from './voucherGenerationService';

// Check if Stripe key is properly configured
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripe: Stripe | null = null;
let stripeConfigured = false;

// Validate Stripe configuration
if (!stripeSecretKey) {
  console.warn('⚠️  STRIPE_SECRET_KEY is missing from environment variables');
  console.warn('⚠️  Stripe payments will be disabled. Set STRIPE_SECRET_KEY to enable payments.');
} else if (stripeSecretKey.includes('dummy') || stripeSecretKey.includes('xxx') || stripeSecretKey.length < 20) {
  console.warn('⚠️  Invalid Stripe secret key detected. Please use a real test key from your Stripe dashboard.');
  console.warn('⚠️  Current key starts with:', stripeSecretKey.substring(0, 10) + '...');
  console.warn('⚠️  Stripe payments will be disabled.');
} else {
  try {
    stripe = new Stripe(stripeSecretKey, { 
      apiVersion: '2025-08-27.basil',
      typescript: true 
    });
    stripeConfigured = true;
    console.log('✅ Stripe configured successfully');
  } catch (error) {
    console.warn('⚠️  Failed to initialize Stripe:', error);
    console.warn('⚠️  Stripe payments will be disabled.');
  }
}

export interface CheckoutSessionData {
  items: Array<{
    productId?: string;
    sku?: string;
    name?: string;
    title?: string;
    price: number;
    quantity: number;
    description?: string;
  }>;
  appliedVoucher?: {
    code: string;
    discount: number;
    type: 'percentage' | 'fixed';
    stripePromotionCodeId?: string;
  };
  customerEmail?: string;
  voucherData?: any; // Voucher personalization data
  appliedVoucherCode?: string;
  discount?: number; // ignored in favor of server-side coupon calc
  mode?: string;
  paymentMethod?: string; // 'paypal', 'card', 'sofort'
  successUrl?: string;
  cancelUrl?: string;
}

export class StripeVoucherService {
  private static parseCustomCoupons(): Array<{
    code: string;
    type: 'percent' | 'amount';
    value: number; // percent value or amount in cents
    skus?: string[];
  }> {
    try {
      const raw = process.env.COUPONS_JSON;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((c: any) => c && typeof c.code === 'string')
        .map((c: any) => ({
          code: String(c.code).toUpperCase(),
          type: (String(c.type).toLowerCase() === 'amount' ? 'amount' : 'percent') as 'percent' | 'amount',
          value: Number(c.value) || 0,
          skus: Array.isArray(c.skus) ? c.skus.map((s: any) => String(s).toLowerCase()) : undefined,
        }));
    } catch {
      return [];
    }
  }

  private static deriveSkuFromName(name?: string): string | undefined {
    if (!name) return undefined;
    const n = name.toLowerCase();
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
  }

  private static applyCustomCouponToAmount(
    baseCents: number,
    coupon: { type: 'percent' | 'amount'; value: number }
  ): number {
    if (coupon.type === 'percent') {
      const pct = Math.max(0, Math.min(100, coupon.value));
      return Math.max(0, Math.round((baseCents * (100 - pct)) / 100));
    }
    return Math.max(0, baseCents - Math.max(0, Math.round(coupon.value)));
  }
  
  /**
   * Create a Stripe coupon for a voucher code
   */
  static async createCoupon(voucherCode: {
    id: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    maxRedemptions?: number;
    expiresAt?: Date;
  }): Promise<Stripe.Coupon> {
    const couponData: Stripe.CouponCreateParams = {
      id: voucherCode.code,
      name: `Voucher: ${voucherCode.code}`,
      duration: 'once',
    };

    if (voucherCode.type === 'percentage') {
      couponData.percent_off = voucherCode.value;
    } else {
      couponData.amount_off = voucherCode.value;
      couponData.currency = 'eur';
    }

    if (voucherCode.maxRedemptions) {
      couponData.max_redemptions = voucherCode.maxRedemptions;
    }

    if (voucherCode.expiresAt) {
      couponData.redeem_by = Math.floor(voucherCode.expiresAt.getTime() / 1000);
    }

    return await stripe.coupons.create(couponData);
  }

  /**
   * Create a promotion code for customer-facing use
   */
  static async createPromotionCode(couponId: string, code: string): Promise<Stripe.PromotionCode> {
    return await stripe.promotionCodes.create({
      coupon: couponId,
      code: code,
      active: true,
    });
  }

  /**
   * Create checkout session with voucher support
   */
  static async createCheckoutSession(data: CheckoutSessionData): Promise<Stripe.Checkout.Session> {
    if (!stripe || !stripeConfigured) {
      // Instead of throwing an error, return a mock success for demo purposes
      console.warn('⚠️  Stripe not configured, returning demo response');
      
      // Get the proper base URL for demo mode
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      
      // Create a mock session object that mimics Stripe's response
      const mockSession = {
        id: `demo_session_${Date.now()}`,
        url: `${baseUrl}/checkout/mock-success?session_id=demo_session_${Date.now()}`,
        object: 'checkout.session',
        payment_status: 'paid',
        success_url: data.successUrl,
        cancel_url: data.cancelUrl
      } as Stripe.Checkout.Session;

      console.log('Demo checkout session created:', mockSession.url);
      return mockSession;
    }

    try {
      // Set default URLs if not provided
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const successUrl = data.successUrl || `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = data.cancelUrl || `${baseUrl}/cart`;

  // Use live-reloading coupons service to find a matching custom coupon
  const appliedCode = data.appliedVoucherCode?.toUpperCase();
  const matchedCoupon = appliedCode ? findCoupon(appliedCode) : null;

      // If a custom coupon applies, compute discounted unit amounts per applicable SKU and always use dynamic price_data
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = data.items.map(item => {
        const name = item.name || item.title || 'Fotoshooting Gutschein';
        const qty = Math.max(1, Number(item.quantity) || 1);
        const baseCents = Math.max(0, Math.round(Number(item.price) || 0));
        let unitCents = baseCents;

        if (matchedCoupon && isCouponActive(matchedCoupon)) {
          const sku = item.sku || this.deriveSkuFromName(name);
          if (allowsSku(matchedCoupon as any, sku)) {
            unitCents = this.applyCustomCouponToAmount(baseCents, {
              type: matchedCoupon.type === 'amount' ? 'amount' : 'percent',
              value: matchedCoupon.value,
            });
          }
        }

        return {
          price_data: {
            currency: 'eur',
            product_data: {
              name,
              description: item.description,
            },
            unit_amount: unitCents,
          },
          quantity: qty,
        } as Stripe.Checkout.SessionCreateParams.LineItem;
      });

      // Configure payment methods based on user selection
      let paymentMethodTypes: string[] = ['card']; // Default to card
      
      if (data.paymentMethod) {
        switch (data.paymentMethod) {
          case 'card':
            paymentMethodTypes = ['card', 'klarna'];
            break;
          default:
            paymentMethodTypes = ['card', 'klarna'];
        }
      } else {
        // If no specific method selected, offer all available options
        paymentMethodTypes = ['card', 'klarna'];
      }

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: paymentMethodTypes as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
        line_items: lineItems,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: data.customerEmail,
        shipping_address_collection: {
          allowed_countries: ['DE', 'AT', 'CH'],
        },
        billing_address_collection: 'required',
  // Never allow Stripe promo codes; prices are pre-discounted server-side
  allow_promotion_codes: false,
        locale: 'de',
      };

      // Never attach Stripe discounts when using custom coupons

      // Add metadata for tracking
      sessionParams.metadata = {
        source: 'photography_website',
        voucher_used: data.appliedVoucherCode || data.appliedVoucher?.code || 'none',
        mode: data.mode || 'standard',
        payment_method_preference: data.paymentMethod || 'card',
        voucher_data: data.voucherData ? JSON.stringify(data.voucherData).substring(0, 500) : '', // Stripe metadata limit
      };

      console.log('Creating Stripe checkout session with params:', {
        lineItems: lineItems.length,
        discounts: sessionParams.discounts?.length || 0,
        paymentMethods: paymentMethodTypes,
        successUrl,
        cancelUrl
      });

      const session = await stripe.checkout.sessions.create(sessionParams);
      
      console.log('Stripe checkout session created successfully:', session.id);
      return session;

    } catch (error) {
      console.error('Stripe checkout session creation failed:', error);
      throw new Error(`Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve checkout session
   */
  static async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    if (!stripe || !stripeConfigured) {
      throw new Error('Stripe is not properly configured. Please check your STRIPE_SECRET_KEY.');
    }
    
    return await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'total_details'],
    });
  }

  /**
   * Handle successful payment and voucher usage tracking
   */
  static async handleSuccessfulPayment(sessionId: string): Promise<{
    session: Stripe.Checkout.Session;
    voucherUsed?: string;
    generatedVoucher?: GeneratedVoucher;
  }> {
    // Handle demo session case
    if (sessionId.startsWith('demo_session_')) {
      console.log('Handling demo payment session:', sessionId);
      
      // Create a mock session response for demo
      const mockSession = {
        id: sessionId,
        object: 'checkout.session',
        payment_status: 'paid',
        customer_email: 'demo@example.com',
        metadata: {},
        total_details: {
          amount_total: 19500, // €195.00 in cents
        }
      } as unknown as Stripe.Checkout.Session;

      // Generate a demo voucher
      const generatedVoucher = await VoucherGenerationService.createGiftVoucher({
        recipientEmail: 'demo@example.com',
        recipientName: 'Demo User',
        amount: 195.00,
        type: 'Fotoshooting Gutschein',
        message: 'This is a demo voucher - payment system is being configured',
        deliveryMethod: 'email'
      });

      return {
        session: mockSession,
        generatedVoucher
      };
    }

    if (!stripe || !stripeConfigured) {
      throw new Error('Stripe is not properly configured. Please check your STRIPE_SECRET_KEY.');
    }

    const session = await this.retrieveSession(sessionId);
    
    // Track voucher usage if applicable
    const voucherUsed = session.metadata?.voucher_used;
    if (voucherUsed && voucherUsed !== 'none') {
      await this.trackVoucherUsage(voucherUsed, session.customer_email as string);
    }

    // Generate new voucher if this was a voucher purchase
    let generatedVoucher: GeneratedVoucher | undefined;
    
    if (session.metadata?.voucher_data) {
      try {
        const voucherData = JSON.parse(session.metadata.voucher_data);
        
        // Create the voucher with sequential security code
        generatedVoucher = await VoucherGenerationService.createGiftVoucher({
          recipientEmail: voucherData.recipientEmail || session.customer_email || '',
          recipientName: voucherData.recipientName,
          amount: session.amount_total || 0,
          type: voucherData.type || 'Fotoshooting Gutschein',
          message: voucherData.message,
          deliveryMethod: voucherData.deliveryMethod || 'email',
          deliveryDate: voucherData.deliveryDate ? new Date(voucherData.deliveryDate) : undefined,
          senderName: voucherData.senderName,
          senderEmail: session.customer_email || undefined
        });

        console.log('Generated voucher with security code:', generatedVoucher.securityCode);
        
        // Send voucher email or schedule delivery
        if (generatedVoucher.deliveryMethod === 'email') {
          await this.sendVoucherEmail(generatedVoucher);
        }
        
      } catch (error) {
        console.error('Error generating voucher:', error);
      }
    }

    return {
      session,
      voucherUsed: voucherUsed !== 'none' ? voucherUsed : undefined,
      generatedVoucher
    };
  }

  /**
   * Send voucher email to recipient
   */
  private static async sendVoucherEmail(voucher: GeneratedVoucher): Promise<void> {
    try {
      const voucherDocument = VoucherGenerationService.generateVoucherDocument(voucher);
      
      // Here you would integrate with your email service (SendGrid, etc.)
      console.log('Voucher email would be sent to:', voucher.recipientEmail);
      console.log('Security code:', voucher.securityCode);
      
      // Example email service integration:
      // await emailService.send({
      //   to: voucher.recipientEmail,
      //   subject: 'Ihr Geschenkgutschein von New Age Fotografie',
      //   html: voucherDocument.htmlContent,
      //   attachments: voucherDocument.pdfBuffer ? [{
      //     filename: `Gutschein_${voucher.securityCode}.pdf`,
      //     content: voucherDocument.pdfBuffer
      //   }] : []
      // });
      
    } catch (error) {
      console.error('Error sending voucher email:', error);
    }
  }

  /**
   * Track voucher usage in your database
   */
  private static async trackVoucherUsage(voucherCode: string, customerEmail: string): Promise<void> {
    // Implementation depends on your database
    // This could update a voucher usage table, increment counters, etc.
    console.log(`Voucher ${voucherCode} used by ${customerEmail}`);
    
    // Example database update:
    // await db.voucherUsage.create({
    //   voucherCode,
    //   customerEmail,
    //   usedAt: new Date(),
    // });
    
    // await db.voucherCodes.update({
    //   where: { code: voucherCode },
    //   data: { usedCount: { increment: 1 } }
    // });
  }
}

// Example usage in your API endpoint:
export async function createPhotographyCheckout(req: any, res: any) {
  try {
    const checkoutData: CheckoutSessionData = req.body;
    
    const session = await StripeVoucherService.createCheckoutSession({
      ...checkoutData,
      successUrl: `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.FRONTEND_URL}/cart`,
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout creation failed:', error);
    res.status(500).json({ error: 'Checkout creation failed' });
  }
}
