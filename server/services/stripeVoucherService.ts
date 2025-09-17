import Stripe from 'stripe';
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
  discount?: number;
  mode?: string;
  paymentMethod?: string; // 'paypal', 'card', 'sofort'
  successUrl?: string;
  cancelUrl?: string;
}

export class StripeVoucherService {
  
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

      // Prefer preconfigured Stripe Prices for specific Basic vouchers so promotion codes scoped by product apply
      const PRICE_ID_PREGNANCY = process.env.STRIPE_PRICE_ID_PREGNANCY_BASIC || process.env.VCWIEN_PRICE_ID_PREGNANCY_BASIC;
      const PRICE_ID_FAMILY = process.env.STRIPE_PRICE_ID_FAMILY_BASIC || process.env.VCWIEN_PRICE_ID_FAMILY_BASIC;
      const PRICE_ID_NEWBORN = process.env.STRIPE_PRICE_ID_NEWBORN_BASIC || process.env.VCWIEN_PRICE_ID_NEWBORN_BASIC;

      const normalize = (s?: string) => (s || '').toLowerCase().replace(/[\u2013\u2014]/g, '-').trim();
      const matchesPregnancy = (n: string) => {
        const name = normalize(n);
        return name.includes('schwangerschaft') && name.includes('basic');
      };
      const matchesFamily = (n: string) => normalize(n) === 'family basic' || (normalize(n).includes('family') && normalize(n).includes('basic'));
      const matchesNewborn = (n: string) => {
        const name = normalize(n);
        return name.includes('newborn') && name.includes('basic');
      };

      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = data.items.map(item => {
        const name = item.name || item.title || '';
        const qty = item.quantity;
        if (PRICE_ID_PREGNANCY && matchesPregnancy(name)) {
          return { price: PRICE_ID_PREGNANCY, quantity: qty } as Stripe.Checkout.SessionCreateParams.LineItem;
        }
        if (PRICE_ID_FAMILY && matchesFamily(name)) {
          return { price: PRICE_ID_FAMILY, quantity: qty } as Stripe.Checkout.SessionCreateParams.LineItem;
        }
        if (PRICE_ID_NEWBORN && matchesNewborn(name)) {
          return { price: PRICE_ID_NEWBORN, quantity: qty } as Stripe.Checkout.SessionCreateParams.LineItem;
        }
        // Fallback: dynamic price_data for all other items
        return {
          price_data: {
            currency: 'eur',
            product_data: {
              name: item.name || item.title || 'Fotoshooting Gutschein',
              description: item.description,
            },
            unit_amount: Math.round(item.price),
          },
          quantity: item.quantity,
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
        // Allow promotion codes to be entered in Stripe checkout
        allow_promotion_codes: true,
        locale: 'de',
      };

      // Handle voucher code discount
      if (data.appliedVoucherCode && data.discount && data.discount > 0) {
        try {
          // Try to create or retrieve coupon for the discount
          const coupon = await stripe.coupons.create({
            id: `voucher_${data.appliedVoucherCode}_${Date.now()}`,
            name: `Gutschein: ${data.appliedVoucherCode}`,
            amount_off: Math.round(data.discount), // Already in cents
            currency: 'eur',
            duration: 'once',
          });
          sessionParams.discounts = [{ coupon: coupon.id }];
        } catch (error) {
          console.warn('Could not apply voucher discount:', error);
        }
      }

      // If a voucher is pre-applied via the old method
      if (data.appliedVoucher) {
        try {
          if (data.appliedVoucher.type === 'percentage') {
            const coupon = await stripe.coupons.create({
              id: `voucher_${data.appliedVoucher.code}_${Date.now()}`,
              name: `Gutschein: ${data.appliedVoucher.code}`,
              percent_off: data.appliedVoucher.discount,
              duration: 'once',
            });
            sessionParams.discounts = [{ coupon: coupon.id }];
          } else {
            const coupon = await stripe.coupons.create({
              id: `voucher_${data.appliedVoucher.code}_${Date.now()}`,
              name: `Gutschein: ${data.appliedVoucher.code}`,
              amount_off: data.appliedVoucher.discount,
              currency: 'eur',
              duration: 'once',
            });
            sessionParams.discounts = [{ coupon: coupon.id }];
          }
        } catch (error) {
          console.warn('Could not apply voucher discount:', error);
        }
      }

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
