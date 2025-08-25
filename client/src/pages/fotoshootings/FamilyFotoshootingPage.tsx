import React from 'react';
import GutscheinLayout from '../../components/gutschein/GutscheinLayout';
import { Clock, Users, Camera, Heart } from 'lucide-react';

const FamilyFotoshootingPage: React.FC = () => {
  const familyPhotos = [
    {
      url: "https://i.imgur.com/3gctBYO.jpg",
      title: "Family Portrait"
    },
    {
      url: "https://i.imgur.com/4m5hoL9.jpg",
      title: "Outdoor Family"
    },
    {
      url: "https://i.imgur.com/o9HCqp0.jpg",
      title: "Studio Family"
    }
  ];

  const portfolioPhotos = [
    {
      url: "https://i.imgur.com/1668928.jpg",
      title: "Family Fun"
    },
    {
      url: "https://i.imgur.com/3875080.jpg",
      title: "Natural Moments"
    },
    {
      url: "https://i.imgur.com/3662850.jpg",
      title: "Family Love"
    },
    {
      url: "https://i.imgur.com/3184183.jpg",
      title: "Generations"
    },
    {
      url: "https://i.imgur.com/2774556.jpg",
      title: "Siblings"
    },
    {
      url: "https://i.imgur.com/3760263.jpg",
      title: "Family Bonds"
    }
  ];

  return (
    <GutscheinLayout
      title="Familienporträts in Wien & Zürich"
      subtitle="New Age Fotografie – Authentisch. Professionell. Unvergesslich."
      image="https://i.imgur.com/o9HCqp0.jpg"
    >
      <div className="max-w-4xl mx-auto">
        {/* Main Content */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-purple-900 mb-4">Ihre Familie. Ihre Emotionen. Perfekt eingefangen.</h2>
            <p className="text-gray-700 text-lg">
              Sie möchten Ihre Familienmomente festhalten und sich darauf verlassen können, dass alle wichtigen Augenblicke eingefangen werden?
              <br />
              Wir sind auf natürliche, stimmungsvolle Familienfotografie spezialisiert – ohne gestellte Posen, ohne steife Atmosphäre.
            </p>
          </div>

          {/* Photo Grid - Three Images */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {familyPhotos.map((photo, index) => (
              <div key={index} className="relative group overflow-hidden rounded-lg">
                <img
                  src={photo.url}
                  alt={photo.title}
                  className="w-full h-64 object-cover transform transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-lg font-semibold">{photo.title}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Why Choose Us */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
            <h3 className="text-2xl font-bold text-purple-900 mb-6">Warum Familien uns wählen:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-gray-800 mb-2">Unauffällig & präsent</h4>
                <p className="text-gray-600">
                  Wir bewegen uns dezent im Hintergrund und fangen echte Emotionen ein.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 mb-2">Authentisch & natürlich</h4>
                <p className="text-gray-600">
                  Keine gestellten Bilder. Wir zeigen Sie, wie Sie wirklich sind – entspannt und sympathisch.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 mb-2">Ruhig in jeder Situation</h4>
                <p className="text-gray-600">
                  Selbst in stressigen Momenten behalten wir den Überblick und dokumentieren jedes Detail.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 mb-2">Schmeichelhafte Perspektiven</h4>
                <p className="text-gray-600">
                  Wir kennen die besten Blickwinkel, damit sich alle auf den Bildern wiedererkennen und mögen.
                </p>
              </div>
            </div>
          </div>

          {/* Portfolio Grid */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-purple-900 mb-6 text-center">Impressionen unserer Arbeit</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {portfolioPhotos.map((photo, index) => (
                <div key={index} className="relative group overflow-hidden rounded-lg">
                  <img
                    src={photo.url}
                    alt={photo.title}
                    className="w-full h-64 object-cover transform transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-lg font-semibold">{photo.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Flexible Booking */}
          <div className="bg-purple-50 rounded-lg p-8 mb-12">
            <h3 className="text-2xl font-bold text-purple-900 mb-4">Flexibel buchbar – auch an Wochenenden & Feiertagen</h3>
            <p className="text-gray-700">
              Unser einfacher Buchungsprozess ist 7 Tage die Woche verfügbar – so passt sich Ihr Fotograf Ihrem Zeitplan an, nicht umgekehrt.
            </p>
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <p className="text-gray-700 italic mb-4">"Perfekt für jede Familie."</p>
              <p className="text-gray-700 italic mb-4">"Unauffällig, professionell, sympathisch."</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <p className="text-gray-700 italic mb-4">"Fotos, die man wirklich gerne teilt."</p>
              <p className="text-gray-700 italic mb-4">"Einfach zu buchen, zuverlässig und herzlich."</p>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h3 className="text-2xl font-bold text-purple-900 mb-6">📍 Verfügbar in Wien & Zürich</h3>
            <p className="text-lg mb-4">📅 Jetzt Termin sichern: <a href="/warteliste" className="text-purple-600 hover:text-purple-700">Termin planen</a></p>
            <p className="text-lg">📸 New Age Fotografie – Für bleibende Erinnerungen.</p>
          </div>
        </div>
      </div>
    </GutscheinLayout>
  );
};

export default FamilyFotoshootingPage;