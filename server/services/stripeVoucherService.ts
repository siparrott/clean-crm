import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export interface CheckoutSessionData {
  items: Array<{
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
    // Set default URLs if not provided
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:10000';
    const successUrl = data.successUrl || `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = data.cancelUrl || `${baseUrl}/cart`;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = data.items.map(item => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.name || item.title || 'Fotoshooting Gutschein',
          description: item.description,
        },
        unit_amount: Math.round(item.price), // Already in cents from frontend
      },
      quantity: item.quantity,
    }));

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
      payment_method_types: paymentMethodTypes,
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

    return await stripe.checkout.sessions.create(sessionParams);
  }

  /**
   * Retrieve checkout session
   */
  static async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
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
  }> {
    const session = await this.retrieveSession(sessionId);
    
    // Track voucher usage if applicable
    const voucherUsed = session.metadata?.voucher_used;
    if (voucherUsed && voucherUsed !== 'none') {
      // Update your database to increment voucher usage count
      await this.trackVoucherUsage(voucherUsed, session.customer_email as string);
    }

    return {
      session,
      voucherUsed: voucherUsed !== 'none' ? voucherUsed : undefined,
    };
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
