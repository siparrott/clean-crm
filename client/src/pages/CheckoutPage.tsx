import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useAppContext } from '../context/AppContext';
import { CheckCircle, AlertCircle, CreditCard, User, Mail, ArrowLeft } from 'lucide-react';
import { purchaseVoucher } from '../lib/voucher';

interface LocationState {
  quantity: number;
}

const CheckoutPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { getVoucherById, addOrder } = useAppContext();
  
  const state = location.state as LocationState;
  const initialQuantity = state?.quantity || 1;
  
  const [quantity, setQuantity] = useState<number>(initialQuantity);
  const [purchaserName, setPurchaserName] = useState<string>('');
  const [purchaserEmail, setPurchaserEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  const voucher = getVoucherById(id || '');
  
  useEffect(() => {
    if (!voucher) {
      navigate('/vouchers');
    }
  }, [voucher, navigate]);
  
  if (!voucher) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Voucher Not Found</h1>
          <p className="text-gray-600 mb-8">
            We couldn't find the voucher you're looking for.
          </p>
          <button 
            onClick={() => navigate('/vouchers')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Browse Vouchers
          </button>
        </div>
      </Layout>
    );
  }
  
  const totalPrice = voucher.discountPrice * quantity;
  
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    if (!purchaserName.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!purchaserEmail.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(purchaserEmail)) {
      newErrors.email = 'Email is invalid';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setIsSubmitting(true);
      
      // Simulate payment processing
      const paymentIntentId = `pi_${Math.random().toString(36).substring(2, 15)}`;
      
      // Record the voucher purchase
      await purchaseVoucher({
        purchaserName,
        purchaserEmail,
        amount: totalPrice,
        paymentIntentId,
        voucherType: voucher.category
      });
      
      // Create the order in local state
      const newOrder = addOrder({
        voucher,
        quantity,
        totalPrice,
        purchaserName,
        purchaserEmail,
        status: 'paid'
      });
      
      // Navigate to order complete page
      navigate(`/order-complete/${newOrder.id}`);
    } catch (error) {
      // console.error removed
      setErrors({ submit: 'Failed to process payment. Please try again.' });
      setIsSubmitting(false);
    }
  };
  
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (value >= 1 && value <= voucher.stock) {
      setQuantity(value);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <button 
          onClick={() => navigate(`/voucher/${voucher.slug}`)}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to voucher
        </button>
        
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-8">Checkout</h1>
        
        <div className="md:grid md:grid-cols-3 md:gap-8">
          {/* Checkout form */}
          <div className="md:col-span-2 mb-8 md:mb-0">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-6 text-gray-800">Your Information</h2>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2 flex items-center">
                    <User size={16} className="mr-2" /> Full Name
                  </label>
                  <input
                    type="text"
                    value={purchaserName}
                    onChange={(e) => setPurchaserName(e.target.value)}
                    disabled={isSubmitting}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors ${
                      errors.name ? 'border-red-500 focus:ring-red-600 focus:border-red-600' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>
                
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2 flex items-center">
                    <Mail size={16} className="mr-2" /> Email Address
                  </label>
                  <input
                    type="email"
                    value={purchaserEmail}
                    onChange={(e) => setPurchaserEmail(e.target.value)}
                    disabled={isSubmitting}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors ${
                      errors.email ? 'border-red-500 focus:ring-red-600 focus:border-red-600' : 'border-gray-300'
                    }`}
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>
                
                <div>
                  <h2 className="text-xl font-semibold mb-6 text-gray-800 flex items-center">
                    <CreditCard size={20} className="mr-2" /> Payment Information
                  </h2>
                  
                  {(!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.includes('test') || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.includes('pk_test')) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <p className="text-blue-700 text-sm">
                        <strong>Note:</strong> This is a demo application. No actual payment will be processed.
                      </p>
                    </div>
                  )}
                  
                  <div className="mb-6">
                    <label className="block text-gray-700 font-medium mb-2">
                      Card Information
                    </label>
                    <input
                      type="text"
                      placeholder="4242 4242 4242 4242"
                      disabled={isSubmitting}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="MM / YY"
                        disabled={isSubmitting}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      />
                      <input
                        type="text"
                        placeholder="CVC"
                        disabled={isSubmitting}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      />
                    </div>
                  </div>
                </div>
                
                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-700 text-sm">{errors.submit}</p>
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 px-6 rounded-lg font-medium text-white transition-colors ${
                    isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    `Pay €${totalPrice.toFixed(2)}`
                  )}
                </button>
              </form>
            </div>
          </div>
          
          {/* Order summary */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-24">
              <h2 className="text-xl font-semibold mb-6 text-gray-800">Order Summary</h2>
              
              <div className="flex mb-4">
                <img 
                  src={voucher.image} 
                  alt={voucher.title}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="ml-4">
                  <h3 className="font-medium text-gray-800">{voucher.title}</h3>
                  <p className="text-gray-600 text-sm">
                    Valid until {new Date(voucher.validUntil).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <label className="text-gray-600">Quantity:</label>
                  <input
                    type="number"
                    min="1"
                    max={voucher.stock}
                    value={quantity}
                    onChange={handleQuantityChange}
                    disabled={isSubmitting}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Price per voucher:</span>
                  <span className="text-gray-800">€{voucher.discountPrice.toFixed(2)}</span>
                </div>
                
                <hr className="my-4 border-gray-200" />
                
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-blue-600">€{totalPrice.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircle size={20} className="text-green-500 mr-2 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Secure Voucher Purchase</h3>
                    <p className="text-green-700 text-sm">
                      This voucher will be delivered to your email immediately after purchase.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CheckoutPage;