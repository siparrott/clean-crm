import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const Header: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'de' : 'en');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/', label: t('nav.home') },
    { path: '/fotoshootings', label: t('nav.photoshoots') },
    { path: '/vouchers', label: t('nav.vouchers') },
    { path: '/blog', label: t('nav.blog') },
    { path: '/warteliste', label: t('nav.waitlist') },
    { path: '/kontakt', label: t('nav.contact') },
  ];

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <img 
            src="/frontend-logo.jpg" 
            alt="New Age Fotografie"
            className="h-24 w-auto"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-gray-700 hover:text-purple-600 transition-colors ${
                isActive(item.path) ? 'text-purple-600 font-semibold' : ''
              }`}
            >
              {item.label}
            </Link>
          ))}

          <button
            onClick={toggleLanguage}
            className="text-gray-700 hover:text-purple-600 transition-colors flex items-center"
            aria-label="Toggle language"
          >
            <Globe size={18} className="mr-1" />
            <span className="uppercase">{language}</span>
          </button>
          

        </nav>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-gray-700 focus:outline-none" 
          onClick={toggleMenu}
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white shadow-lg">
          <div className="container mx-auto px-4 py-2 flex flex-col">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`py-2 text-gray-700 hover:text-purple-600 transition-colors ${
                  isActive(item.path) ? 'text-purple-600 font-semibold' : ''
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            <button
              onClick={() => {
                toggleLanguage();
                setMenuOpen(false);
              }}
              className="py-2 text-left text-gray-700 hover:text-purple-600 transition-colors flex items-center"
            >
              <Globe size={18} className="mr-1" />
              <span className="uppercase">{language}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;