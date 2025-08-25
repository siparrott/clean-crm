import React, { ReactNode } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import Header from './Header';
import Footer from './Footer';
import PartnerLogos from './PartnerLogos';
import GoogleReviews from './GoogleReviews';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col min-h-screen" style={{ position: 'static', overflow: 'visible' }}>
      <Header />
      <main className="flex-grow" style={{ position: 'static', overflow: 'visible' }}>
        {children}
      </main>
      <GoogleReviews />
      <PartnerLogos />
      <Footer />
    </div>
  );
};

export default Layout;