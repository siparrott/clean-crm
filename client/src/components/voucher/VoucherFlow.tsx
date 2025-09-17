import React, { useState, useEffect } from 'react';
import VoucherPersonalization, { type VoucherPersonalizationData } from './VoucherPersonalization';
import EnhancedCheckoutPage from './EnhancedCheckoutPage';
import { ArrowLeft } from 'lucide-react';

interface VoucherFlowProps {
  voucherType: string;
  baseAmount: number;
  onComplete: (checkoutData: any) => void;
  onBack?: () => void;
  productSlug?: string;
  initialVoucher?: { code: string; discountCents: number };
}

type FlowStep = 'personalization' | 'checkout' | 'confirmation';

const VoucherFlow: React.FC<VoucherFlowProps> = ({
  voucherType,
  baseAmount,
  onComplete,
  onBack,
  productSlug,
  initialVoucher,
}) => {
  // Use sessionStorage to persist voucher flow state
  const getStoredStep = (): FlowStep => {
    try {
      const stored = sessionStorage.getItem(`voucher_flow_step_${voucherType}`);
      return (stored as FlowStep) || 'personalization';
    } catch {
      return 'personalization';
    }
  };

  const getStoredVoucherData = (): VoucherPersonalizationData | null => {
    try {
      const stored = sessionStorage.getItem(`voucher_flow_data_${voucherType}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const [currentStep, setCurrentStep] = useState<FlowStep>(getStoredStep);
  const [voucherData, setVoucherData] = useState<VoucherPersonalizationData | null>(getStoredVoucherData);

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    try {
      sessionStorage.setItem(`voucher_flow_step_${voucherType}`, currentStep);
    } catch (error) {
      console.warn('Failed to save voucher flow step to sessionStorage:', error);
    }
  }, [currentStep, voucherType]);

  useEffect(() => {
    try {
      if (voucherData) {
        sessionStorage.setItem(`voucher_flow_data_${voucherType}`, JSON.stringify(voucherData));
      } else {
        sessionStorage.removeItem(`voucher_flow_data_${voucherType}`);
      }
    } catch (error) {
      console.warn('Failed to save voucher flow data to sessionStorage:', error);
    }
  }, [voucherData, voucherType]);

  // Cleanup session storage if user navigates away from voucher flow entirely
  useEffect(() => {
    return () => {
      // Only cleanup if we're not in checkout step (to preserve during Stripe redirect)
      if (currentStep !== 'checkout') {
        try {
          sessionStorage.removeItem(`voucher_flow_step_${voucherType}`);
          sessionStorage.removeItem(`voucher_flow_data_${voucherType}`);
        } catch (error) {
          console.warn('Failed to cleanup voucher flow data from sessionStorage:', error);
        }
      }
    };
  }, [currentStep, voucherType]);

  const handlePersonalizationComplete = (data: VoucherPersonalizationData) => {
    setVoucherData(data);
    setCurrentStep('checkout');
  };

  const handleCheckoutComplete = (checkoutData: any) => {
    // Since EnhancedCheckoutPage now redirects to Stripe directly,
    // this might not be called. But if it is, we handle it gracefully.
    console.log('Checkout initiated with Stripe:', checkoutData);
    
    // Clear session storage when checkout is complete
    try {
      sessionStorage.removeItem(`voucher_flow_step_${voucherType}`);
      sessionStorage.removeItem(`voucher_flow_data_${voucherType}`);
    } catch (error) {
      console.warn('Failed to clear voucher flow data from sessionStorage:', error);
    }
    
    // The actual completion will happen on the Stripe success page
    // For now, we can just show a loading state or redirect
    setCurrentStep('confirmation');
  };

  const handleBackToPersonalization = () => {
    setCurrentStep('personalization');
  };

  const handleBackToCart = () => {
    // Clear session storage when going back to cart
    try {
      sessionStorage.removeItem(`voucher_flow_step_${voucherType}`);
      sessionStorage.removeItem(`voucher_flow_data_${voucherType}`);
    } catch (error) {
      console.warn('Failed to clear voucher flow data from sessionStorage:', error);
    }
    
    if (onBack) {
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      {currentStep !== 'personalization' && (
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <button
              onClick={currentStep === 'checkout' ? handleBackToPersonalization : handleBackToCart}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>
                {currentStep === 'checkout' ? 'Zurück zur Personalisierung' : 'Zurück zum Warenkorb'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Step Content */}
      {currentStep === 'personalization' && (
        <VoucherPersonalization
          voucherAmount={baseAmount}
          onComplete={handlePersonalizationComplete}
        />
      )}

      {currentStep === 'checkout' && voucherData && (
        <EnhancedCheckoutPage
          voucherData={voucherData}
          baseAmount={baseAmount}
          productSlug={productSlug}
          initialVoucher={initialVoucher}
          onCheckout={handleCheckoutComplete}
        />
      )}

      {currentStep === 'confirmation' && (
        <div className="max-w-2xl mx-auto pt-16 px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Vielen Dank für Ihre Bestellung!
            </h1>
            <p className="text-gray-600 mb-6">
              Ihr personalisierter Gutschein wird entsprechend Ihrer gewählten Versandart zugestellt.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">Bestelldetails:</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Gutschein: {voucherType}</p>
                <p>Versandart: {voucherData?.deliveryOption.name}</p>
                <p>Betrag: {baseAmount.toFixed(2)} €</p>
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Zur Startseite
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoucherFlow;
