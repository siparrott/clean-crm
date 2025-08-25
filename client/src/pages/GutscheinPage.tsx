import React, { useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { useNavigate } from 'react-router-dom';
import { Camera, Heart, Baby } from 'lucide-react';

const GutscheinPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // SEO Meta Tags
    document.title = 'Gutscheine für Fotoshootings Wien - Familien & Baby | New Age Fotografie';
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Fotoshooting-Gutscheine für Wien: Familienfotografie, Schwangerschaftsfotos, Neugeborenenbilder. Das perfekte Geschenk für besondere Momente.');

    return () => {
      document.title = 'New Age Fotografie - Familienfotograf Wien';
    };
  }, []);

  const packages = [
    {
      title: 'Familien Fotoshooting',
      description: 'Unvergessliche Momente für die ganze Familie',
      icon: Camera,
      image: 'https://i.imgur.com/4m5hoL9.jpg',
      link: '/gutschein/family'
    },
    {
      title: 'Schwangerschafts Fotoshooting',
      description: 'Magische Momente Ihrer Schwangerschaft',
      icon: Heart,
      image: 'https://i.postimg.cc/WzrVSs3F/3-J9-A3679-renamed-3632.jpg',
      link: '/gutschein/maternity'
    },
    {
      title: 'Neugeborenen Fotoshooting',
      description: 'Die ersten kostbaren Momente Ihres Babys',
      icon: Baby,
      image: 'https://i.imgur.com/QWOgLqX.jpg',
      link: '/gutschein/newborn'
    }
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-purple-900 mb-8 text-center">
          Fotoshooting Gutscheine Wien - Das perfekte Geschenk
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {packages.map((pkg, index) => {
            const Icon = pkg.icon;
            return (
              <div 
                key={index}
                onClick={() => navigate(pkg.link)}
                className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-48">
                  <img 
                    src={pkg.image}
                    alt={pkg.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-lg">
                    <Icon className="text-purple-600" size={24} />
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-purple-900 mb-2">
                    {pkg.title}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {pkg.description}
                  </p>
                  <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                    Mehr erfahren
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default GutscheinPage;