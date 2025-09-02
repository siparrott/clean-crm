import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export interface CheckoutSessionData {
  items: Array<{
    title: string;
    price: number;
    quantity: number;
  }>;
  appliedVoucher?: {
    code: string;
    discount: number;
    type: 'percentage' | 'fixed';
    stripePromotionCodeId?: string;
  };
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
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
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = data.items.map(item => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.title,
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card', 'sepa_debit'],
      line_items: lineItems,
      mode: 'payment',
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      customer_email: data.customerEmail,
      shipping_address_collection: {
        allowed_countries: ['DE', 'AT', 'CH'],
      },
      billing_address_collection: 'required',
      // Allow promotion codes to be entered in Stripe checkout
      allow_promotion_codes: true,
    };

    // If a voucher is pre-applied, add it as a discount
    if (data.appliedVoucher) {
      // Method 1: Use coupon directly
      if (data.appliedVoucher.type === 'percentage') {
        // Create or use existing coupon
        try {
          const coupon = await stripe.coupons.retrieve(data.appliedVoucher.code);
          sessionParams.discounts = [{ coupon: coupon.id }];
        } catch (error) {
          // Coupon doesn't exist, create it
          const newCoupon = await this.createCoupon({
            id: data.appliedVoucher.code,
            code: data.appliedVoucher.code,
            type: data.appliedVoucher.type,
            value: data.appliedVoucher.discount,
          });
          sessionParams.discounts = [{ coupon: newCoupon.id }];
        }
      }

      // Method 2: Use promotion code if available
      if (data.appliedVoucher.stripePromotionCodeId) {
        sessionParams.discounts = [{ 
          promotion_code: data.appliedVoucher.stripePromotionCodeId 
        }];
      }
    }

    // Add metadata for tracking
    sessionParams.metadata = {
      source: 'photography_website',
      voucher_used: data.appliedVoucher?.code || 'none',
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
