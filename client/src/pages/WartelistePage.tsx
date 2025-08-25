import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { Calendar, Mail, Phone, User } from 'lucide-react';
import { submitWaitlistForm } from '../lib/forms';

const WartelistePage: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    preferredDate: '',
    email: '',
    phone: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // SEO Meta Tags
    document.title = 'Termin anfragen - Fotoshooting Wien buchen | New Age Fotografie';
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Fotoshooting-Termin in Wien anfragen. Verfügbare Termine an Wochenenden für Familien-, Schwangerschafts- und Neugeborenen-Fotografie.');

    return () => {
      document.title = 'New Age Fotografie - Familienfotograf Wien';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await submitWaitlistForm(formData);
      setSuccess(true);
      setFormData({ fullName: '', preferredDate: '', email: '', phone: '', message: '' });
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
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-purple-600 mb-4">
            Fotoshooting Termin in Wien anfragen
          </h1>
          <p className="text-xl text-gray-600">
            Professioneller <strong>Familienfotograf in Wien</strong> mit flexiblen Terminen.
            <br />
            Wir bieten Fotoshootings an Wochenenden - kontaktieren Sie uns für die Verfügbarkeit.
          </p>
        </div>

        <div className="max-w-xl mx-auto bg-white rounded-lg shadow-lg p-8">
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
              Ihre Anfrage wurde erfolgreich gesendet. Wir werden uns in Kürze bei Ihnen melden.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2 flex items-center">
                <User size={18} className="mr-2 text-purple-600" />
                Vollname <span className="text-purple-600 ml-1">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-colors"
                placeholder="Ihr vollständiger Name"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2 flex items-center">
                <Calendar size={18} className="mr-2 text-purple-600" />
                Bevorzugtes Datum für Ihr Shooting <span className="text-purple-600 ml-1">*</span>
              </label>
              <input
                type="date"
                name="preferredDate"
                value={formData.preferredDate}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2 flex items-center">
                <Mail size={18} className="mr-2 text-purple-600" />
                Email Adresse <span className="text-purple-600 ml-1">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-colors"
                placeholder="ihre@email.com"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2 flex items-center">
                <Phone size={18} className="mr-2 text-purple-600" />
                WhatsApp / Telefonnummer <span className="text-purple-600 ml-1">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-colors"
                placeholder="+43 "
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Ihre Nachricht
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-colors"
                placeholder="Weitere Details zu Ihrem Shooting..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Wird gesendet...' : 'Termin anfragen'}
            </button>

            <p className="text-sm text-gray-500 text-center">
              <span className="text-purple-600">*</span> Pflichtfelder
            </p>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default WartelistePage;