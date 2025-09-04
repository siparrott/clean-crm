import { Request, Response } from 'express';
import { StripeVoucherService, CheckoutSessionData } from '../services/stripeVoucherService';

export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const checkoutData: CheckoutSessionData = req.body;
    
    // Validate required fields
    if (!checkoutData.items || checkoutData.items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    // Add base URLs
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:10001';
    checkoutData.successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    checkoutData.cancelUrl = `${baseUrl}/cart`;

    const session = await StripeVoucherService.createCheckoutSession(checkoutData);

    res.json({ 
      sessionId: session.id, 
      url: session.url,
      success: true 
    });
  } catch (error) {
    console.error('Checkout creation failed:', error);
    res.status(500).json({ 
      error: 'Checkout creation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const handleCheckoutSuccess = async (req: Request, res: Response) => {
  try {
    const { session_id } = req.query;
    
    if (!session_id || typeof session_id !== 'string') {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const result = await StripeVoucherService.handleSuccessfulPayment(session_id);
    
    res.json({
      success: true,
      session: result.session,
      voucherUsed: result.voucherUsed,
    });
  } catch (error) {
    console.error('Checkout success handling failed:', error);
    res.status(500).json({ 
      error: 'Failed to process successful payment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const validateVoucherCode = async (req: Request, res: Response) => {
  try {
    const { code, cartTotal } = req.body;
    
    if (!code || typeof cartTotal !== 'number') {
      return res.status(400).json({ error: 'Voucher code and cart total required' });
    }

    // This would typically query your database
    // For now, we'll use the VoucherService validation
    const { VoucherService } = await import('../../client/src/services/voucherService');
    const result = await VoucherService.validateVoucherCode(code, cartTotal);
    
    res.json(result);
  } catch (error) {
    console.error('Voucher validation failed:', error);
    res.status(500).json({ 
      error: 'Voucher validation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
