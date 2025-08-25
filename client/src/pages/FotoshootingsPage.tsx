import React, { useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Camera } from 'lucide-react';

const FotoshootingsPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // SEO Meta Tags
    document.title = 'Fotoshootings Wien - Familien & Neugeborenen Fotografie | New Age Fotografie';
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Professionelle Fotoshootings in Wien: Familienporträts, Schwangerschaftsfotos, Neugeborenenbilder, Business-Headshots. Erfahrener Fotograf mit Studio in 1050 Wien.');

    // Open Graph tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', 'Fotoshootings Wien - Professionelle Fotografie | New Age Fotografie');

    return () => {
      document.title = 'New Age Fotografie - Familienfotograf Wien';
    };
  }, []);

  const shootingTypes = [
    {
      title: 'Familienporträts in Wien & Zürich',
      description: 'Unsere Familiensitzungen drehen sich darum, die einzigartige Bindung festzuhalten, die Sie teilen. Von spontanen Momenten bis hin zu inszenierten Porträts schaffen wir Bilder, die Sie für immer schätzen werden.',
      image: 'https://i.postimg.cc/gcKwDrqv/Baby-Pink-Bubbles-20x20.jpg',
      link: '/gutschein/family'
    },
    {
      title: 'Schwangerschaftsfotografie in Wien & Zürich',
      description: 'Feiern Sie die Schönheit der Mutterschaft mit unseren Schwangerschaftssitzungen. Wir schaffen atemberaubende Bilder, die diese besondere Zeit in Ihrem Leben hervorheben.',
      image: 'https://i.postimg.cc/WzrVSs3F/3-J9-A3679-renamed-3632.jpg',
      link: '/gutschein/maternity'
    },
    {
      title: 'Neugeborenenfotografie in Wien & Zürich',
      description: 'Es gibt nichts Zarteres als die ersten Tage im Leben eines Neugeborenen. Unsere Neugeborenensitzungen konzentrieren sich darauf, diese flüchtigen Momente mit Zärtlichkeit und Sorgfalt einzufangen.',
      image: 'https://i.postimg.cc/43YQ9VD4/4-S8-A4770-105-1024x683-Copy.jpg',
      link: '/gutschein/newborn'
    },
    {
      title: 'Firmenfotografie in Wien & Zürich',
      description: 'Verbessern Sie Ihr professionelles Image mit unseren Firmenfotografie-Dienstleistungen. Von Porträts bis hin zu Teamfotos helfen wir Ihnen, Ihr Unternehmen im besten Licht zu präsentieren.',
      image: 'https://i.postimg.cc/RZjf8FsX/Whats-App-Image-2025-05-24-at-2-38-45-PM-1.jpg',
      link: '/fotoshootings/business'
    },
    {
      title: 'Eventfotografie in Wien & Zürich',
      description: 'Es gibt nichts Aufregenderes als die unvergesslichen Momente bei Veranstaltungen. Unsere Eventfotografie konzentriert sich darauf, diese besonderen Augenblicke mit Kreativität und Professionalität festzuhalten.',
      image: 'https://i.postimg.cc/907tz7nR/21469528-10155302675513124-226449768-n.jpg',
      link: '/fotoshootings/event'
    },
    {
      title: 'Hochzeitsfotografie in Wien & Zürich',
      description: 'Es gibt nichts Schöneres als die Magie eines Hochzeitstages. Unsere Hochzeitsfotografie fängt diese magischen Momente mit Liebe zum Detail und künstlerischem Flair ein.',
      image: 'https://i.postimg.cc/j50XzC6p/4S8A7207.jpg',
      link: '/fotoshootings/wedding'
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-600 to-purple-800 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Fotoshootings Wien - Familien & Neugeborenen Fotografie
            </h1>
            <p className="text-purple-100 text-lg">
              Professionelle Fotoshootings in Wien: Familienporträts, Schwangerschaftsfotos, Neugeborenenbilder & Business-Headshots
            </p>
          </div>
        </div>
      </section>

      {/* Content Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {shootingTypes.map((type, index) => (
              <div key={index} className="mb-12">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-purple-900 mb-4">{type.title}</h2>
                  <p className="text-gray-600">{type.description}</p>
                </div>

                <div className="relative aspect-[4/3] rounded-lg overflow-hidden mb-8">
                  <img 
                    src={type.image}
                    alt={type.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                    <button
                      onClick={() => navigate(type.link)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-8 rounded-lg transition-colors transform hover:scale-105"
                    >
                      Mehr erfahren
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <Clock size={48} className="text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Flexible Termine</h3>
              <p className="text-gray-600">
                Wir bieten flexible Terminvereinbarung an, auch an Wochenenden
              </p>
            </div>
            <div className="text-center">
              <Users size={48} className="text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Für die ganze Familie</h3>
              <p className="text-gray-600">
                Geeignet für Familien jeder Größe, inklusive Haustiere
              </p>
            </div>
            <div className="text-center">
              <Camera size={48} className="text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Professionelle Ausrüstung</h3>
              <p className="text-gray-600">
                Modernste Kameraausrüstung für beste Ergebnisse
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default FotoshootingsPage;