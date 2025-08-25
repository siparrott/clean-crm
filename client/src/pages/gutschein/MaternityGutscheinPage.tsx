import React from 'react';
import GutscheinLayout from '../../components/gutschein/GutscheinLayout';
import { Check, Clock, Heart, Camera } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';

const MaternityGutscheinPage: React.FC = () => {
  const { addItem } = useCart();
  const navigate = useNavigate();

  const packages = [
    {
      title: 'Basic',
      subtitle: 'Schöne Erinnerungen',
      price: 95,
      originalPrice: 195,
      features: [
        '30 Minuten Shooting',
        '1 bearbeitete Fotos',
        '1 Outfit',
        'Partner-Fotos optional'
      ]
    },
    {
      title: 'Premium',
      subtitle: 'Umfangreiche Erinnerungen',
      price: 195,
      originalPrice: 295,
      features: [
        '45 Minuten Shooting',
        '5 bearbeitete Fotos',
        '2 Outfits',
        'Partner-Fotos inklusive'
      ],
      isFeatured: true
    },
    {
      title: 'Deluxe',
      subtitle: 'Das komplette Erlebnis',
      price: 295,
      originalPrice: 295,
      features: [
        '60 Minuten Shooting',
        '10 bearbeitete Fotos',
        'Online Galerie',
        '3 Outfits',
        'Partner- & Familienfotos'
      ]
    }
  ];

  const studioGrid = [
    {
      url: "https://i.imgur.com/Vd6xtPg.jpg",
      title: "Studio Schwangerschaft",
      description: "Professionelle Aufnahmen in unserem modernen Studio"
    },
    {
      url: "https://i.imgur.com/AMnhw6w.jpg",
      title: "Partner + Schwangerschaft",
      description: "Natürliche Momente in schöner Umgebung"
    },
    {
      url: "https://i.postimg.cc/MHLVSbbf/E70-I3383-scaled.jpg",
      title: "Partner Shooting",
      description: "Gemeinsame Momente festhalten"
    }
  ];

  const seasonalGrid = [
    {
      url: "https://i.postimg.cc/T3gmzbyh/sw-6408.jpg",
      title: "Fun shooting",
      description: "Blühende Kulissen für strahlende Momente"
    },
    {
      url: "https://i.postimg.cc/X7Z9gm4f/E70I4421.jpg",
      title: "Maternity shooting",
      description: "Warmes Licht für zauberhafte Bilder"
    },
    {
      url: "https://i.postimg.cc/G2hyTSXs/E70I2880.jpg",
      title: "Bauch Shooting",
      description: "Stimmungsvolle Atmosphäre"
    }
  ];

  const specialGrid = [
    {
      url: "https://i.postimg.cc/VNwMmNMg/4S8A1454.jpg",
      title: "Paarshooting",
      description: "Gemeinsame Vorfreude festhalten"
    },
    {
      url: "https://i.postimg.cc/vTTfkS9d/DX4A9734.jpg",
      title: "Geschwistershooting",
      description: "Die wachsende Familie"
    },
    {
      url: "https://i.postimg.cc/jdGP3cSG/R8G5393.jpg",
      title: "Generationenshooting",
      description: "Drei Generationen vereint"
    }
  ];

  const locationGrid = [
    {
      url: "https://i.postimg.cc/cCvtXtyx/4-S8-A7529-58-2-2048x1365.jpg",
      title: "Persönliche Vorbereitung für authentische Ergebnisse",
      description: "Jedes Babybauch-Shooting beginnt bei uns mit einem kurzen Fragebogen und einem persönlichen Vorgespräch, damit wir Ihre Geschichte und Wünsche wirklich verstehen. Sie erhalten hilfreiche Hinweise zur Vorbereitung – von Outfit-Tipps bis hin zu Inspirationen für persönliche Accessoires wie Ultraschallbilder, kleine Babyschuhe oder Erinnerungsstücke. So entstehen Aufnahmen, die Ihre Vorfreude und Ihre Persönlichkeit liebevoll widerspiegeln."
    },
    {
      url: "https://i.postimg.cc/W3x846Tr/220318-das-Create0012-1.jpg",
      title: "Die große Enthüllung auf der Kinoleinwand",
      description: "Nach dem Shooting erwartet Sie ein besonderes Erlebnis: die Präsentation Ihrer Familienporträts auf großer Leinwand – ein interaktiver Moment voller Emotionen in entspannter, stilvoller Atmosphäre. Auf Wunsch ist diese Bildauswahl auch noch am selben Tag möglich."
    },
    {
      url: "https://i.postimg.cc/KzWLNZWy/zjezrez.jpg",
      title: "Handwerklich gefertigte Qualität – mit Liebe geliefert",
      description: "Jedes Portrait wird bei uns sorgfältig bearbeitet, farboptimiert und qualitätsgeprüft. Ihre fertigen Bilder erhalten Sie als hochwertige Drucke per versichertem Versand – die Lieferung ist für Sie selbstverständlich kostenlos."
    }
  ];

  const handleAddToCart = (pkg: typeof packages[0]) => {
    addItem({
      title: `Schwangerschafts Fotoshooting - ${pkg.title}`,
      price: pkg.price,
      quantity: 1,
      packageType: pkg.subtitle
    });
    navigate('/cart');
  };

  return (
    <GutscheinLayout
      title="Schwangerschafts Fotoshooting"
      subtitle="Magische Momente Ihrer Schwangerschaft"
      image="https://i.postimg.cc/xjZzq5Mc/4S8A5701.jpg"
    >
      <div className="max-w-4xl mx-auto">
        {/* Content Block */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-16">
          <div className="md:grid md:grid-cols-2 items-center">
            <div className="p-8 md:p-12">
              <h2 className="text-3xl font-bold text-purple-900 mb-6">
                Ihre schönsten Momente festgehalten ✨
              </h2>
              <p className="text-gray-700 mb-6">
                Ihre Schwangerschaft ist eine besondere Zeit voller Vorfreude und Emotionen. 
                Wir fangen diese einzigartigen Momente in stilvollen, zeitlosen Bildern ein – 
                ob im Studio oder an Ihrem Wunschort.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  Professionelle Betreuung & Styling-Beratung
                </li>
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  Beste Zeit: 32.-36. Schwangerschaftswoche
                </li>
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  Partner & Familie können einbezogen werden
                </li>
              </ul>
            </div>
            <div className="relative h-96 md:h-full">
              <img 
                src="https://i.postimg.cc/9XgGZC5X/NIEFERGALL-A4-L-683x1024.jpg"
                alt="Schwangerschaftsshooting"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            </div>
          </div>
        </div>

        {/* Package Options */}
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
                  <span className="text-sm font-medium">BESTSELLER</span>
                </div>
              )}
              <div className="p-6">
                <h3 className="text-2xl font-bold text-purple-900 mb-2">{pkg.title}</h3>
                <p className="text-gray-600 mb-4">{pkg.subtitle}</p>
                <div className="mb-6">
                  <span className="text-gray-400 line-through text-lg">€{pkg.originalPrice}</span>
                  <span className="text-3xl font-bold text-purple-600 ml-2">€{pkg.price}</span>
                </div>
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
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Jetzt Buchen
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Studio Experience Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-purple-900 mb-8 text-center">
            Unsere Studio-Erlebnisse
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {studioGrid.map((image, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="relative h-64">
                  <img 
                    src={image.url} 
                    alt={image.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                    <div className="text-white">
                      <h3 className="font-bold text-lg mb-1">{image.title}</h3>
                      <p className="text-sm opacity-90">{image.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <Clock size={48} className="text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Flexible Termine</h3>
            <p className="text-gray-600">
              Termine auch am Wochenende verfügbar
            </p>
          </div>
          <div className="text-center">
            <Heart size={48} className="text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Professionelle Betreuung</h3>
            <p className="text-gray-600">
              Spezialisiert auf Schwangerschaftsfotografie
            </p>
          </div>
          <div className="text-center">
            <Camera size={48} className="text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Professionelle Ausrüstung</h3>
            <p className="text-gray-600">
              Beste Qualität für bleibende Erinnerungen
            </p>
          </div>
        </div>

        {/* Seasonal Moments Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-purple-900 mb-8 text-center">
    
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {seasonalGrid.map((image, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden transform transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className="relative h-64">
                  <img 
                    src={image.url} 
                    alt={image.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                    <div className="text-white">
                      <h3 className="font-bold text-lg mb-1">{image.title}</h3>
                      <p className="text-sm opacity-90">{image.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Special Moments Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-purple-900 mb-8 text-center">
            Besondere Momente
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {specialGrid.map((image, index) => (
              <div key={index} className="relative group overflow-hidden rounded-lg shadow-lg">
                <img 
                  src={image.url} 
                  alt={image.title}
                  className="w-full h-64 object-cover transform transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-center text-white p-4">
                    <h3 className="font-bold text-xl mb-2">{image.title}</h3>
                    <p className="text-sm">{image.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Block Above Locations */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-16">
          <div className="md:grid md:grid-cols-2 items-center">
            <div className="p-8 md:p-12">
              <h2 className="text-3xl font-bold text-purple-900 mb-6">
                Persönliche Vorbereitung für authentische Ergebnisse 📸
              </h2>
              <p className="text-gray-700 mb-6">
                Individuell & persönlich: Jedes Schwangerschaftsshooting wird liebevoll auf Sie abgestimmt – gern auch mit Partner, Geschwistern oder zukünftigen Großeltern.

Zeitlose Erinnerungen: Stilvolle, emotionale Bilder, die diese besondere Zeit festhalten – ideal als Dekoration, Geschenk oder für Ihre Social Media Profile.

Einfühlsames Erlebnis: In entspannter Atmosphäre entstehen authentische Aufnahmen, die Ihre Vorfreude und Verbundenheit spürbar machen – ganz ohne Hektik.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center text-gray-700">
                  
              
                </li>
                <li className="flex items-center text-gray-700">
                 
                  
                </li>
                <li className="flex items-center text-gray-700">
                
                 
                </li>
              </ul>
            </div>
            <div className="relative h-96 md:h-full">
              <img 
                src="https://i.postimg.cc/HLtMxC9g/E70I2700.jpg"
                alt="Schwangerschaftsshooting Location"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            </div>
          </div>
        </div>

        {/* Location Highlights Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-purple-900 mb-8 text-center">
      
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {locationGrid.map((image, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="relative">
                  <img 
                    src={image.url} 
                    alt={image.title}
                    className="w-full h-64 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-bold text-lg text-purple-900 mb-1">{image.title}</h3>
                    <p className="text-gray-600 text-sm">{image.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Wichtige Informationen</h2>
          <ul className="space-y-2 text-gray-700">
            <li>• Gutscheine sind ab Kaufdatum 1 Jahr gültig</li>
            <li>• Sonderpreise für begrenzte Zeit</li>
            <li>• Termine flexibel vereinbar</li>
          
            <li>• Styling-Beratung inklusive</li>
            
          </ul>
        </div>
      </div>
    </GutscheinLayout>
  );
};

export default MaternityGutscheinPage;