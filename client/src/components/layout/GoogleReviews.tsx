import React, { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

interface Review {
  author_name: string;
  rating: number;
  text: string;
  profile_photo_url: string;
  time: number;
}

const GoogleReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([
    {
      author_name: "Sabine Schuster",
      rating: 5,
      text: "Matt ist ein wunderbarer Fotograf, der es versteht, die Persönlichkeit der Menschen einzufangen. Wir haben uns sehr wohl gefühlt und die Bilder sind einfach toll geworden. Sehr zu empfehlen!",
      profile_photo_url: "https://images.unsplash.com/photo-1494790108755-2616b345de9e?w=60&h=60&fit=crop&crop=face&auto=format",
      time: 1686729600000
    },
    {
      author_name: "Katharina Müller",
      rating: 5,
      text: "Wir hatten ein Familienshooting mit Matt und sind begeistert! Die Atmosphäre war super entspannt und die Bilder sind einfach wunderschön geworden. Besonders toll fanden wir, wie geduldig er mit unseren Kindern war. Absolute Empfehlung!",
      profile_photo_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face&auto=format",
      time: 1692144000000
    },
    {
      author_name: "Thomas Wagner",
      rating: 5,
      text: "Professionelles Business-Shooting mit hervorragenden Ergebnissen. Matt hat es geschafft, dass ich mich vor der Kamera wohl gefühlt habe, obwohl ich normalerweise nicht gerne fotografiert werde. Die Bilder nutze ich jetzt für meine Website und LinkedIn - top Qualität!",
      profile_photo_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face&auto=format",
      time: 1689465600000
    },
    {
      author_name: "Lisa Huber",
      rating: 5,
      text: "Unser Neugeborenen-Shooting mit Matt war ein wunderschönes Erlebnis. Er hat sich so viel Zeit genommen und war unglaublich einfühlsam mit unserem kleinen Sohn. Die Fotos sind traumhaft schön geworden und werden uns immer an diese besondere Zeit erinnern.",
      profile_photo_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60&h=60&fit=crop&crop=face&auto=format",
      time: 1693526400000
    },
    {
      author_name: "Michael Bauer",
      rating: 5,
      text: "Matt hat unsere Hochzeit fotografiert und wir sind mehr als zufrieden! Er hat alle wichtigen Momente eingefangen, ohne dabei aufdringlich zu sein. Die Bilder erzählen die Geschichte unseres Tages perfekt. Danke für diese wunderbaren Erinnerungen!",
      profile_photo_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop&crop=face&auto=format",
      time: 1688256000000
    },
    {
      author_name: "Anna Steiner",
      rating: 5,
      text: "Mein Schwangerschaftsshooting mit Matt war ein tolles Erlebnis. Er hat eine sehr angenehme Art und schafft es, dass man sich sofort wohlfühlt. Die Bilder sind wunderschön geworden und zeigen genau die Emotionen, die ich mir gewünscht habe. Sehr empfehlenswert!",
      profile_photo_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&h=60&fit=crop&crop=face&auto=format",
      time: 1691539200000
    }
  ]);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleReviews, setVisibleReviews] = useState<Review[]>([]);
  
  useEffect(() => {
    // Determine how many reviews to show based on screen width
    const handleResize = () => {
      let count = 1;
      if (window.innerWidth >= 1024) {
        count = 3;
      } else if (window.innerWidth >= 768) {
        count = 2;
      }
      
      const visible = [];
      for (let i = 0; i < count; i++) {
        const index = (currentIndex + i) % reviews.length;
        visible.push(reviews[index]);
      }
      setVisibleReviews(visible);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentIndex, reviews]);
  
  const nextReview = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % reviews.length);
  };
  
  const prevReview = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + reviews.length) % reviews.length);
  };
  
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('de-DE', { year: 'numeric', month: 'long' });
  };
  
  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star 
        key={i} 
        size={16} 
        className={i < rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"} 
      />
    ));
  };
  
  return (
    <section className="bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Was unsere Kunden sagen</h2>
          <div className="flex items-center justify-center mb-2">
            <div className="flex">
              {renderStars(5)}
            </div>
            <a 
              href="https://maps.app.goo.gl/L5EFKkMSK7FaiRVa8" 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              4.9 auf Google (253 Bewertungen)
            </a>
          </div>
        </div>
        
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleReviews.map((review, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center mb-4">
                  <img 
                    src={review.profile_photo_url} 
                    alt={review.author_name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-800">{review.author_name}</h3>
                    <div className="flex items-center">
                      <div className="flex mr-2">
                        {renderStars(review.rating)}
                      </div>
                      <span className="text-gray-500 text-sm">{formatDate(review.time)}</span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 line-clamp-4">{review.text}</p>
                <div className="mt-4">
                  <a 
                    href="https://maps.app.goo.gl/L5EFKkMSK7FaiRVa8" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm inline-flex items-center"
                  >
                    Auf Google Maps ansehen
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
          
          <button 
            onClick={prevReview}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 focus:outline-none hidden md:block"
            aria-label="Previous review"
          >
            <ChevronLeft size={24} />
          </button>
          
          <button 
            onClick={nextReview}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 focus:outline-none hidden md:block"
            aria-label="Next review"
          >
            <ChevronRight size={24} />
          </button>
        </div>
        
        <div className="flex justify-center mt-8">
          <a 
            href="https://maps.app.goo.gl/L5EFKkMSK7FaiRVa8" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors inline-flex items-center"
          >
            Alle Bewertungen auf Google ansehen
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
};

export default GoogleReviews;