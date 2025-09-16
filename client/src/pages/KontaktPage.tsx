import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { Mail, Phone, Clock, MapPin, Train, Car, MessageCircle } from 'lucide-react';
import { submitContactForm } from '../lib/forms';
import { useLanguage } from '../context/LanguageContext';

const KontaktPage: React.FC = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // SEO Meta Tags
    document.title = 'Kontakt - Familienfotograf Wien | New Age Fotografie';
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Kontaktieren Sie unseren Familienfotograf in Wien. STUDIO Eingang Ecke Schönbrunnerstraße, Studio: Wehrgasse 11A/2+5, 1050 Wien. Tel: +43 677 633 99210. Öffnungszeiten Fr-So 09:00-17:00.');

    // Open Graph tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', 'Kontakt - Familienfotograf Wien | New Age Fotografie');

    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogDescription) {
      ogDescription = document.createElement('meta');
      ogDescription.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescription);
    }
    ogDescription.setAttribute('content', 'Kontaktieren Sie unseren Familienfotograf in Wien. STUDIO Eingang Ecke Schönbrunnerstraße, Studio: Wehrgasse 11A/2+5, 1050 Wien. Tel: +43 677 633 99210.');

    return () => {
      document.title = 'New Age Fotografie - Familienfotograf Wien';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await submitContactForm(formData);
      setSuccess(true);
      setFormData({ fullName: '', email: '', phone: '', message: '' });
    } catch (err) {
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Layout>
      {/* Hero Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">{t('contact.title')}</h1>
            <p className="mt-4 text-xl text-gray-600">{t('contact.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-gray-900">{t('contact.studioTitle')}</h2>
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Mail className="w-6 h-6 text-gray-600" />
                <span className="text-gray-700">hallo@newagefotografie.com</span>
              </div>
              <div className="flex items-center space-x-4">
                <Phone className="w-6 h-6 text-gray-600" />
                <div className="flex flex-col space-y-2">
                  <span className="text-gray-700">+43 677 633 99210</span>
                  <div className="flex space-x-3">
                    <a 
                      href="tel:+43677633992210"
                      className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      {t('contact.call')}
                    </a>
                    <a 
                      href="https://wa.me/43677633992210"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Clock className="w-6 h-6 text-gray-600" />
                <span className="text-gray-700">{t('contact.openingHours')}</span>
              </div>
              <div className="flex items-center space-x-4">
                <MapPin className="w-6 h-6 text-gray-600" />
                <div className="text-gray-700">
                  <div>{t('contact.studioAddress')}</div>
                  <div className="text-sm text-gray-600 mt-1">{t('contact.addressNote')}</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">{t('contact.transport')}</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Train className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">{t('contact.trainInfo')}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Car className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">{t('contact.streetParking')}</span>
                </div>
              </div>
            </div>

            {/* Google Maps Embed */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('contact.mapTitle')}</h3>
              <div className="rounded-lg overflow-hidden shadow-sm border">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2659.8!2d16.3608!3d48.1865!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x476d0774b3d4e1ab%3A0x123456789abcdef0!2sWehrgasse%2011A%2C%201050%20Wien%2C%20Austria!5e0!3m2!1sen!2sat!4v1625075400000!5m2!1sen!2sat"
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="New Age Fotografie Studio Location - Wehrgasse 11A/2+5, 1050 Wien"
                />
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">{t('contact.contactForm')}</h2>
            {success ? (
              <div className="bg-green-50 p-4 rounded-md">
                <p className="text-green-800">{t('contact.successMessage')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">{t('contact.fullName')}</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">{t('contact.email')}</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">{t('contact.phone')}</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">{t('contact.message')}</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                {error && (
                  <div className="bg-red-50 p-4 rounded-md">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? t('contact.submitting') : t('contact.submit')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default KontaktPage;