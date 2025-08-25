import React from 'react';
import GutscheinLayout from '../../components/gutschein/GutscheinLayout';
import { Clock, Heart, Camera, Calendar } from 'lucide-react';

const EventFotoshootingPage: React.FC = () => {
  const eventPhotos = [
    {
      url: "https://i.postimg.cc/907tz7nR/21469528-10155302675513124-226449768-n.jpg",
      title: "Corporate Event"
    },
    {
      url: "https://i.postimg.cc/QdHN7Jqy/121588004-364470784911600-8688844506532345601-n.jpg",
      title: "Conference"
    },
    {
      url: "https://i.postimg.cc/vBdGpFwJ/COS-1254.jpg",
      title: "Team Building"
    }
  ];

  const additionalPhotos = [
    {
      url: "https://i.postimg.cc/wTDQpDNn/IMG-2582.jpg",
      title: "Business Conference"
    },
    {
      url: "https://i.postimg.cc/bY79WmZQ/K36C7261.jpg",
      title: "Team Events"
    },
    {
      url: "https://i.postimg.cc/Y9kwd61k/4S8A8486.jpg",
      title: "Networking Events"
    },
    {
      url: "https://i.postimg.cc/gj2bWGST/IGEPHA-Park-Hyatt-6003.jpg",
      title: "Corporate Celebrations"
    },
    {
      url: "https://i.postimg.cc/Y9XyQYRd/COS-1203.jpg",
      title: "Product Presentations"
    },
    {
      url: "https://i.postimg.cc/Tw24yCVy/K36C8454.jpg",
      title: "Company Milestones"
    }
  ];

  const ballSportsPhotos = [
    {
      url: "https://i.postimg.cc/QMxS8Vks/Ball-des-Sports-2025-www-newagefotografie-com-5590.jpg",
      title: "Elegant Moments",
      description: "Capturing the grace of formal events"
    },
    {
      url: "https://i.postimg.cc/bwP35mZZ/Ball-des-Sports-2025-www-newagefotografie-com-5766.jpg",
      title: "Social Gatherings",
      description: "Networking in style"
    },
    {
      url: "https://i.postimg.cc/mrXjtR89/Ball-des-Sports-2025-www-newagefotografie-com-5825.jpg",
      title: "Event Highlights",
      description: "Key moments from the evening"
    },
    {
      url: "https://i.postimg.cc/FRYZSqBB/Ball-des-Sports-2025-www-newagefotografie-com-5855.jpg",
      title: "Candid Interactions",
      description: "Natural moments between guests"
    },
    {
      url: "https://i.postimg.cc/FFJpsMcf/Ball-des-Sports-2025-www-newagefotografie-com-5878.jpg",
      title: "Event Atmosphere",
      description: "The ambiance of the ball"
    },
    {
      url: "https://i.postimg.cc/yd2TyjqY/Ball-des-Sports-2025-www-newagefotografie-com-6331.jpg",
      title: "Distinguished Guests",
      description: "VIP moments captured"
    },
    {
      url: "https://i.postimg.cc/8cWmKvDd/Ball-des-Sports-2025-www-newagefotografie-com-6382.jpg",
      title: "Dance Floor",
      description: "Celebration in motion"
    },
    {
      url: "https://i.postimg.cc/RV5R3gQg/Ball-des-Sports-2025-www-newagefotografie-com-6459.jpg",
      title: "Evening Entertainment",
      description: "Performances and shows"
    },
    {
      url: "https://i.postimg.cc/SN6Gccgk/Ball-des-Sports-2025-www-newagefotografie-com-7025.jpg",
      title: "Formal Portraits",
      description: "Professional event photography"
    },
    {
      url: "https://i.postimg.cc/7b8TftF0/Ball-des-Sports-2025-www-newagefotografie-com-7789.jpg",
      title: "Event Details",
      description: "The finer points of the evening"
    },
    {
      url: "https://i.postimg.cc/3xZnQ2Gn/Ball-des-Sports-2025-www-newagefotografie-com-7920.jpg",
      title: "Social Moments",
      description: "Connections and conversations"
    },
    {
      url: "https://i.postimg.cc/Nfmdb3jh/Ball-des-Sports-2025-www-newagefotografie-com-7978.jpg",
      title: "Grand Finale",
      description: "Memorable closing moments"
    }
  ];

  return (
    <GutscheinLayout
      title="Eventfotografie in Wien & Zürich"
      subtitle="New Age Fotografie – Authentisch. Professionell. Unvergesslich."
      image="https://i.postimg.cc/rwtMhFtV/Ball-des-Sports-2025-www-newagefotografie-com-5513.jpg"
    >
      <div className="max-w-4xl mx-auto">
        {/* Main Content */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-purple-900 mb-4">Ihre Veranstaltung. Ihre Emotionen. Perfekt eingefangen.</h2>
            <p className="text-gray-700 text-lg">
              Sie planen ein Event und möchten sich darauf verlassen können, dass alle wichtigen Momente eingefangen werden?
              <br />
              Wir sind auf natürliche, stimmungsvolle Eventfotografie spezialisiert – ohne gestellte Posen, ohne steife Atmosphäre.
            </p>
          </div>

          {/* Photo Grid - Three Images */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {eventPhotos.map((photo, index) => (
              <div key={index} className="relative group overflow-hidden rounded-lg">
                <img
                  src={photo.url}
                  alt={photo.title}
                  className="w-full h-64 object-cover transform transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <div className="text-white">
                    <h3 className="font-bold text-lg mb-1">{photo.title}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Why Choose Us */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
            <h3 className="text-2xl font-bold text-purple-900 mb-6">Warum Kunden uns wählen:</h3>
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

          {/* Additional Photo Grid */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-purple-900 mb-6 text-center">Impressionen unserer Arbeit</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {additionalPhotos.map((photo, index) => (
                <div key={index} className="relative group overflow-hidden rounded-lg">
                  <img
                    src={photo.url}
                    alt={photo.title}
                    className="w-full h-64 object-cover transform transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                    <div className="text-white">
                      <h3 className="font-bold text-lg mb-1">{photo.title}</h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ball des Sports Grid */}
          <div className="mb-16">
            <h3 className="text-2xl font-bold text-purple-900 mb-8 text-center">
             Eleganz & Stil
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {ballSportsPhotos.map((photo, index) => (
                <div key={index} className="relative group overflow-hidden rounded-lg">
                  <img 
                    src={photo.url} 
                    alt={photo.title}
                    className="w-full h-64 object-cover transform transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                    <div className="text-white">
                      <h3 className="font-bold text-lg mb-1">{photo.title}</h3>
                      <p className="text-sm opacity-90">{photo.description}</p>
                    </div>
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
              <p className="text-gray-700 italic mb-4">"Perfekt für jedes Event."</p>
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

export default EventFotoshootingPage;