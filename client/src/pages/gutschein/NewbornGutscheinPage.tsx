import React from 'react';
import GutscheinLayout from '../../components/gutschein/GutscheinLayout';
import { Check, Clock, Heart, Camera } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';

const NewbornGutscheinPage: React.FC = () => {
  const { addItem } = useCart();
  const navigate = useNavigate();

  const packages = [
    {
      title: 'Basic',
      subtitle: 'Erste Erinnerungen',
      price: 95,
      originalPrice: 195,
      features: [
        '30min Shooting',
        '1 bearbeitete Fotos',
        '2 Setups',
        'Requisiten inklusive'
      ]
    },
    {
      title: 'Premium',
      subtitle: 'Umfangreiche Erinnerungen',
      price: 195,
      originalPrice: 295,
      features: [
        '45min Shooting',
        '5 bearbeitete Fotos',
        'Familienfotos inklusive',
        'Requisiten & Outfits inklusive'
      ],
      isFeatured: true
    },
    {
      title: 'Deluxe',
      subtitle: 'Das komplette Erlebnis',
      price: 295,
      originalPrice: 395,
      features: [
        '1 Stunden Shooting',
        '10 bearbeitete Fotos',
        'Familienfotos inklusive',
        'Alle Requisiten & Outfits'
      ]
    }
  ];

  const studioGrid = [
    {
      url: "https://i.postimg.cc/7LWyk5JJ/DX4A3342.jpg",
      title: "Neugeborenen Studio",
      description: "Professionelle Aufnahmen in warmer Atmosphäre"
    },
    {
      url: "https://i.postimg.cc/0NQqFYjq/00371608.jpg",
      title: "Familien Shooting",
      description: "Die ganze Familie willkommen"
    },
    {
      url: "https://i.postimg.cc/BZ1JJBgS/4-S8-A7739-1024x683.jpg",
      title: "Geschwister Shooting",
      description: "Besondere Momente mit Geschwistern"
    }
  ];

  const seasonalGrid = [
    {
      url: "https://i.postimg.cc/mDPBzYWS/0a9a256b76eacc28798f22b9d58219e5.jpg",
      title: "Baby shooting",

    },
    {
      url: "https://i.postimg.cc/SsHqWnyb/E70I3814.jpg",
      title: "New born shooting",

    },
    {
      url: "https://i.postimg.cc/Hss3QBhH/00023276.jpg",
      title: "Kinder Fotosshooting",
 
    }
  ];

  const specialGrid = [
    {
      url: "https://i.postimg.cc/TY70Qgzb/00124146.jpg",
      title: "Geschwistershooting",
      description: "Besondere Geschwistermomente"
    },
    {
      url: "https://i.postimg.cc/T1Q9zDhZ/3W5K2689.jpg",
      title: "Familienshooting",
      description: "Die ganze Familie vereint"
    },
    {
      url: "https://i.postimg.cc/NMqpmtWP/4S8A2156.jpg",
      title: "Generationenshooting",
      description: "Drei Generationen zusammen"
    }
  ];

  const locationGrid = [
    {
      url: "https://i.postimg.cc/T2cCLZQC/OPLATEK-70x50-L.jpg",
      title: "Persönliche Vorbereitung für authentische Ergebnisse",
      description: "Jedes Fotoshooting beginnt bei uns mit einem kurzen Fragebogen und einem persönlichen Vorgespräch, damit wir Ihre Familie wirklich kennenlernen. Zusätzlich erhalten Sie hilfreiche Hinweise zur Vorbereitung – inklusive Tipps zur Kleidung und Inspiration, persönliche Gegenstände wie Sportausrüstung oder Musikinstrumente mitzubringen. So entstehen Aufnahmen, die Ihre Persönlichkeit zum Ausdruck bringen."
    },
    {
      url: "https://i.postimg.cc/W3x846Tr/220318-das-Create0012-1.jpg",
      title: "Die große Enthüllung auf der Kinoleinwand",
      description: "Nach dem Shooting erwartet Sie ein besonderes Erlebnis: die Präsentation Ihrer Familienporträts auf großer Leinwand – ein interaktiver Moment voller Emotionen in entspannter, stilvoller Atmosphäre. Auf Wunsch ist diese Bildauswahl auch noch am selben Tag möglich."
    },
    {
      url: "https://i.postimg.cc/cJXfv7MC/classic-living-room-with-an-upholstered-bench-1-480x480.webp",
      title: "Handwerklich gefertigte Qualität – mit Liebe geliefert",
      description: "Jedes Portrait wird bei uns sorgfältig bearbeitet, farboptimiert und qualitätsgeprüft. Ihre fertigen Bilder erhalten Sie als hochwertige Drucke per versichertem Versand – die Lieferung ist für Sie selbstverständlich kostenlos."
    }
  ];

  const handleAddToCart = (pkg: typeof packages[0]) => {
    addItem({
      title: `Neugeborenen Fotoshooting - ${pkg.title}`,
      price: pkg.price,
      quantity: 1,
      packageType: pkg.subtitle
    });
    navigate('/cart');
  };

  return (
    <GutscheinLayout
      title="Neugeborenen Fotoshooting"
      subtitle="Die ersten kostbaren Momente Ihres Babys"
      image="https://i.postimg.cc/WzrVSs3F/3-J9-A3679-renamed-3632.jpg"
    >
      <div className="max-w-4xl mx-auto">
        {/* Content Block */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-16">
          <div className="md:grid md:grid-cols-2 items-center">
            <div className="p-8 md:p-12">
              <h2 className="text-3xl font-bold text-purple-900 mb-6">
                Die ersten Tage für immer festgehalten ✨
              </h2>
              <p className="text-gray-700 mb-6">
                Die ersten Tage mit Ihrem Neugeborenen sind kostbar und einzigartig. 
                In unserem speziell eingerichteten, warmen Studio schaffen wir eine 
                sichere und gemütliche Atmosphäre für zauberhafte Babyfotos.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  Spezialisiert auf Neugeborenen-Fotografie
                </li>
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  Beste Zeit: 5-14 Tage nach der Geburt
                </li>
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  Professionelle Requisiten inklusive
                </li>
              </ul>
            </div>
            <div className="relative h-96 md:h-full">
              <img 
                src="https://i.postimg.cc/7LsqZBd6/IMG-6736.jpg"
                alt="Neugeborenen-Shooting"
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
              Termine nach der Geburt flexibel planbar
            </p>
          </div>
          <div className="text-center">
            <Heart size={48} className="text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Sanfte Betreuung</h3>
            <p className="text-gray-600">
              Spezialisiert auf Neugeborenen-Fotografie
            </p>
          </div>
          <div className="text-center">
            <Camera size={48} className="text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Studio-Ausstattung</h3>
            <p className="text-gray-600">
              Professionelle Requisiten und Accessoires
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
                Perfekte Umgebung für Ihr Baby 📸
              </h2>
              <p className="text-gray-700 mb-6">
                Unser speziell eingerichtetes Neugeborenen-Studio bietet die perfekte, 
                sichere Umgebung für die ersten Fotos Ihres Babys. Mit beheizbarem Raum 
                und professioneller Ausstattung schaffen wir optimale Bedingungen für 
                entspannte Aufnahmen.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  Beheizbares, sicheres Studio
                </li>
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  Professionelle Baby-Requisiten
                </li>
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  Stillbereich für Mütter
                </li>
              </ul>
            </div>
            <div className="relative h-96 md:h-full">
              <img 
                src="https://i.postimg.cc/GtbKgQ3F/Herbaczek-3-W5-K3552.jpg"
                alt="Neugeborenen-Studio"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            </div>
          </div>
        </div>

        {/* Location Highlights Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-purple-900 mb-8 text-center">
            Unsere Studios
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
            <li>• Beheiztes Studio für das Wohlbefinden des Babys</li>
      
 
          </ul>
        </div>
      </div>
    </GutscheinLayout>
  );
};

export default NewbornGutscheinPage;