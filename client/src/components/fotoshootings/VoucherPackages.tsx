import React, { useState } from 'react';
import { Check, ShoppingCart, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

interface Package {
  title: string;
  subtitle: string;
  price: number;
  features: string[];
  isFeatured?: boolean;
  link: string;
}

interface VoucherPackagesProps {
  packages: Package[];
}

const VoucherPackages: React.FC<VoucherPackagesProps> = ({ packages }) => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  const handleAddToCart = (pkg: Package) => {
    setSelectedPackage(pkg);
    setShowConfirmation(true);
  };

  const confirmAddToCart = () => {
    if (selectedPackage) {
      addItem({
        title: selectedPackage.title,
        price: selectedPackage.price,
        quantity: 1,
        packageType: selectedPackage.subtitle
      });
      setShowConfirmation(false);
      navigate('/cart');
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        {packages.map((pkg, index) => (
          <div 
            key={index} 
            className={`bg-white rounded-lg shadow-lg overflow-hidden ${
              pkg.isFeatured ? 'border-2 border-purple-600' : ''
            }`}
          >
            {pkg.isFeatured && (
              <div className="bg-purple-600 text-white text-center py-2">
                <span className="text-sm font-medium">MEIST GEWÄHLT</span>
              </div>
            )}
            <div className="p-6">
              <h3 className="text-2xl font-bold text-purple-900 mb-2">{pkg.title}</h3>
              <p className="text-gray-600 mb-4">{pkg.subtitle}</p>
              <div className="text-3xl font-bold text-purple-600 mb-6">€{pkg.price}</div>
              <ul className="space-y-3 mb-6">
                {pkg.features.map((feature, i) => (
                  <li key={i} className="flex items-center">
                    <Check size={20} className="text-green-500 mr-2" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => handleAddToCart(pkg)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                <ShoppingCart size={20} className="mr-2" />
                In den Warenkorb
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && selectedPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-900">Paket zum Warenkorb hinzufügen</h3>
              <button
                onClick={() => setShowConfirmation(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            <div className="mb-6">
              <p className="text-gray-600">
                Möchten Sie das {selectedPackage.title} Paket ({selectedPackage.subtitle}) für €{selectedPackage.price} zum Warenkorb hinzufügen?
              </p>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmAddToCart}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoucherPackages;