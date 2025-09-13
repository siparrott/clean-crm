import React, { useState, useEffect } from 'react';
import { X, Search, Filter } from 'lucide-react';

interface PriceListItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  type: string;
  unit: string;
  taxRate: number;
  isActive: boolean;
}

interface PriceListModalProps {
  onClose: () => void;
  onSelectItem: (item: PriceListItem) => void;
}

const PriceListModal: React.FC<PriceListModalProps> = ({ onClose, onSelectItem }) => {
  const [priceList, setPriceList] = useState<PriceListItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<PriceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  // Photography price guide data (replacing voucher system)
  const defaultPriceGuide: PriceListItem[] = [
    {
      id: 'portrait-basic',
      name: 'Portrait Session - Basic',
      description: 'Basic portrait session with 10 edited photos',
      price: 150,
      category: 'Portrait',
      type: 'service',
      unit: 'session',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'portrait-premium',
      name: 'Portrait Session - Premium',
      description: 'Premium portrait session with 20 edited photos and styling consultation',
      price: 250,
      category: 'Portrait',
      type: 'service',
      unit: 'session',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'family-outdoor',
      name: 'Family Outdoor Shooting',
      description: 'Family photography session in outdoor location with 15 edited photos',
      price: 200,
      category: 'Family',
      type: 'service',
      unit: 'session',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'family-studio',
      name: 'Family Studio Session',
      description: 'Professional family photos in our studio with 12 edited photos',
      price: 180,
      category: 'Family',
      type: 'service',
      unit: 'session',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'couple-engagement',
      name: 'Couple & Engagement',
      description: 'Romantic couple or engagement session with 25 edited photos',
      price: 300,
      category: 'Couple',
      type: 'service',
      unit: 'session',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'wedding-basic',
      name: 'Wedding Photography - Basic',
      description: 'Wedding coverage (4 hours) with 100+ edited photos',
      price: 800,
      category: 'Wedding',
      type: 'service',
      unit: 'session',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'wedding-premium',
      name: 'Wedding Photography - Premium',
      description: 'Full day wedding coverage (8 hours) with 200+ photos and album',
      price: 1200,
      category: 'Wedding',
      type: 'service',
      unit: 'session',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'business-headshots',
      name: 'Business Headshots',
      description: 'Professional headshots for business use with 5 edited photos',
      price: 120,
      category: 'Business',
      type: 'service',
      unit: 'session',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'business-team',
      name: 'Business Team Photography',
      description: 'Team photography session for corporate use',
      price: 350,
      category: 'Business',
      type: 'service',
      unit: 'session',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'maternity-session',
      name: 'Maternity Photography',
      description: 'Beautiful maternity session with 15 edited photos',
      price: 220,
      category: 'Maternity',
      type: 'service',
      unit: 'session',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'newborn-session',
      name: 'Newborn Photography',
      description: 'Gentle newborn session with props and 20 edited photos',
      price: 280,
      category: 'Newborn',
      type: 'service',
      unit: 'session',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'event-coverage',
      name: 'Event Photography',
      description: 'Event coverage with unlimited photos (price per hour)',
      price: 80,
      category: 'Events',
      type: 'service',
      unit: 'hour',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'photo-album',
      name: 'Premium Photo Album',
      description: 'High-quality photo album (30 pages)',
      price: 150,
      category: 'Products',
      type: 'product',
      unit: 'piece',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'usb-drive',
      name: 'USB Drive with Photos',
      description: 'Custom USB drive with all high-resolution photos',
      price: 50,
      category: 'Products',
      type: 'product',
      unit: 'piece',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'prints-package',
      name: 'Print Package',
      description: 'Professional prints package (10x 20x30cm)',
      price: 80,
      category: 'Products',
      type: 'product',
      unit: 'package',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'extra-editing',
      name: 'Extra Photo Editing',
      description: 'Additional photo editing and retouching',
      price: 25,
      category: 'Services',
      type: 'service',
      unit: 'photo',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'travel-fee',
      name: 'Travel Fee',
      description: 'Travel fee for locations outside Vienna',
      price: 50,
      category: 'Services',
      type: 'service',
      unit: 'trip',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'rush-delivery',
      name: 'Rush Delivery',
      description: 'Express photo delivery within 48 hours',
      price: 100,
      category: 'Services',
      type: 'service',
      unit: 'service',
      taxRate: 19,
      isActive: true
    }
  ];

  useEffect(() => {
    // In a real implementation, this would fetch from your API
    // For now, we'll use the default price guide
    setLoading(true);
    
    try {
      // Simulate API call
      setTimeout(() => {
        setPriceList(defaultPriceGuide);
        setFilteredItems(defaultPriceGuide);
        setLoading(false);
      }, 500);
    } catch (err) {
      setError('Failed to load price guide');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let filtered = priceList.filter(item => item.isActive);

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'All Categories') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    setFilteredItems(filtered);
  }, [priceList, searchTerm, selectedCategory]);

  const categories = ['All Categories', ...Array.from(new Set(priceList.map(item => item.category)))];

  const handleSelectItem = (item: PriceListItem) => {
    onSelectItem(item);
    onClose();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Select from Price Guide
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading price guide...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Price Guide Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors"
                onClick={() => handleSelectItem(item)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">
                    {item.name}
                  </h4>
                  <span className="text-lg font-bold text-blue-600">
                    {formatPrice(item.price)}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {item.description}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded">
                    {item.category}
                  </span>
                  <span>per {item.unit}</span>
                </div>
                
                <button className="w-full mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                  Add to Invoice
                </button>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && !error && filteredItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No services found matching your criteria.
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {filteredItems.length} service{filteredItems.length !== 1 ? 's' : ''} available
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PriceListModal;