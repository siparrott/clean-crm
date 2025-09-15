import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useAppContext } from '../context/AppContext';
import { Calendar, Clock, Tag, AlertCircle, Info, ShoppingCart, ArrowLeft } from 'lucide-react';

const VoucherDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { getVoucherBySlug } = useAppContext();
  const [quantity, setQuantity] = useState(1);
  
  const voucher = getVoucherBySlug(slug || '');
  
  if (!voucher) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Gutschein nicht gefunden</h1>
          <p className="text-gray-600 mb-8">
            Der gesuchte Gutschein konnte nicht gefunden werden.
          </p>
          <button 
            onClick={() => navigate('/vouchers')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Gutscheine durchsuchen
          </button>
        </div>
      </Layout>
    );
  }
  
  const isAvailable = voucher.stock > 0;
  const today = new Date();
  const validUntilDate = new Date(voucher.validUntil);
  const isValid = validUntilDate > today;
  
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (value >= 1 && value <= voucher.stock) {
      setQuantity(value);
    }
  };
  
  const handleCheckout = () => {
    navigate(`/checkout/${voucher.id}`, { state: { quantity } });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <button 
          onClick={() => navigate('/vouchers')}
          className="flex items-center text-purple-600 hover:text-purple-800 mb-6 transition-colors"
        >
          <ArrowLeft size={16} className="mr-1" /> Zurück zu den Gutscheinen
        </button>
        
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="md:grid md:grid-cols-2">
            {/* Voucher image */}
            <div className="md:col-span-1">
              <img 
                src={voucher.image} 
                alt={voucher.title}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Voucher details */}
            <div className="md:col-span-1 p-6 md:p-8">
              <div className="flex items-center mb-4">
                <Tag size={16} className="text-purple-600 mr-2" />
                <span className="text-sm font-semibold text-purple-600 uppercase">{voucher.category}</span>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">{voucher.title}</h1>
              
              <div className="flex items-center mb-6">
                <div className="mr-6 flex items-center">
                  <Calendar size={16} className="text-gray-500 mr-1" />
                  <span className="text-sm text-gray-500">
                    Gültig bis {new Date(voucher.validUntil).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full mr-1 ${isValid ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-sm text-gray-500">
                    {isValid ? 'Aktiv' : 'Abgelaufen'}
                  </span>
                </div>
              </div>
              
              <div className="mb-6">
                <span className="text-gray-500 line-through text-lg">€{voucher.price.toFixed(2)}</span>
                <span className="text-purple-600 font-bold text-3xl ml-2">€{voucher.discountPrice.toFixed(2)}</span>
              </div>
              
              <p className="text-gray-700 mb-6">{voucher.description}</p>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-2">
                  <span className="font-semibold">Anbieter:</span> {voucher.partner.title}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Verfügbar:</span> Noch {voucher.stock} Gutscheine
                </p>
              </div>
              
              {isAvailable && isValid ? (
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">Anzahl</label>
                  <div className="flex items-center mb-4">
                    <input
                      type="number"
                      min="1"
                      max={voucher.stock}
                      value={quantity}
                      onChange={handleQuantityChange}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg mr-4 focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                    />
                  </div>
                  
                  {/* Two button options */}
                  <div className="space-y-3">
                    {/* Personalisieren Button - Triggers voucher flow */}
                    <button 
                      onClick={() => {
                        // Navigate to personalization checkout with proper route
                        navigate(`/checkout/voucher/${voucher.id}?personalize=true&quantity=${quantity}`);
                      }}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002 2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Personalisieren - €{(voucher.discountPrice * quantity).toFixed(2)}
                    </button>
                    
                    {/* Quick Checkout Button - Direct purchase without personalization */}
                    <button 
                      onClick={handleCheckout}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <ShoppingCart size={18} className="mr-2" />
                      Schnellkauf - €{(voucher.discountPrice * quantity).toFixed(2)}
                    </button>
                  </div>
                  
                  <div className="mt-3 text-center">
                    <p className="text-sm text-gray-600">
                      💎 <strong>Personalisieren:</strong> Fügen Sie eigene Fotos und Nachrichten hinzu<br/>
                      ⚡ <strong>Schnellkauf:</strong> Sofortiger Kauf ohne Anpassung
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <AlertCircle size={20} className="text-red-500 mr-2 mt-0.5" />
                    <p className="text-red-700">
                      {!isAvailable 
                        ? 'Dieser Gutschein ist derzeit ausverkauft.' 
                        : 'Dieser Gutschein ist abgelaufen und nicht mehr verfügbar.'}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info size={20} className="text-gray-500 mr-2 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Geschäftsbedingungen</h3>
                    <p className="text-gray-700 text-sm">{voucher.terms}</p>
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

export default VoucherDetailPage;