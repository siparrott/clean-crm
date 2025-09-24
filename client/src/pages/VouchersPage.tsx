import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import CategoryFilter from '../components/vouchers/CategoryFilter';
import { useAppContext } from '../context/AppContext';
import { Search, Gift } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import HeroDealsAuto from '@/components/HeroDealsAuto';

const VouchersPage: React.FC = () => {
  const { selectedCategory } = useAppContext();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState('');

  // Memoize the title to prevent flashing
  const vouchersTitle = useMemo(() => {
    const title = t('vouchers.title');
    // Fallback to prevent flashing if translation isn't ready
    return title && title !== 'vouchers.title' ? title : 
           (language === 'en' ? 'Photoshoot Vouchers Vienna' : 'Fotoshooting Gutscheine Wien');
  }, [t, language]);

  // Define the three vouchers from HomePage
  const voucherProducts = [
    {
      id: 'pregnancy-shooting',
      name: t('home.pregnancyShootingTitle'),
      description: t('home.pregnancyShootingDescription'),
      originalPrice: 195,
      price: 95,
      image: 'https://i.imgur.com/Vd6xtPg.jpg',
      category: 'pregnancy',
      route: '/gutschein/maternity'
    },
    {
      id: 'family-shooting',
      name: t('home.familyShootingTitle'),
      description: t('home.familyShootingDescription'),
      originalPrice: 295,
      price: 195,
      image: 'https://i.postimg.cc/bw7ZyvPK/Familienfotoshooting-im-Fotostudio-Wien-Krexner-2777.jpg',
      category: 'family',
      route: '/gutschein/family'
    },
    {
      id: 'newborn-shooting',
      name: t('home.newbornShootingTitle'),
      description: t('home.newbornShootingDescription'),
      originalPrice: 395,
      price: 295,
      image: 'https://i.imgur.com/QWOgLqX.jpg',
      category: 'newborn',
      route: '/gutschein/newborn'
    }
  ];

  // Prepare hero items mapping once
  const heroItems = voucherProducts.map(v => ({
    id: v.id,
    name: v.name,
    description: v.description,
    image: v.image,
    price: v.price,
    originalPrice: v.originalPrice,
    route: v.route,
    url: v.route,
  }));

  // Cosmetic requirement: show only three offers in Groupon-style hero
  const showThreeOnly = true;
  if (showThreeOnly) {
    return (
      <Layout>
        <HeroDealsAuto items={heroItems} />
      </Layout>
    );
  }

  useEffect(() => {
    // SEO Meta Tags - Dynamic based on language
    const title = language === 'en' 
      ? 'Photoshoot Vouchers Vienna - Gift Ideas | New Age Photography'
      : 'Fotoshooting Gutscheine Wien - Geschenkideen | New Age Fotografie';
    document.title = title;
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    const description = language === 'en'
      ? 'Photoshoot vouchers as the perfect gift idea. Family, pregnancy and newborn photoshoots in Vienna for gifting.'
      : 'Fotoshooting Gutscheine als perfekte Geschenkidee. Familien-, Schwangerschafts- und Neugeborenen-Fotoshootings in Wien zum Verschenken.';
    metaDescription.setAttribute('content', description);
  }, [language]);
  
  // Filter vouchers based on search term and category
  const filteredByCategory = selectedCategory && selectedCategory !== 'Alle' as any
    ? voucherProducts.filter(voucher => {
        const name = voucher.name.toLowerCase();
        const category = voucher.category.toLowerCase();
        switch(selectedCategory.toLowerCase()) {
          case 'familie':
            return category.includes('family') || name.includes('famil');
          case 'baby':
            return category.includes('newborn') || name.includes('neugeboren') || name.includes('baby');
          case 'schwangerschaft':
            return category.includes('pregnancy') || name.includes('schwanger');
          default:
            return true;
        }
      })
    : voucherProducts;
  
  const displayedVouchers = searchTerm 
    ? filteredByCategory.filter(voucher => 
        voucher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voucher.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : filteredByCategory;

  const handlePurchaseVoucher = (voucher: any) => {
    navigate(voucher.route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout>
      {/* Groupon-style hero for top vouchers */}
      <HeroDealsAuto items={heroItems} />
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
                  {vouchersTitle}
                </p>
                <p className="text-sm mt-1 font-semibold text-red-600">
                  click Jetzt Buchen for options available
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
              <h2 className="text-lg font-semibold mb-4 text-gray-800">{t('common.search')}</h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('vouchers.searchPlaceholder')}
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
            {displayedVouchers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayedVouchers.map(voucher => (
                  <div key={voucher.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                    {/* Image */}
                    <div className="relative">
                      <div className="aspect-[4/3] overflow-hidden">
                        <img 
                          src={voucher.image}
                          alt={voucher.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-purple-900 mb-2">{voucher.name}</h3>
                      <p className="text-gray-600 mb-4">{voucher.description}</p>
                      
                      {/* Validity */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-gray-500">
                          {t('vouchers.validUntil')} {t('vouchers.validityPeriod')}
                        </span>
                      </div>
                      
                      {/* Price and Button */}
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-lg text-gray-500 line-through">€{voucher.originalPrice}</span>
                          <span className="text-2xl font-bold text-purple-600">€{voucher.price}</span>
                        </div>
                        <button 
                          onClick={() => handlePurchaseVoucher(voucher)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full transition-colors"
                        >
                          {t('home.bookNowButton')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-gray-800">
                  {searchTerm || selectedCategory !== null ? t('vouchers.noVouchersFound') : t('vouchers.noVouchersAvailable')}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || selectedCategory !== null 
                    ? t('vouchers.noVouchersFoundMessage')
                    : t('vouchers.noVouchersAvailableMessage')
                  }
                </p>
                {(searchTerm || selectedCategory !== null) && (
                  <button 
                    onClick={() => {
                      setSearchTerm('');
                    }}
                    className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    {t('vouchers.resetFilters')}
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

export default VouchersPage;