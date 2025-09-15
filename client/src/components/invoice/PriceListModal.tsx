import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Filter, Upload, Download } from 'lucide-react';

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
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Photography price guide data (replacing voucher system)
  const defaultPriceGuide: PriceListItem[] = [
    // Photography Services
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
      id: 'shooting-without-voucher',
      name: 'Shooting ohne Gutschein',
      description: 'Photography session without voucher',
      price: 95,
      category: 'Services',
      type: 'service',
      unit: 'session',
      taxRate: 19,
      isActive: true
    },

    // Digital Packages
    {
      id: 'digital-1-photo',
      name: '1 Digital Photo',
      description: 'Single high-resolution digital photo',
      price: 35,
      category: 'Digital',
      type: 'product',
      unit: 'photo',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'digital-10-pack',
      name: '10x Digital Photos Package',
      description: 'Package of 10 high-resolution digital photos',
      price: 295,
      category: 'Digital',
      type: 'product',
      unit: 'package',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'digital-15-pack',
      name: '15x Digital Photos Package',
      description: 'Package of 15 high-resolution digital photos',
      price: 365,
      category: 'Digital',
      type: 'product',
      unit: 'package',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'digital-20-pack',
      name: '20x Digital Photos Package',
      description: 'Package of 20 high-resolution digital photos (Leinwände Format A2 & 70x50cm 1 + 1 gratis)',
      price: 395,
      category: 'Digital',
      type: 'product',
      unit: 'package',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'digital-25-pack',
      name: '25x Digital Photos Package',
      description: 'Package of 25 high-resolution digital photos (Leinwände Format A2 & 70x50cm 1 + 1 gratis)',
      price: 445,
      category: 'Digital',
      type: 'product',
      unit: 'package',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'digital-30-pack',
      name: '30x Digital Photos Package',
      description: 'Package of 30 high-resolution digital photos (Leinwände Format A2 & 70x50cm 1 + 1 gratis)',
      price: 490,
      category: 'Digital',
      type: 'product',
      unit: 'package',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'digital-35-pack',
      name: '35x Digital Photos Package',
      description: 'Package of 35 high-resolution digital photos (Leinwände Format A2 & 70x50cm 1 + 1 gratis)',
      price: 525,
      category: 'Digital',
      type: 'product',
      unit: 'package',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'digital-all-portraits',
      name: 'All Portraits Package',
      description: 'Complete collection of all portrait photos from the session (Leinwände Format A2 & 70x50cm 1 + 1 gratis)',
      price: 595,
      category: 'Digital',
      type: 'product',
      unit: 'package',
      taxRate: 19,
      isActive: true
    },

    // Canvas & Leinwand Products
    {
      id: 'canvas-30x20-a4',
      name: 'Canvas 30 x 20cm (A4)',
      description: 'High-quality canvas print in A4 format',
      price: 75,
      category: 'Canvas',
      type: 'product',
      unit: 'piece',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'canvas-40x30-a3',
      name: 'Canvas 40 x 30cm (A3)',
      description: 'High-quality canvas print in A3 format',
      price: 105,
      category: 'Canvas',
      type: 'product',
      unit: 'piece',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'canvas-60x40-a2',
      name: 'Canvas 60 x 40cm (A2)',
      description: 'High-quality canvas print in A2 format',
      price: 145,
      category: 'Canvas',
      type: 'product',
      unit: 'piece',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'canvas-70x50',
      name: 'Canvas 70 x 50cm',
      description: 'High-quality large canvas print',
      price: 185,
      category: 'Canvas',
      type: 'product',
      unit: 'piece',
      taxRate: 19,
      isActive: true
    },

    // Luxury Frames
    {
      id: 'luxury-frame-a2-black',
      name: 'A2 Canvas in Black Wood Frame',
      description: 'A2 (60 x 40cm) canvas in elegant black wooden frame',
      price: 199,
      category: 'Luxury Frames',
      type: 'product',
      unit: 'piece',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'luxury-frame-40x40',
      name: '40 x 40cm Picture Frame',
      description: 'Premium picture frame 40 x 40cm',
      price: 145,
      category: 'Luxury Frames',
      type: 'product',
      unit: 'piece',
      taxRate: 19,
      isActive: true
    },

    // Print Products
    {
      id: 'print-15x10',
      name: 'Print 15 x 10cm',
      description: 'Professional photo print 15 x 10cm',
      price: 35,
      category: 'Prints',
      type: 'product',
      unit: 'piece',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'print-15x10-10pack-giftbox',
      name: '10x Prints 15 x 10cm + Gift Box',
      description: '10 professional prints 15 x 10cm with elegant gift box',
      price: 300,
      category: 'Prints',
      type: 'product',
      unit: 'package',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'print-20x30-a4',
      name: 'Print 20 x 30cm (A4)',
      description: 'Professional photo print 20 x 30cm A4 format',
      price: 59,
      category: 'Prints',
      type: 'product',
      unit: 'piece',
      taxRate: 19,
      isActive: true
    },
    {
      id: 'print-30x40-a3',
      name: 'Print 30 x 40cm (A3)',
      description: 'Professional photo print 30 x 40cm A3 format',
      price: 79,
      category: 'Prints',
      type: 'product',
      unit: 'piece',
      taxRate: 19,
      isActive: true
    },

    // Additional Services
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
    },
    {
      id: 'free-shipping',
      name: 'Free Shipping',
      description: 'Complimentary shipping for your order',
      price: 0,
      category: 'Services',
      type: 'service',
      unit: 'service',
      taxRate: 19,
      isActive: true
    },

    // Legacy Products (kept for compatibility)
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvText = e.target?.result as string;
        const csvData = parseCSV(csvText);
        await importPriceList(csvData);
      } catch (error) {
        console.error('Error parsing CSV:', error);
        setError('Error parsing CSV file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV must contain headers and at least one data row');
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });
    
    return data;
  };

  const importPriceList = async (csvData: any[]) => {
    setImporting(true);
    try {
      const response = await fetch('/api/crm/price-list/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: csvData }),
      });

      if (!response.ok) {
        throw new Error('Failed to import price list');
      }

      const result = await response.json();
      
      // Refresh the price list
      const newResponse = await fetch('/api/crm/price-list');
      if (newResponse.ok) {
        const newPriceList = await newResponse.json();
        setPriceList(newPriceList);
      }
      
      setShowImportDialog(false);
      alert(`Successfully imported ${result.imported} items!`);
    } catch (error) {
      console.error('Error importing price list:', error);
      setError('Error importing price list. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = 'Name,Description,Category,Price,Currency,TaxRate,SKU,ProductCode,Unit,Notes\n' +
                    'Portrait Session Basic,Basic portrait session with 10 edited photos,Portrait,150,EUR,19,PORT-001,portrait-basic,session,Standard portrait package\n' +
                    'Print 15x10cm,Professional photo print 15x10cm,Prints,35,EUR,19,PRT-001,print-15x10,piece,High quality print';
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'price-list-template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
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
          
          {/* Import Controls */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-gray-600">
              Import price list from CSV or download template
            </div>
            <div className="flex space-x-2">
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </button>
              <button
                onClick={() => setShowImportDialog(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </button>
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

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-60">
          <div className="relative top-1/2 transform -translate-y-1/2 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Import Price List from CSV
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload a CSV file with your price list. Download the template first to see the required format.
              </p>
              
              <div className="mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-md hover:border-purple-400 focus:outline-none focus:border-purple-400 disabled:opacity-50"
                >
                  <Upload className="w-5 h-5 mr-2 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {importing ? 'Importing...' : 'Choose CSV file or drag and drop'}
                  </span>
                </button>
              </div>
              
              <div className="text-xs text-gray-500 mb-4">
                Expected columns: Name, Description, Category, Price, Currency, TaxRate, SKU, ProductCode, Unit, Notes
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowImportDialog(false)}
                disabled={importing}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={downloadTemplate}
                className="px-4 py-2 text-purple-600 border border-purple-300 rounded hover:bg-purple-50"
              >
                Download Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceListModal;