import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import VoucherCard from '../components/vouchers/VoucherCard';
import CategoryFilter from '../components/vouchers/CategoryFilter';
import { useAppContext } from '../context/AppContext';
import { Search, Package, Gift } from 'lucide-react';

import { type VoucherProduct } from '@shared/schema';

// Helper function to get voucher image placeholder
const getVoucherImagePlaceholder = (voucherName: string) => {
  const name = voucherName.toLowerCase();
  if (name.includes('famil')) {
    return 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&h=300&fit=crop';
  } else if (name.includes('baby') || name.includes('newborn')) {
    return 'https://images.unsplash.com/photo-1544298621-7ad5ac882d5d?w=400&h=300&fit=crop';
  } else if (name.includes('business') || name.includes('headshot')) {
    return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop';
  } else if (name.includes('hochzeit') || name.includes('wedding')) {
    return 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop';
  } else {
    return 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop';
  }
};

const VouchersPage: React.FC = () => {
  const { selectedCategory } = useAppContext();
  const [searchTerm, setSearchTerm] = React.useState('');
  
  // Handle voucher purchase
  const handlePurchaseVoucher = (voucher: VoucherProduct) => {
    // Redirect to Stripe checkout page
    const purchaseUrl = `/vouchers/checkout/${voucher.id}`;
    window.location.href = purchaseUrl;
  };

  // Fetch voucher products from database
  const { data: voucherProducts, isLoading, error } = useQuery<VoucherProduct[]>({
    queryKey: ['/api/vouchers/products'],
    queryFn: async () => {
      // console.log removed
      const response = await fetch('/api/vouchers/products');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // console.log removed
      return data;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  
  // console.log removed
  // console.log removed
  // console.log removed

  useEffect(() => {
    // SEO Meta Tags
    document.title = 'Fotoshooting Gutscheine Wien - Geschenkideen | New Age Fotografie';
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Fotoshooting Gutscheine als perfekte Geschenkidee. Familien-, Schwangerschafts- und Neugeborenen-Fotoshootings in Wien zum Verschenken.');

    return () => {
      document.title = 'New Age Fotografie - Familienfotograf Wien';
    };
  }, []);
  
  // Filter vouchers based on search term and category
  const activeVouchers = voucherProducts?.filter(voucher => voucher.isActive) || [];
  
  const filteredByCategory = selectedCategory && selectedCategory !== 'Alle' as any
    ? activeVouchers.filter(voucher => {
        const name = voucher.name.toLowerCase();
        switch(selectedCategory.toLowerCase()) {
          case 'familie':
            return name.includes('famil') || name.includes('family');
          case 'baby':
            return name.includes('baby') || name.includes('neugeboren') || name.includes('newborn');
          case 'hochzeit':
            return name.includes('hochzeit') || name.includes('wedding');
          case 'business':
            return name.includes('business') || name.includes('headshot');
          case 'event':
            return name.includes('event');
          default:
            return true;
        }
      })
    : activeVouchers;
  
  const displayedVouchers = searchTerm 
    ? filteredByCategory.filter(voucher => 
        voucher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (voucher.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : filteredByCategory;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Company Logo and Header */}
        <div className="flex items-center justify-center mb-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <img 
                src="/company-logo.svg" 
                alt="New Age Fotografie Logo" 
                className="h-16 w-auto mr-4"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/logo.png"; // Fallback to PNG version
                }}
              />
              <div className="text-left">
                <h1 className="text-3xl font-bold text-gray-800 leading-tight">
                  NEW AGE FOTOGRAFIE
                </h1>
                <p className="text-lg text-purple-600 font-medium">
                  {selectedCategory ? `${selectedCategory} Fotoshooting Gutscheine Wien` : 'Fotoshooting Gutscheine Wien'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Sidebar with filters */}
          <div className="lg:col-span-1">
            {/* Search */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Suche</h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Gutscheine suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                />
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            
            {/* Category Filter */}
            <CategoryFilter />
          </div>
          
          {/* Main content with vouchers */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                    <div className="h-48 bg-gray-200"></div>
                    <div className="p-6 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 p-8 rounded-lg text-center">
                <Package className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-red-800">Fehler beim Laden der Gutscheine</h3>
                <p className="text-red-600">
                  Die Gutscheine konnten nicht geladen werden. Bitte versuchen Sie es später erneut.
                </p>
              </div>
            ) : displayedVouchers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedVouchers.map(voucher => (
                  <VoucherProductCard key={voucher.id} voucher={voucher} onPurchase={handlePurchaseVoucher} />
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-gray-800">
                  {searchTerm || selectedCategory !== 'Alle' ? 'Keine Gutscheine gefunden' : 'Noch keine Gutscheine verfügbar'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || selectedCategory !== 'Alle' 
                    ? 'Wir konnten keine Gutscheine finden, die Ihren Kriterien entsprechen.'
                    : 'Unsere Fotoshooting-Gutscheine werden bald verfügbar sein.'
                  }
                </p>
                {(searchTerm || selectedCategory !== 'Alle') && (
                  <button 
                    onClick={() => {
                      setSearchTerm('');
                    }}
                    className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    Filter zurücksetzen
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Voucher Product Card Component
const VoucherProductCard: React.FC<{ voucher: VoucherProduct; onPurchase: (voucher: VoucherProduct) => void }> = ({ voucher, onPurchase }) => {
  const discountPercentage = Math.floor(Math.random() * 20) + 10; // Generate random discount for display
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 group relative">
      {/* Discount Badge */}
      <div className="absolute top-4 right-4 z-10">
        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
          {discountPercentage}% OFF
        </span>
      </div>
      
      {/* Image - Use actual image if available, otherwise styled placeholder */}
      <div className="h-48 relative overflow-hidden">
        {voucher.imageUrl ? (
          <img 
            src={voucher.imageUrl} 
            alt={voucher.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="h-full relative">
            {/* Use photography-themed background images as fallback */}
            <div className="absolute inset-0 bg-cover bg-center" style={{
              backgroundImage: `url(${getVoucherImagePlaceholder(voucher.name)})`
            }}></div>
            <div className="absolute inset-0 bg-black bg-opacity-30"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <Package className="h-16 w-16 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-medium opacity-90">
                  {voucher.name.toLowerCase().includes('famil') ? 'FAMILIE' :
                   voucher.name.toLowerCase().includes('baby') || voucher.name.toLowerCase().includes('newborn') ? 'BABY' :
                   voucher.name.toLowerCase().includes('business') ? 'BUSINESS' :
                   voucher.name.toLowerCase().includes('hochzeit') ? 'HOCHZEIT' : 'FOTOSHOOTING'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
          {voucher.name}
        </h3>
        <div className="text-gray-600 text-sm mb-4 whitespace-pre-line" style={{ 
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {voucher.description || 'Beschreibung folgt in Kürze'}
        </div>
        
        {/* Validity */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500">
            Gültig bis {Math.floor((voucher.validityPeriod || 365) / 30)} Monate
          </span>
        </div>
        
        {/* Price and Button */}
        <div className="flex items-center justify-between">
          <div className="text-right">
            <div className="text-sm text-gray-400 line-through">
              €{(Number(voucher.price) * (1 + discountPercentage / 100)).toFixed(2)}
            </div>
            <div className="text-2xl font-bold text-blue-600">
              €{Number(voucher.price).toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">
              Nach {discountPercentage}% Rabatt verfügbar
            </div>
          </div>
          <button 
            onClick={() => {
              // Add to cart or direct purchase
              onPurchase(voucher);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            Jetzt kaufen
          </button>
        </div>
      </div>
    </div>
  );
};

export default VouchersPage;