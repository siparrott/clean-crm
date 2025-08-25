import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, User, LogIn, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { submitNewsletterForm } from '../../lib/forms';

const Footer: React.FC = () => {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await submitNewsletterForm(email.trim());
      // console.log removed
      
      if (result.success) {
        setSubscribed(true);
        setEmail('');
        // Reset after 5 seconds to allow new signups
        setTimeout(() => setSubscribed(false), 5000);
      } else {
        throw new Error(result.message || 'Signup failed');
      }
    } catch (err) {
      // console.error removed
      const errorMessage = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-gray-800 text-white mt-12">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">          <div className="md:col-span-2">
            <Link to="/" className="text-white text-xl font-bold mb-4 block">
              New Age Fotografie
            </Link>
            <p className="text-gray-300 mb-4">
              Professional photography and CRM solutions for modern businesses.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <Twitter size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/fotoshootings" className="text-gray-300 hover:text-white transition-colors">
                  Fotoshootings
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Kontakt</h3>
            <ul className="space-y-2 text-gray-300">
              <li>
                <span className="text-sm">Büro- und Korrespondenzadresse:</span>
              </li>
              <li>
                <span className="text-sm">Julius Tandler Platz 5 / 13</span>
              </li>
              <li>
                <span className="text-sm">1090 Wien, Austria</span>
              </li>
              <li>
                <span className="text-sm">Tel/WhatsApp: +43 677 633 99210</span>
              </li>
              <li>
                <Link to="/kontakt" className="text-purple-400 hover:text-purple-300 transition-colors text-sm">
                  Vollständige Kontaktdaten
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Kategorien</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/fotoshootings?category=Familie" className="text-gray-300 hover:text-white transition-colors">
                  Familie
                </Link>
              </li>
              <li>
                <Link to="/fotoshootings?category=Baby" className="text-gray-300 hover:text-white transition-colors">
                  Baby
                </Link>
              </li>
              <li>
                <Link to="/fotoshootings?category=Hochzeit" className="text-gray-300 hover:text-white transition-colors">
                  Hochzeit
                </Link>
              </li>
              <li>
                <Link to="/fotoshootings?category=Business" className="text-gray-300 hover:text-white transition-colors">
                  Business
                </Link>
              </li>
              <li>
                <Link to="/fotoshootings?category=Event" className="text-gray-300 hover:text-white transition-colors">
                  Event
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Galerie</h3>
            <ul className="space-y-2">
              {user ? (
                <>
                  <li>
                    <Link to="/gallery" className="text-gray-300 hover:text-white transition-colors flex items-center">
                      <User size={18} className="mr-2" />
                      {t('nav.gallery')}
                    </Link>
                  </li>
                  <li>
                    <button 
                      onClick={() => signOut()}
                      className="text-gray-300 hover:text-white transition-colors flex items-center"
                    >
                      <LogIn size={18} className="mr-2" />
                      {t('nav.logout')}
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <Link 
                    to="/gallery"
                    className="text-gray-300 hover:text-white transition-colors flex items-center"
                  >
                    <User size={18} className="mr-2" />
                    {t('nav.login')}
                  </Link>
                </li>
              )}
              <li>
                <Link 
                  to="/admin/login"
                  className="text-gray-300 hover:text-white transition-colors flex items-center"
                >
                  <User size={18} className="mr-2" />
                  Admin Login
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-5 mt-8">
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">{t('newsletter.signup')}</h3>
              {subscribed ? (
                <div className="text-green-400 flex items-center">
                  <Mail className="mr-2" />
                  {t('newsletter.thanks')}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex gap-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('newsletter.placeholder')}
                    required
                    className="flex-1 px-4 py-2 rounded-lg bg-gray-600 text-white placeholder-gray-400 border border-gray-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className={`px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity ${
                      loading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading ? 'Wird gesendet...' : t('newsletter.button')}
                  </button>
                </form>
              )}              {error && (
                <p className="mt-2 text-red-400 text-sm">{error}</p>
              )}
            </div>
          </div>
        </div>        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
          <p>&copy; 2025 New Age Fotografie. All Rights Reserved</p>
          <p className="mt-2 text-sm">
            <a 
              href="https://www.togninja.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              Powered By TogNinja
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;