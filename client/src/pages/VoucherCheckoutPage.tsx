import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { ArrowLeft, Calendar, Clock, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import VoucherPersonalization from '@/components/VoucherPersonalization';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

// Only load Stripe if we have a valid key
const stripePromise = STRIPE_PUBLIC_KEY ? loadStripe(STRIPE_PUBLIC_KEY) : null;

interface VoucherProduct {
  id: string;
  name: string;
  description: string;
  price: string;
  originalPrice?: string;
  imageUrl: string;
  sessionDuration: number;
  validityPeriod: number;
  termsAndConditions?: string;
}

interface PersonalizationData {
  designType: 'none' | 'birthday' | 'christmas' | 'mothers-day' | 'fathers-day' | 'custom';
  customPhoto?: File;
  message?: string;
  recipientName?: string;
}

const CheckoutForm: React.FC<{ voucher: VoucherProduct }> = ({ voucher }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [personalization, setPersonalization] = useState<PersonalizationData>({ designType: 'none' });
  const [customerDetails, setCustomerDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  const totalPrice = parseFloat(voucher.price) * quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!acceptedTerms) {
      toast({
        title: "Geschäftsbedingungen erforderlich",
        description: "Bitte akzeptieren Sie die Geschäftsbedingungen um fortzufahren.",
        variant: "destructive",
      });
      return;
    }

    if (!customerDetails.firstName || !customerDetails.lastName || !customerDetails.email) {
      toast({
        title: "Fehlende Informationen",
        description: "Bitte füllen Sie alle erforderlichen Felder aus.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment intent for voucher purchase
      const response = await fetch('/api/vouchers/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voucherId: voucher.id,
          quantity,
          customerDetails,
          personalization,
          amount: Math.round(totalPrice * 100) // Convert to cents
        })
      });

      const { clientSecret } = await response.json();

      const { error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: {
            name: `${customerDetails.firstName} ${customerDetails.lastName}`,
            email: customerDetails.email,
            phone: customerDetails.phone,
          },
        }
      });

      if (error) {
        toast({
          title: "Zahlung fehlgeschlagen",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Zahlung erfolgreich",
          description: "Ihr Gutschein wird per E-Mail versendet!",
        });
        navigate('/vouchers/success');
      }
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message || "Ein Fehler ist aufgetreten",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Details */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ihre Kontaktdaten</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">Vorname *</Label>
            <Input
              id="firstName"
              type="text"
              value={customerDetails.firstName}
              onChange={(e) => setCustomerDetails({...customerDetails, firstName: e.target.value})}
              required
            />
          </div>
          <div>
            <Label htmlFor="lastName">Nachname *</Label>
            <Input
              id="lastName"
              type="text"
              value={customerDetails.lastName}
              onChange={(e) => setCustomerDetails({...customerDetails, lastName: e.target.value})}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">E-Mail *</Label>
            <Input
              id="email"
              type="email"
              value={customerDetails.email}
              onChange={(e) => setCustomerDetails({...customerDetails, email: e.target.value})}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              type="tel"
              value={customerDetails.phone}
              onChange={(e) => setCustomerDetails({...customerDetails, phone: e.target.value})}
            />
          </div>
        </div>
      </div>

      {/* Quantity Selection */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Anzahl</h3>
        <div className="flex items-center space-x-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            -
          </Button>
          <span className="text-xl font-semibold">{quantity}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQuantity(quantity + 1)}
          >
            +
          </Button>
        </div>
      </div>

      {/* Voucher Personalization */}
      <VoucherPersonalization 
        onPersonalizationChange={setPersonalization}
        initialData={personalization}
      />

      {/* Payment Details */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Zahlungsinformationen</h3>
        <div className="p-4 border rounded-lg">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="flex items-start space-x-3">
        <Checkbox
          id="terms"
          checked={acceptedTerms}
          onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
        />
        <Label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
          Ich habe die <a href="#" className="text-purple-600 hover:underline">Geschäftsbedingungen</a> gelesen und akzeptiere sie. 
          Der Gutschein ist {voucher.validityPeriod} Tage gültig und nicht erstattungsfähig.
        </Label>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || isProcessing || !acceptedTerms}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-lg font-semibold"
      >
        {isProcessing ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Wird verarbeitet...</span>
          </div>
        ) : (
          `Jetzt kaufen - €${totalPrice.toFixed(2)}`
        )}
      </Button>
    </form>
  );
};

const VoucherCheckoutPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [voucher, setVoucher] = useState<VoucherProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVoucher = async () => {
      try {
        // console.log removed
        const response = await fetch(`/api/vouchers/products/${id}`);
        // console.log removed
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        // console.log removed
        setVoucher(data);
      } catch (err: any) {
        // console.error removed
        setError(err.message || 'Gutschein nicht gefunden');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchVoucher();
    } else {
      setError('Keine Gutschein-ID gefunden');
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !voucher) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Gutschein nicht gefunden</h1>
          <Button onClick={() => navigate('/vouchers')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zu den Gutscheinen
          </Button>
        </div>
      </div>
    );
  }

  // Check if Stripe is available
  if (!stripePromise) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Zahlungssystem wird eingerichtet
          </h1>
          <p className="text-gray-600 mb-4">
            Unser Zahlungssystem wird gerade konfiguriert. Bitte versuchen Sie es später noch einmal oder kontaktieren Sie uns direkt.
          </p>
          <Button onClick={() => navigate('/vouchers')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zu den Gutscheinen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <img 
                src="/company-logo.svg" 
                alt="New Age Fotografie Logo" 
                className="h-8 w-auto mr-3"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/logo.png"; // Fallback to PNG version
                }}
              />
              <span className="text-xl font-bold text-gray-900">NEW AGE FOTOGRAFIE</span>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate('/vouchers')}
              className="text-purple-600 hover:text-purple-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zu den Gutscheinen
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Voucher Details */}
          <div>
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="aspect-w-16 aspect-h-10">
                <img
                  src={voucher.imageUrl}
                  alt={voucher.name}
                  className="w-full h-64 object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder-voucher.jpg';
                  }}
                />
              </div>
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    FOTOSHOOTING
                  </span>
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-3">{voucher.name}</h1>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Gültig bis {new Date(Date.now() + voucher.validityPeriod * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE')}</span>
                  </div>
                  {voucher.sessionDuration && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{voucher.sessionDuration} Min.</span>
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  {voucher.originalPrice && (
                    <span className="text-lg text-gray-400 line-through mr-2">€{voucher.originalPrice}</span>
                  )}
                  <span className="text-3xl font-bold text-purple-600">€{voucher.price}</span>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center mb-2">
                    <img 
                      src="/company-logo.svg" 
                      alt="New Age Fotografie Logo" 
                      className="h-8 w-auto mr-3"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/logo.png"; // Fallback to PNG version
                      }}
                    />
                    <h3 className="font-semibold text-purple-900">Anbieter: New Age Fotografie</h3>
                  </div>
                  <p className="text-sm text-purple-800 mb-2">
                    <strong>Verfügbar:</strong> Noch 25 Gutscheine
                  </p>
                  <p className="text-xs text-purple-700">
                    Professional Fotografie Studio • Wien, Austria
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                      Geschäftsbedingungen
                    </h3>
                    <div className="text-sm text-gray-600 whitespace-pre-line">
                      {voucher.description}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Studio Location */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Studio Standort</h3>
              <div className="space-y-2 mb-4">
                <p className="text-gray-600">
                  <strong>Eingang Ecke Schönbrunnerstraße</strong><br />
                  Wehrgasse 11A/2+5<br />
                  1050 Wien, Austria
                </p>
                <p className="text-sm text-gray-500">
                  5 Minuten von Kettenbrückengasse<br />
                  Street parking available
                </p>
              </div>
              
              {/* Embedded Google Map */}
              <div className="rounded-lg overflow-hidden border">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2659.8!2d16.3608!3d48.1865!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x476d0774b3d4e1ab%3A0x123456789abcdef0!2sWehrgasse%2011A%2C%201050%20Wien%2C%20Austria!5e0!3m2!1sen!2sat!4v1625075400000!5m2!1sen!2sat"
                  width="100%"
                  height="200"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="New Age Fotografie Studio Location"
                />
              </div>
            </div>
          </div>

          {/* Right Column - Checkout Form */}
          <div>
            <Elements stripe={stripePromise}>
              <CheckoutForm voucher={voucher} />
            </Elements>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoucherCheckoutPage;