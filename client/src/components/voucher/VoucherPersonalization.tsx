import React, { useState } from 'react';
import { Upload, Check, ChevronRight, Camera } from 'lucide-react';

interface DeliveryOption {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  detailedDescription?: string;
  isSelected?: boolean;
}

interface DesignTemplate {
  id: string;
  name: string;
  category: string;
  image: string;
  occasion: string;
}

interface VoucherPersonalizationProps {
  onComplete: (personalization: VoucherPersonalizationData) => void;
  voucherAmount: number;
}

export interface VoucherPersonalizationData {
  deliveryOption: DeliveryOption;
  selectedDesign?: DesignTemplate;
  customPhoto?: File;
  personalMessage: string;
  recipientName?: string;
  senderName?: string;
}

const VoucherPersonalization: React.FC<VoucherPersonalizationProps> = ({ 
  onComplete, 
  voucherAmount 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryOption | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<DesignTemplate | null>(null);
  const [customPhoto, setCustomPhoto] = useState<File | null>(null);
  const [personalMessage, setPersonalMessage] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('');

  const deliveryOptions: DeliveryOption[] = [
    {
      id: 'pdf',
      name: 'PDF Versand',
      description: 'Kostenlos',
      price: 0,
      image: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=300&fit=crop',
      detailedDescription: 'Sofort downloaden und ausdrucken'
    },
    {
      id: 'post-standard',
      name: 'POST Standard',
      description: '4,49 €',
      price: 4.49,
      image: 'https://images.unsplash.com/photo-1566125882500-87e10f726cdc?w=400&h=300&fit=crop',
      detailedDescription: 'Farbdruck auf 200g Papier | Versand per Post (3-5 Werktage)'
    },
    {
      id: 'post-premium',
      name: 'POST Premium',
      description: '6,49 €',
      price: 6.49,
      image: 'https://i.postimg.cc/RZ7PBrvT/firstvoucher-lettershop-premium.webp',
      detailedDescription: 'Farbdruck auf hochwertigem 300g Papier inkl. passendem Umschlag | Versand per Post (3-5 Werktage)'
    },
    {
      id: 'post-geschenkbox',
      name: 'POST Geschenkbox',
      description: '34,95 €',
      price: 34.95,
      image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=300&fit=crop',
      detailedDescription: 'Premium-Gutschein in Geschenkbox | Premium-Seife (250 ml) & Premium-Schokoladen | Versand per Post (3-5 Werktage) - Kostenloser Versand innerhalb Österreichs'
    }
  ];

  const designTemplates: DesignTemplate[] = [
    { id: 'birthday', name: 'Birthday Celebration', category: 'birthday', image: 'https://i.postimg.cc/cCLh7639/827ee647-a4cc-4f99-ac43-a7165efa0314.webp', occasion: 'Happy Birthday' },
    { id: 'anniversary', name: 'Anniversary', category: 'anniversary', image: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=400&h=300&fit=crop', occasion: 'Happy Anniversary' },
    { id: 'mothers-day', name: 'Mother\'s Day', category: 'mothers-day', image: 'https://i.postimg.cc/br5xQgpr/stock-photo-top-view-greeting-card-happy-mothers-day-lettering-pink-carnations.webp', occasion: 'Happy Mother\'s Day' },
    { id: 'valentines', name: 'Valentine\'s Day', category: 'love', image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&h=300&fit=crop', occasion: 'I Love You' },
    { id: 'christmas', name: 'Christmas', category: 'christmas', image: 'https://images.unsplash.com/photo-1512389098783-66b81f86e199?w=400&h=300&fit=crop', occasion: 'Merry Christmas' },
    { id: 'thank-you', name: 'Thank You', category: 'gratitude', image: 'https://i.postimg.cc/Mp5y5zWg/writing-thank-you.webp', occasion: 'Thank You' },
    { id: 'congratulations', name: 'Congratulations', category: 'celebration', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=300&fit=crop', occasion: 'Congratulations' }
  ];

  const handleDeliverySelect = (delivery: DeliveryOption) => {
    setSelectedDelivery(delivery);
    if (delivery.id === 'pdf') {
      setCurrentStep(2);
    }
  };

  const handleDesignSelect = (design: DesignTemplate) => {
    setSelectedDesign(design);
    setCustomPhoto(null);
  };

  const handleCustomPhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCustomPhoto(file);
      setSelectedDesign(null);
    }
  };

  const handleComplete = () => {
    if (selectedDelivery) {
      const personalizationData: VoucherPersonalizationData = {
        deliveryOption: selectedDelivery,
        selectedDesign: selectedDesign || undefined,
        customPhoto: customPhoto || undefined,
        personalMessage,
        recipientName,
        senderName
      };
      onComplete(personalizationData);
    }
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1:
        return selectedDelivery !== null;
      case 2:
        return selectedDesign !== null || customPhoto !== null;
      case 3:
        return personalMessage.trim() !== '';
      default:
        return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
              ${currentStep === step ? 'bg-blue-600' : 
                isStepComplete(step) ? 'bg-green-500' : 'bg-gray-300'}
            `}>
              {isStepComplete(step) ? <Check size={20} /> : step}
            </div>
            <div className="ml-3 mr-6">
              <p className={`font-medium ${currentStep === step ? 'text-blue-600' : 'text-gray-500'}`}>
                {step === 1 && 'Versandart wählen'}
                {step === 2 && 'Motiv wählen / Foto hochladen'}
                {step === 3 && 'Persönliche Widmung'}
              </p>
            </div>
            {step < 3 && (
              <ChevronRight className="text-gray-400 mr-6" size={20} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Delivery Options */}
      {currentStep === 1 && (
        <div>
          <h2 className="text-2xl font-bold mb-6 text-center">Versandart wählen</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {deliveryOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => handleDeliverySelect(option)}
                className={`
                  border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg
                  ${selectedDelivery?.id === option.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                `}
              >
                <div className="h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                  <img 
                    src={option.image} 
                    alt={option.name}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = `
                        <div class="text-gray-400 text-center">
                          <div class="text-2xl mb-2">📦</div>
                          <div class="text-sm">${option.name}</div>
                        </div>
                      `;
                    }}
                  />
                </div>
                <h3 className="font-semibold text-center">{option.name}</h3>
                <p className="text-center text-gray-600">{option.description}</p>
                {option.detailedDescription && (
                  <p className="text-center text-sm text-gray-500 mt-1">{option.detailedDescription}</p>
                )}
                {selectedDelivery?.id === option.id && (
                  <div className="flex justify-center mt-2">
                    <Check className="text-blue-500" size={20} />
                  </div>
                )}
              </div>
            ))}
          </div>
          {selectedDelivery && (
            <div className="text-center mt-6">
              <button
                onClick={() => setCurrentStep(2)}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                weiter zur Gestaltung
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Design/Photo Selection */}
      {currentStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Design Selection */}
          <div>
            <h2 className="text-2xl font-bold mb-6 text-center">Motiv wählen / Foto hochladen</h2>
            
            {/* Custom Photo Upload */}
            <div className="mb-8">
              <label className="block w-full">
                <div className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
                  ${customPhoto ? 'border-green-500 bg-green-50' : 'border-blue-500 bg-blue-50'}
                  hover:bg-blue-100
                `}>
                  <Camera size={48} className="mx-auto mb-4 text-blue-500" />
                  <p className="text-lg font-semibold text-blue-600 mb-2">Foto suchen</p>
                  <p className="text-gray-600">Klicken Sie hier, um Ihr eigenes Foto hochzuladen</p>
                  {customPhoto && (
                    <p className="text-green-600 mt-2 font-semibold">
                      ✓ {customPhoto.name} ausgewählt
                    </p>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomPhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Design Templates Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {designTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleDesignSelect(template)}
                  className={`
                    border-2 rounded-lg cursor-pointer transition-all hover:shadow-lg
                    ${selectedDesign?.id === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                  `}
                >
                  <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                    <img 
                      src={template.image} 
                      alt={template.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.innerHTML = `
                          <div class="w-full h-full flex items-center justify-center text-gray-400">
                            <div class="text-center">
                              <div class="text-2xl mb-1">🎨</div>
                              <div class="text-xs">${template.occasion}</div>
                            </div>
                          </div>
                        `;
                      }}
                    />
                  </div>
                  <div className="p-2 text-center">
                    <p className="text-sm font-medium">{template.occasion}</p>
                  </div>
                  {selectedDesign?.id === template.id && (
                    <div className="flex justify-center pb-2">
                      <Check className="text-blue-500" size={16} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Voucher Preview */}
          <div className="lg:pl-8">
            <h3 className="text-xl font-bold mb-6 text-center">Vorschau</h3>
            
            {(selectedDesign || customPhoto) ? (
              <div className="relative">
                {/* Animated Voucher Preview */}
                <div className="bg-white rounded-lg shadow-xl p-6 mb-6 transform transition-all duration-500 hover:scale-105">
                  <div className="relative overflow-hidden rounded-lg">
                    {/* Main Voucher Image */}
                    <div className="h-64 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg mb-4 flex items-center justify-center relative">
                      {selectedDesign ? (
                        <img 
                          src={selectedDesign.image} 
                          alt={selectedDesign.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : customPhoto ? (
                        <img 
                          src={URL.createObjectURL(customPhoto)} 
                          alt="Custom uploaded photo"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : null}
                      
                      {/* Voucher Overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-20 rounded-lg flex items-center justify-center">
                        <div className="text-white text-center">
                          <h4 className="text-2xl font-bold mb-2">Gutschein</h4>
                          <p className="text-lg">{selectedDesign?.occasion || 'Eigenes Foto'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Voucher Details */}
                    <div className="bg-white p-4 rounded-lg border-t-4 border-blue-500">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h5 className="font-bold text-lg">Fotoshooting Gutschein</h5>
                          <p className="text-gray-600 text-sm">1 Person, ca. 30 min</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">{voucherAmount},00 €</p>
                        </div>
                      </div>
                      
                      <div className="border-t pt-3">
                        <p className="text-xs text-gray-500 mb-2">Einlösbar bis: 48 Monate ab Kaufdatum</p>
                        <div className="bg-gray-100 p-2 rounded text-center">
                          <p className="text-xs font-mono">DEMO-GUTSCHEIN-2024</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Continue Button */}
                <div className="text-center">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors w-full lg:w-auto"
                  >
                    Persönliche Nachricht hinzufügen
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center p-12 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500">Wählen Sie ein Design oder laden Sie ein Foto hoch, um eine Vorschau zu sehen</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Personal Message */}
      {currentStep === 3 && (
        <div>
          <h2 className="text-2xl font-bold mb-6 text-center">Persönliche Widmung</h2>
          
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Empfänger Name (optional)
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Für wen ist dieser Gutschein?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Persönliche Nachricht *
              </label>
              <textarea
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                placeholder="Widmung eingeben..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-sm text-gray-500 mt-1">
                {personalMessage.length}/500 Zeichen
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ihr Name (optional)
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Von wem ist dieser Gutschein?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {personalMessage.trim() && (
              <div className="text-center">
                <button
                  onClick={handleComplete}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Zur Kasse
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Voucher Preview (fixed bottom) */}
      {selectedDelivery && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-xs text-center">Voucher<br/>Preview</span>
              </div>
              <div>
                <h3 className="font-semibold">Fotoshooting Gutschein</h3>
                <p className="text-sm text-gray-600">
                  {selectedDelivery.name} | {selectedDesign?.occasion || customPhoto?.name || 'Eigenes Foto'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Zwischensumme</p>
              <p className="font-bold text-lg">
                {(voucherAmount + selectedDelivery.price).toFixed(2)} €
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoucherPersonalization;
