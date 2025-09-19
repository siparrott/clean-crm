import React, { useState, useEffect } from 'react';
import { ShoppingCart, CreditCard, Mail, MapPin, Gift, Edit2, ChevronDown, ArrowLeft } from 'lucide-react';
import VoucherCodeInput from '../cart/VoucherCodeInput';
import type { VoucherPersonalizationData } from './VoucherPersonalization';

interface EnhancedCheckoutPageProps {
  voucherData?: VoucherPersonalizationData;
  baseAmount: number;
  onCheckout: (checkoutData: CheckoutData) => void;
  productSlug?: string;
  initialVoucher?: { code: string; discountCents: number };
  onBack?: () => void;
}

interface CheckoutData {
  email: string;
  voucherData: VoucherPersonalizationData;
  paymentMethod: string;
  appliedVoucherCode?: string;
  discount?: number;
}

const EnhancedCheckoutPage: React.FC<EnhancedCheckoutPageProps> = ({
  voucherData,
  baseAmount,
  onCheckout,
  productSlug,
  initialVoucher,
  onBack
}) => {
  const [email, setEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<string>();
  const [discount, setDiscount] = useState(0);
  const [showVoucherInput, setShowVoucherInput] = useState(false);

  const deliveryAmount = voucherData?.deliveryOption.price || 0;
  const subtotal = baseAmount + deliveryAmount;
  const total = subtotal - discount;

  // Prefill from cart-applied voucher if provided
  useEffect(() => {
    if (initialVoucher && initialVoucher.code) {
      setAppliedVoucherCode(initialVoucher.code);
      setDiscount(Math.max(0, (initialVoucher.discountCents || 0) / 100));
      setShowVoucherInput(false);
    }
  }, [initialVoucher]);

  // Map productSlug to a clear product name for Stripe line item naming/matching
  const productNameFromSlug = (slug?: string): string | undefined => {
    if (!slug) return undefined;
    const s = slug.toLowerCase();
    if (s.startsWith('maternity-')) {
      const tier = s.split('-')[1] || '';
      const cap = tier.charAt(0).toUpperCase() + tier.slice(1);
      return `Schwangerschafts Fotoshooting - ${cap}`;
    }
    if (s.startsWith('family-')) {
      const tier = s.split('-')[1] || '';
      const cap = tier.charAt(0).toUpperCase() + tier.slice(1);
      return `Family Fotoshooting - ${cap}`;
    }
    if (s.startsWith('newborn-')) {
      const tier = s.split('-')[1] || '';
      const cap = tier.charAt(0).toUpperCase() + tier.slice(1);
      return `Newborn Fotoshooting - ${cap}`;
    }
    return undefined;
  };

  // Backend validation for voucher codes using product context
  const applyVoucherViaBackend = async (code: string): Promise<{ success: boolean; discount?: number; message: string }> => {
    try {
      const response = await fetch('/api/vouchers/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          orderAmount: Math.round(subtotal * 100) / 100,
          items: [
            {
              productSlug: productSlug,
              sku: productSlug,
              name: productNameFromSlug(productSlug) || `Fotoshooting Gutschein - ${voucherData?.selectedDesign?.occasion || 'Personalisiert'}`,
              price: baseAmount,
              quantity: 1,
            },
          ],
        }),
      });
      const result = await response.json();
      if (response.ok && result.valid && result.coupon) {
        const discountAmount = Math.round(parseFloat(result.coupon.discountAmount) * 100);
        setAppliedVoucherCode(result.coupon.code);
        setDiscount(discountAmount / 100);
        setShowVoucherInput(false);
        return { success: true, discount: discountAmount, message: 'Gutscheincode erfolgreich angewendet!' };
      }
      return { success: false, message: result.error || 'Ungültiger Gutscheincode' };
    } catch (err) {
      return { success: false, message: 'Validierung fehlgeschlagen. Bitte erneut versuchen.' };
    }
  };

  const handleVoucherRemoved = () => {
    setAppliedVoucherCode(undefined);
    setDiscount(0);
  };

  const handleCheckout = async (selectedPaymentMethod?: string) => {
    if (!email.trim() || !voucherData) return;

    const finalPaymentMethod = selectedPaymentMethod || paymentMethod;

    try {
      // Create Stripe checkout session for voucher
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            // Voucher item (eligible for discount)
            {
              name: productNameFromSlug(productSlug) || `Fotoshooting Gutschein - ${voucherData.selectedDesign?.occasion || 'Personalisiert'}`,
              price: Math.round(baseAmount * 100),
              quantity: 1,
              sku: productSlug,
              description: 'Gutschein'
            },
            // Delivery item (NOT eligible for discount)
            ...(deliveryAmount > 0 ? [{
              name: `Gutschein Lieferung - ${voucherData.deliveryOption.name}`,
              price: Math.round(deliveryAmount * 100),
              quantity: 1,
              sku: `delivery-${(voucherData.deliveryOption.name || 'standard').toLowerCase()}`,
              description: 'Lieferkosten'
            }] : [])
          ],
          customerEmail: email.trim(),
          voucherData: {
            ...voucherData,
            customPhoto: voucherData.customPhoto ? 'uploaded' : null // Don't send file object
          },
          appliedVoucherCode,
          discount: Math.round(discount * 100),
          mode: 'voucher',
          paymentMethod: finalPaymentMethod
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server responded with error:', errorData);
        return; // Don't show error alerts since Stripe is working
      }

      const result = await response.json();
      
      if (result.url) {
        // Redirect to checkout page (either Stripe or demo)
        window.location.href = result.url;
      } else {
        console.log('No URL returned from checkout API');
      }
      
    } catch (error) {
      console.error('Checkout error:', error);
      // Stripe checkout is working properly, so no need for error alerts
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">TN</span>
              </div>
              <span className="font-semibold">TogNinja</span>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <Mail size={20} />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full relative">
                <ShoppingCart size={20} />
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  1
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb + Back */}
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center text-purple-600 hover:text-purple-700 text-sm"
          >
            <ArrowLeft size={18} className="mr-1" />
            Zurück zur Personalisierung
          </button>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>Warenkorb</span>
            <ChevronDown size={16} className="rotate-[-90deg]" />
            <span className="text-gray-900 font-medium">Kasse</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Email Address */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">E-Mail Adresse eingeben</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ihre-email@beispiel.de"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleCheckout();
                }}
                disabled={!email.trim() || !voucherData}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <span>Weiter</span>
              </button>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Zahlungsart</h3>
              <div className="space-y-3">
                <label 
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => email.trim() && voucherData && handleCheckout('card')}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="text-blue-600"
                  />
                  <CreditCard size={20} className="text-gray-600" />
                  <span>Kreditkarte / Debitkarte / Klarna</span>
                  {paymentMethod === 'card' && email.trim() && voucherData && (
                    <span className="ml-auto text-sm text-green-600">✓ Bereit zum Checkout</span>
                  )}
                </label>
              </div>
              
              {(!email.trim() || !voucherData) && (
                <p className="text-sm text-gray-500 mt-3">
                  Bitte geben Sie Ihre E-Mail-Adresse ein, um eine Zahlungsart zu wählen.
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="space-y-6">
            {/* Voucher Details */}
            {voucherData && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                    {voucherData.customPhoto ? (
                      <img 
                        src={URL.createObjectURL(voucherData.customPhoto)}
                        alt="Custom voucher"
                        className="w-full h-full object-cover"
                      />
                    ) : voucherData.selectedDesign ? (
                      <img 
                        src={voucherData.selectedDesign.image}
                        alt={voucherData.selectedDesign.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center text-gray-400">
                              <Gift size="24" />
                            </div>
                          `;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Gift size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Fotoshooting Gutschein</h3>
                    <p className="text-sm text-gray-600">
                      {voucherData.selectedDesign?.occasion || 'Eigenes Foto'}
                    </p>
                    {voucherData.personalMessage && (
                      <p className="text-sm text-gray-600 mt-1 italic">
                        "{voucherData.personalMessage.substring(0, 50)}..."
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{baseAmount.toFixed(2)} €</p>
                  </div>
                </div>

                {/* Delivery Method */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">1</span>
                      <span className="text-sm">{voucherData.deliveryOption.name}</span>
                    </div>
                    <span className="text-sm font-medium">
                      {voucherData.deliveryOption.price === 0 ? 'Kostenlos' : `${voucherData.deliveryOption.price.toFixed(2)} €`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Bestellübersicht</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Zwischensumme</span>
                  <span>{baseAmount.toFixed(2)} €</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Versandkosten</span>
                  <span>{deliveryAmount === 0 ? 'Kostenlos' : `${deliveryAmount.toFixed(2)} €`}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Rabatt ({appliedVoucherCode})</span>
                    <span>-{discount.toFixed(2)} €</span>
                  </div>
                )}

                <div className="border-t pt-3">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Gesamtpreis</span>
                    <span>{total.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              {/* Voucher Code Section */}
              <div className="mt-6 pt-4 border-t">
                {!appliedVoucherCode ? (
                  <button
                    onClick={() => setShowVoucherInput(!showVoucherInput)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                  >
                    <Gift size={16} />
                    <span>Geschenkkarte oder Rabattcode</span>
                    <ChevronDown size={16} className={showVoucherInput ? 'rotate-180' : ''} />
                  </button>
                ) : (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Gift size={16} className="text-green-600" />
                        <span className="text-sm text-green-800">
                          Code "{appliedVoucherCode}" angewendet
                        </span>
                      </div>
                      <button
                        onClick={handleVoucherRemoved}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Entfernen
                      </button>
                    </div>
                  </div>
                )}
                
                {showVoucherInput && !appliedVoucherCode && (
                  <div className="mt-3">
                    <VoucherCodeInput
                      onApplyVoucher={async (code) => applyVoucherViaBackend(code)}
                      subtotal={subtotal}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Trust Badges */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center space-x-4">
                  <div className="flex items-center space-x-1 text-green-600">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-sm">SSL Verschlüsselt</span>
                  </div>
                  <div className="flex items-center space-x-1 text-green-600">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-sm">Sicher</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Ihre Daten werden verschlüsselt übertragen
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedCheckoutPage;
