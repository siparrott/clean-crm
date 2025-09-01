import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { ChevronRight } from 'lucide-react';
import Typewriter from 'typewriter-effect';
import CountUp from 'react-countup';
import photoGridImage from '../assets/photo-grid.jpg';
import { useLanguage } from '../context/LanguageContext';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const testimonials = [
    {
      name: "Sarah M.",
      image: "https://i.imgur.com/BScsxGX.jpg",
      role: t('home.testimonial1Role'),
      text: t('home.testimonial1Text')
    },
    {
      name: "Michael K.",
      image: "https://i.imgur.com/HGZGIGX.jpg",
      role: t('home.testimonial2Role'),
      text: t('home.testimonial2Text')
    },
    {
      name: "Lisa & Tom",
      image: "https://i.imgur.com/fcFwAhs.jpg", 
      role: t('home.testimonial3Role'),
      text: t('home.testimonial3Text')
    },
    {
      name: "Anna W.",
      image: "https://i.imgur.com/xx3UWL7.jpg",
      role: t('home.testimonial4Role'),
      text: t('home.testimonial4Text')
    },
    {
      name: "Maria & Peter",
      image: "https://i.imgur.com/9d98SBH.jpg",
      role: t('home.testimonial5Role'),
      text: t('home.testimonial5Text')
    },
    {
      name: "Christina R.",
      image: "https://i.imgur.com/8HD86CW.jpg",
      role: t('home.testimonial6Role'),
      text: t('home.testimonial6Text')
    }
  ];

  const faqImages = [
    {
      title: t('home.faqQuestion1'),
      image: "https://i.postimg.cc/D09JNp5m/00014518.jpg",
      alt: "Unique photography style"
    },
    {
      title: t('home.faqQuestion2'),
      image: "https://i.postimg.cc/YqFdbhxq/00505458.jpg",
      alt: "Studio and outdoor locations"
    },
    {
      title: t('home.faqQuestion3'),
      image: "https://i.postimg.cc/66k02BNs/00509892.jpg",
      alt: "Photoshoot preparation"
    },
    {
      title: t('home.faqQuestion4'),
      image: "https://i.postimg.cc/W1Pq6KhH/00015672.jpg",
      alt: "Family photoshoot duration"
    },
    {
      title: t('home.faqQuestion5'),
      image: "https://i.postimg.cc/7Y1g57V7/RJGOQBO.jpg",
      alt: "Pets in photoshoot"
    },
    {
      title: t('home.faqQuestion6'),
      image: "https://i.postimg.cc/Wb070x2d/brother-sister-close-up-30x20-L.jpg",
      alt: "Comfortable atmosphere"
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-white">
        <div className="container mx-auto px-4 py-16 md:py-24 flex flex-col md:flex-row items-center justify-between">
          <div className="max-w-2xl md:w-3/5 mb-8 md:mb-0">
            <h1 className="mb-4 leading-tight text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 text-transparent bg-clip-text">
              {t('home.heroTitle')}
            </h1>
            <div className="mb-6">
              <span className="block text-xl sm:text-2xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-pink-500 to-purple-600 text-transparent bg-clip-text">
                <Typewriter
                  options={{
                    strings: [t('home.heroSubtitle')],
                    autoStart: true,
                    loop: true,
                    cursor: '',
                    delay: 50,
                    deleteSpeed: 50
                  }}
                />
              </span>
              <span className="block text-xl sm:text-2xl md:text-4xl font-bold text-gray-900 tracking-tighter animate-fade-in-up">
                {t('home.heroDescription')}
              </span>
            </div>
            <button 
              onClick={() => navigate('/warteliste')}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium py-3 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              {t('home.bookShootingButton')}
            </button>
          </div>
          <div className="md:w-2/5">
            <img 
              src={photoGridImage}
              alt="Comprehensive family portrait showcase featuring various photography styles including family groups, couples, newborns, maternity, and lifestyle sessions"
              className="w-full rounded-lg shadow-lg"
              onError={(e) => {
                // Fallback for mobile/loading issues
                // console.log removed
                e.currentTarget.src = "https://i.postimg.cc/zGVgt500/Familienportrat-Wien-Krchnavy-Stolz-0105-1024x683-1.jpg";
              }}
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* Description Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
              {t('home.description')}
            </p>
          </div>
        </div>
      </section>

      {/* Counter Section */}
      <section className="bg-gradient-to-r from-pink-500 to-purple-600 py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="text-white">
              <div className="text-3xl md:text-4xl font-bold mb-2">
                <CountUp end={27156} duration={2.5} separator="," />
              </div>
              <div className="text-base md:text-lg text-white/90">{t('home.happyFamilies')}</div>
            </div>
            <div className="text-white">
              <div className="text-3xl md:text-4xl font-bold mb-2">
                <CountUp end={5431977} duration={2.5} separator="," />
              </div>
              <div className="text-base md:text-lg text-white/90">{t('home.portraitsCaptured')}</div>
            </div>
            <div className="text-white">
              <div className="text-3xl md:text-4xl font-bold mb-2">
                <CountUp end={27} duration={2.5} />
              </div>
              <div className="text-base md:text-lg text-white/90">{t('home.yearsExperience')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {/* First Content Block */}
          <div className="flex flex-col md:flex-row items-center gap-8 mb-16">
            <div className="md:w-1/3">
              <div className="aspect-[4/3] overflow-hidden rounded-lg shadow-lg">
                <img 
                  src="https://i.postimg.cc/zGVgt500/Familienportrat-Wien-Krchnavy-Stolz-0105-1024x683-1.jpg"
                  alt="Familienfotografie Wien - Professionelle Familienporträts im Studio"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
            <div className="md:w-2/3">
              <h2 className="text-2xl md:text-3xl font-bold text-purple-600 mb-4">
                {t('home.pregnancyAndFamilyTitle')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('home.pregnancyDescription1')}
              </p>
              <p className="text-gray-700 mb-4">
                {t('home.pregnancyDescription2')}
              </p>
              <p className="text-gray-700">
                {t('home.pregnancyDescription3')}
              </p>
            </div>
          </div>

          {/* Second Content Block */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-8">
            <div className="md:w-1/3">
              <div className="aspect-[4/3] overflow-hidden rounded-lg shadow-lg">
                <img 
                  src="https://i.imgur.com/ITKEF8q.jpg"
                  alt="Neugeborenenfotos Wien - Einfühlsame Babyfotografie im Studio"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
            <div className="md:w-2/3">
              <h2 className="text-2xl md:text-3xl font-bold text-purple-600 mb-4">
                {t('home.businessHeadshotsTitle')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('home.businessDescription1')}
              </p>
              <p className="text-gray-700 mb-4">
                {t('home.businessDescription2')}
              </p>
              <p className="text-gray-700">
                {t('home.businessDescription3')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Blocks */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Family Portraits */}
            <div 
              onClick={() => navigate('/fotoshootings')}
              className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-transform hover:-translate-y-1"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img 
                  src="https://i.postimg.cc/V6TFF8rC/00508749.jpg"
                  alt="Familienporträts Wien - Natürliche Familienfotografie"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-purple-900 mb-2">{t('home.familyPortraitsTitle')}</h3>
                <p className="text-gray-600">
                  {t('home.familyPortraitsDescription')}
                </p>
              </div>
            </div>

            {/* Pregnancy Photography */}
            <div 
              onClick={() => navigate('/fotoshootings')}
              className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-transform hover:-translate-y-1"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img 
                  src="https://i.imgur.com/AMnhw6w.jpg"
                  alt="Babybauch Fotografie Wien - Schwangerschaftsfotos im Studio"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-purple-900 mb-2">{t('home.pregnancyPhotographyTitle')}</h3>
                <p className="text-gray-600">
                  {t('home.pregnancyPhotographyDescription')}
                </p>
              </div>
            </div>

            {/* Newborn Photography */}
            <div 
              onClick={() => navigate('/fotoshootings')}
              className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-transform hover:-translate-y-1"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img 
                  src="https://i.imgur.com/VLYZQof.jpg"
                  alt="Neugeborenenfotos im Studio Wien - Professionelle Babyfotografie"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-purple-900 mb-2">{t('home.newbornPhotographyTitle')}</h3>
                <p className="text-gray-600">
                  {t('home.newbornPhotographyDescription')}
                </p>
              </div>
            </div>

            {/* Business Photography */}
            <div 
              onClick={() => navigate('/fotoshootings')}
              className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-transform hover:-translate-y-1"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img 
                  src="https://i.postimg.cc/NMqvfKv7/4S8A6958.jpg"
                  alt="Business Headshots Wien - Professionelle Businessfotografie"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-purple-900 mb-2">{t('home.businessPhotographyTitle')}</h3>
                <p className="text-gray-600">
                  {t('home.businessPhotographyDescription')}
                </p>
              </div>
            </div>

            {/* Event Photography */}
            <div 
              onClick={() => navigate('/fotoshootings')}
              className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-transform hover:-translate-y-1"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img 
                  src="https://i.imgur.com/0KAHvWd.jpg"
                  alt="Event photography"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-purple-900 mb-2">{t('home.eventPhotographyTitle')}</h3>
                <p className="text-gray-600">
                  {t('home.eventPhotographyDescription')}
                </p>
              </div>
            </div>

            {/* Wedding Photography */}
            <div 
              onClick={() => navigate('/fotoshootings')}
              className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-transform hover:-translate-y-1"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img 
                  src="https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg"
                  alt="Wedding photography"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-purple-900 mb-2">{t('home.weddingPhotographyTitle')}</h3>
                <p className="text-gray-600">
                  {t('home.weddingPhotographyDescription')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Title Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-purple-900">
            {t('home.portraitStudioTitle')}
          </h2>
        </div>
      </section>

      {/* Voucher Grid Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Pregnancy Photoshoot */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="aspect-[4/3] overflow-hidden">
                <img 
                  src="https://i.imgur.com/Vd6xtPg.jpg"
                  alt="Pregnancy photoshoot"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-purple-900 mb-2">{t('home.pregnancyShootingTitle')}</h3>
                <p className="text-gray-600 mb-4">{t('home.pregnancyShootingDescription')}</p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-purple-600">€199</span>
                  <button 
                    onClick={() => navigate('/gutschein/maternity')}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full transition-colors"
                  >
                    {t('home.bookNowButton')}
                  </button>
                </div>
              </div>
            </div>

            {/* Family Photoshoot */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="aspect-[4/3] overflow-hidden">
                <img 
                  src="https://i.imgur.com/4m5hoL9.jpg"
                  alt="Family photoshoot"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-purple-900 mb-2">{t('home.familyShootingTitle')}</h3>
                <p className="text-gray-600 mb-4">{t('home.familyShootingDescription')}</p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-purple-600">€249</span>
                  <button 
                    onClick={() => navigate('/gutschein/family')}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full transition-colors"
                  >
                    {t('home.bookNowButton')}
                  </button>
                </div>
              </div>
            </div>

            {/* Newborn Photoshoot */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="aspect-[4/3] overflow-hidden">
                <img 
                  src="https://i.imgur.com/QWOgLqX.jpg"
                  alt="Newborn photoshoot"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-purple-900 mb-2">{t('home.newbornShootingTitle')}</h3>
                <p className="text-gray-600 mb-4">{t('home.newbornShootingDescription')}</p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-purple-600">€299</span>
                  <button 
                    onClick={() => navigate('/gutschein/newborn')}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full transition-colors"
                  >
                    {t('home.bookNowButton')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-purple-900">
            {t('home.testimonialsTitle')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center mb-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="ml-4">
                    <h3 className="font-semibold text-gray-800">{testimonial.name}</h3>
                    <p className="text-gray-600 text-sm">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-700">{testimonial.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-purple-900">
            {t('home.faqTitle')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {faqImages.map((faq, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="aspect-[4/3] overflow-hidden rounded-lg mb-6">
                  <img
                    src={faq.image}
                    alt={faq.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-bold text-purple-900 mb-4">
                  {faq.title}
                </h3>
                <p className="text-gray-700">
                  {index === 0 && t('home.faq1Text')}
                  {index === 1 && t('home.faq2Text')}
                  {index === 2 && t('home.faq3Text')}
                  {index === 3 && t('home.faq4Text')}
                  {index === 4 && t('home.faq5Text')}
                  {index === 5 && t('home.faq6Text')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default HomePage;