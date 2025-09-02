import React, { useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Camera } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const FotoshootingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
      title: t('photoshoots.familyTitle'),
      description: t('photoshoots.familyDescription'),
      image: 'https://i.postimg.cc/gcKwDrqv/Baby-Pink-Bubbles-20x20.jpg',
      link: '/gutschein/family'
    },
    {
      title: t('photoshoots.pregnancyTitle'),
      description: t('photoshoots.pregnancyDescription'),
      image: 'https://i.postimg.cc/WzrVSs3F/3-J9-A3679-renamed-3632.jpg',
      link: '/gutschein/maternity'
    },
    {
      title: t('photoshoots.newbornTitle'),
      description: t('photoshoots.newbornDescription'),
      image: 'https://i.postimg.cc/43YQ9VD4/4-S8-A4770-105-1024x683-Copy.jpg',
      link: '/gutschein/newborn'
    },
    {
      title: t('photoshoots.businessTitle'),
      description: t('photoshoots.businessDescription'),
      image: 'https://i.postimg.cc/RZjf8FsX/Whats-App-Image-2025-05-24-at-2-38-45-PM-1.jpg',
      link: '/fotoshootings/business'
    },
    {
      title: t('photoshoots.eventTitle'),
      description: t('photoshoots.eventDescription'),
      image: 'https://i.postimg.cc/907tz7nR/21469528-10155302675513124-226449768-n.jpg',
      link: '/fotoshootings/event'
    },
    {
      title: t('photoshoots.weddingTitle'),
      description: t('photoshoots.weddingDescription'),
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
              {t('photoshoots.title')}
            </h1>
            <p className="text-purple-100 text-lg">
              {t('photoshoots.subtitle')}
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
                      onClick={() => {
                        scrollToTop();
                        navigate(type.link);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-8 rounded-lg transition-colors transform hover:scale-105"
                    >
                      {t('photoshoots.learnMore')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <Clock size={48} className="text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">{t('photoshoots.flexibleAppointments')}</h3>
              <p className="text-gray-600">
                {t('photoshoots.flexibleDescription')}
              </p>
            </div>
            <div className="text-center">
              <Users size={48} className="text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">{t('photoshoots.wholeFamily')}</h3>
              <p className="text-gray-600">
                {t('photoshoots.wholeFamilyDescription')}
              </p>
            </div>
            <div className="text-center">
              <Camera size={48} className="text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">{t('photoshoots.professionalEquipment')}</h3>
              <p className="text-gray-600">
                {t('photoshoots.professionalDescription')}
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default FotoshootingsPage;