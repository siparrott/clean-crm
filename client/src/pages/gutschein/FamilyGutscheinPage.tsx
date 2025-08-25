import React from 'react';
import GutscheinLayout from '../../components/gutschein/GutscheinLayout';
import { Check, Clock, Users, Camera, Heart } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';

const FamilyGutscheinPage: React.FC = () => {
  const { addItem } = useCart();
  const navigate = useNavigate();

  const packages = [
    {
      title: 'Family Basic',
      subtitle: 'Perfect for Small Families',
      price: 95,
      originalPrice: 195,
      features: [
        '30 Minuten Shooting',
        '1 bearbeitete Fotos',
        'Begrüßungsgetränk',
        'Outfit-Wechsel möglich',
        'Bis zu 12 Erwachsene und 4 Kinder möglich, Haustiere willkommen'
      ]
    },
    {
      title: 'Family Premium',
      subtitle: 'Ideal für größere Familien',
      price: 195,
      originalPrice: 295,
      features: [
        '45 Minuten Shooting',
        '5 bearbeitete Fotos',
        'Begrüßungsgetränk',
        'Outfit-Wechsel möglich',
        'Bis zu 12 Erwachsene und 4 Kinder möglich, Haustiere willkommen'
      ],
      isFeatured: true
    },
    {
      title: 'Family Deluxe',
      subtitle: 'Das komplette Familienerlebnis',
      price: 295,
      originalPrice: 395,
      features: [
        '60 Minuten Shooting',
        '10 bearbeitete Fotos',
        'Begrüßungsgetränk',
        'Outfit-Wechsel möglich',
        'Alle Kombinationen',
        'Bis zu 12 Erwachsene und 4 Kinder möglich, Haustiere willkommen'
      ]
    }
  ];

  const studioGrid = [
    {
      url: "https://i.postimg.cc/qRZCsv3s/00007581.jpg",
      title: "Familienshooting im Studio",
      description: "Professionelle Aufnahmen in unserem modernen Studio"
    },
    {
      url: "https://i.postimg.cc/hvdhVbgn/00480020.jpg",
      title: "Festive Familienshooting",
      description: "Natürliche Momente in schöner Umgebung"
    },
    {
      url: "https://i.imgur.com/puVF0cD.jpg",
      title: "Generationen Fotoshooting",
      description: "Besondere Momente mit der ganzen Familie"
    }
  ];

  const seasonalGrid = [
    {
      url: "https://i.postimg.cc/7LZM86Sz/expo-image.jpg",
      title: "Hobbie shooting",
      description: "Blühende Landschaften als perfekte Kulisse"
    },
    {
      url: "https://i.postimg.cc/BZK5GRPm/JAGSCHTITZ-A2-L.jpg",
      title: "Familenshooting",
      description: "Goldene Stunden im warmen Sonnenlicht"
    },
    {
      url: "https://i.postimg.cc/m2WYZVQB/m9-n1214.jpg",
      title: "Babyshooting",
      description: "Warme Farben und gemütliche Atmosphäre"
    }
  ];

  const specialGrid = [
    {
      url: "https://i.postimg.cc/6QbV9Xhm/F-HRER-70x50-L.jpg",
      title: "Geburtstag",
      description: "Unvergessliche Geburtstagsmomente"
    },
    {
      url: "https://i.postimg.cc/tRwx77yy/00009094.jpg",
      title: "Familientreffen",
      description: "Große Familientreffen festhalten"
    },
    {
      url: "https://i.postimg.cc/Y2GRChZf/00508819.jpg",
      title: "Jubiläen",
      description: "Besondere Meilensteine feiern"
    }
  ];

  const locationGrid = [
    {
      url: "https://i.postimg.cc/3RyXNcSJ/Mechtler-A3-Lein.jpg",
      title: "Persönliche Vorbereitung für authentische Ergebnisse",
      description: "Jedes Fotoshooting beginnt bei uns mit einem kurzen Fragebogen und einem persönlichen Vorgespräch, damit wir Ihre Familie wirklich kennenlernen. Zusätzlich erhalten Sie hilfreiche Hinweise zur Vorbereitung – inklusive Tipps zur Kleidung und Inspiration, persönliche Gegenstände wie Sportausrüstung oder Musikinstrumente mitzubringen. So entstehen Aufnahmen, die Ihre Persönlichkeit zum Ausdruck bringen."
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
      title: `Familien Fotoshooting - ${pkg.title}`,
      price: pkg.price,
      quantity: 1,
      packageType: pkg.subtitle
    });
    navigate('/cart');
  };

  return (
    <GutscheinLayout
      title="Familien Fotoshooting"
      subtitle="Unvergessliche Momente für die ganze Familie"
      image="https://i.imgur.com/o9HCqp0.jpg"
    >
      <div className="max-w-4xl mx-auto">
        {/* Content Block */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-16">
          <div className="md:grid md:grid-cols-2 items-center">
            <div className="p-8 md:p-12">
              <h2 className="text-3xl font-bold text-purple-900 mb-6">
                Ihr Moment, Ihr Zauber! ✨
              </h2>
              <p className="text-gray-700 mb-6">
                Bei New Age Fotografie entstehen keine gestellten Posen – sondern Bilder, die eure Geschichte erzählen. 
                Ob im hellen Studio in Wien oder draußen an eurem Lieblingsort – wir halten fest, was euch als Familie ausmacht: 
                Lachen, Nähe, kleine Gesten.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  Entspannte Atmosphäre für natürliche Aufnahmen
                </li>
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  Moderne Studios & ausgewählte Outdoor-Locations
                </li>
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  Flexible Terminvereinbarung, auch am Wochenende
                </li>
              </ul>
            </div>
            <div className="relative h-96 md:h-full">
              <img 
                src="https://i.postimg.cc/GpjM3s5h/4-S8-A8377-2.jpg"
                alt="Familie beim Fotoshooting"
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
            <Users size={48} className="text-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Für die ganze Familie</h3>
            <p className="text-gray-600">
              Alle Familienmitglieder willkommen
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
            Besondere Anlässe
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
                Warum ein Familienportrait mit New Age Fotografie? 📸
              </h2>
              <p className="text-gray-700 mb-6">
               
              </p>
              <ul className="space-y-4">
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  Individuell & persönlich: Jedes Shooting wird auf Ihre Familie zugeschnitten – mit Platz für bis zu 15 Personen und Haustiere.
                </li>
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  Zeitlose Portraits: Hochwertige Bilder, die Ihr Zuhause schmücken und sich ideal als Geschenke oder für Social Media eignen.
                </li>
                <li className="flex items-center text-gray-700">
                  <Heart className="text-purple-600 mr-3" size={20} />
                  Unvergessliches Erlebnis: Ein entspanntes Fotoshooting, das Spaß macht – mit Erinnerungen, die ein Leben lang halten.
                </li>
              </ul>
            </div>
            <div className="relative h-96 md:h-full">
              <img 
                src="https://i.postimg.cc/L82CcTx0/E70I9183.jpg"
                alt="Familie im Stadtpark"
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
            <li>• Shooting-Locations in Wien und Umgebung</li>
            <li>• Beratung zur Outfit-Wahl inklusive</li>
            <li>• Alle Preise inkl. MwSt</li>
          </ul>
        </div>
      </div>
    </GutscheinLayout>
  );
};

export default FamilyGutscheinPage;